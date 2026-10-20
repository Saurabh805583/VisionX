"""
Unit Tests for Smart MSRTC Multi-Depot Bus Operations & Allocation
Verifies that buses from multiple regional depots (or unrecorded depots)
can be serviced, scheduled, and allocated platforms at Malkapur without restriction.
"""

import unittest
import os
import tempfile
from backend.database import init_db, get_db_connection
from backend.platform_engine import evaluate_platform_allocation, apply_platform_assignment

class TestMultiDepotOperations(unittest.TestCase):
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
        self.db_path = self.temp_db.name
        self.temp_db.close()
        init_db(self.db_path, force_reseed=True)

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_depots_seeded_correctly(self):
        conn = get_db_connection(self.db_path)
        c = conn.cursor()
        c.execute("SELECT * FROM depots;")
        depots = c.fetchall()
        conn.close()
        # Should have at least the 8 seeded depots
        self.assertGreaterEqual(len(depots), 8)
        depot_codes = [d['depot_code'] for d in depots]
        self.assertIn('MKR-01', depot_codes)
        self.assertIn('AKL-04', depot_codes)
        self.assertIn('BLD-02', depot_codes)
        self.assertIn('NGP-06', depot_codes)

    def test_multi_depot_buses_allocate_platforms_at_malkapur(self):
        """Buses belonging to outside depots (e.g., Nagpur, Akola, Buldhana) allocate platforms correctly at Malkapur."""
        conn = get_db_connection(self.db_path)

        # TRIP-902 is operated by BUS-102 (Nagpur / Akola) for Malkapur - Nagpur trip
        rec = evaluate_platform_allocation(conn, 'TRIP-902')
        self.assertTrue(rec['success'])
        self.assertIsNotNone(rec['recommended_platform_id'])

        # Now test an unrecorded depot bus
        c = conn.cursor()
        c.execute("""
        INSERT INTO buses (id, bus_number, depot, depot_id, bus_type, capacity, current_status, source, is_active)
        VALUES ('BUS-EXTERNAL', 'MH-31-AP-7788', 'Depot not recorded', NULL, 'Ordinary Express', 48, 'APPROACHING', 'SIMULATED', 1);
        """)
        c.execute("""
        INSERT INTO trips (id, trip_number, bus_id, route_id, origin, destination, scheduled_arrival, scheduled_departure, status, delay_minutes, passenger_load, source, last_updated)
        VALUES ('TRIP-EXT-01', 'TR-EXT-1000', 'BUS-EXTERNAL', 'RT-MKR-PUN', 'Malkapur', 'Pune (Swargate)', '14:00', '14:15', 'APPROACHING', 0, 40, 'SIMULATED', '2026-10-11T12:00:00Z');
        """)
        conn.commit()

        ext_rec = evaluate_platform_allocation(conn, 'TRIP-EXT-01')
        self.assertTrue(ext_rec['success'], "Bus from unrecorded/external depot must successfully receive platform recommendation")
        self.assertIsNotNone(ext_rec['recommended_platform_id'])

        conn.close()

    def test_depot_association_update(self):
        """Authorised supervisor can associate a bus with a registered depot."""
        conn = get_db_connection(self.db_path)
        c = conn.cursor()

        # Update BUS-104 to Jalgaon Depot
        c.execute("UPDATE buses SET depot = 'Jalgaon Depot', depot_id = 'DEPOT-JLG' WHERE id = 'BUS-104';")
        conn.commit()

        c.execute("""
        SELECT b.id, b.bus_number, b.depot, b.depot_id, d.name as depot_name, d.division
        FROM buses b
        LEFT JOIN depots d ON b.depot_id = d.id
        WHERE b.id = 'BUS-104';
        """)
        bus = c.fetchone()
        self.assertEqual(bus['depot_id'], 'DEPOT-JLG')
        self.assertEqual(bus['depot_name'], 'Jalgaon Depot')
        self.assertEqual(bus['division'], 'Jalgaon Division')
        conn.close()

if __name__ == '__main__':
    unittest.main()
