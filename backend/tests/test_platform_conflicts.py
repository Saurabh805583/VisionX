"""
Unit Tests for Smart MSRTC Platform Conflicts & Staff Intervention
Tests full platform bottleneck scenario, alert generation, and manual staff override.
"""

import unittest
import os
import tempfile
from backend.database import init_db, get_db_connection
from backend.platform_engine import evaluate_platform_allocation, apply_platform_assignment
from backend.event_service import process_arrival_event

class TestPlatformConflicts(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path, force_reseed=True)
        self.conn = get_db_connection(self.temp_db_path)

    def tearDown(self):
        self.conn.close()
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_all_platforms_occupied_triggers_conflict_alert(self):
        """When all 4 platforms are occupied, rule engine detects conflict and event service creates alert."""
        cursor = self.conn.cursor()
        # Mark all platforms occupied
        cursor.execute("UPDATE platforms SET status = 'OCCUPIED', assigned_trip_id = 'DUMMY-TRIP';")
        self.conn.commit()

        # Try to allocate for TRIP-901
        res = evaluate_platform_allocation(self.conn, 'TRIP-901')
        self.assertFalse(res['success'])
        self.assertTrue(res['conflict_detected'])
        self.assertEqual(res['conflict_details']['type'], 'PLATFORM_CONGESTION_CONFLICT')

        # Run via process_arrival_event
        arrival_payload = {
            'event_type': 'BUS_ARRIVED',
            'trip_id': 'TRIP-901',
            'bus_id': 'BUS-101',
            'source': 'SIMULATED',
            'idempotency_key': 'KEY-CONFLICT-CHECK-01'
        }
        proc_res = process_arrival_event(self.conn, arrival_payload)
        self.assertTrue(proc_res['success'])
        self.assertTrue(proc_res['conflict_created'])

        # Verify alert table has active alert
        cursor.execute("SELECT * FROM alerts WHERE trip_id = 'TRIP-901' AND is_resolved = 0;")
        alert = cursor.fetchone()
        self.assertIsNotNone(alert)
        self.assertEqual(alert['alert_type'], 'PLATFORM_CONGESTION_CONFLICT')

    def test_staff_manual_override_resolves_conflict(self):
        """Staff supervisor can manually override platform allocation and resolve active alert."""
        cursor = self.conn.cursor()
        # Seed an unresolved conflict
        cursor.execute("""
        INSERT INTO alerts (id, alert_type, severity, title, description, trip_id, is_resolved, created_at)
        VALUES ('ALT-TEST-99', 'PLATFORM_CONGESTION_CONFLICT', 'HIGH', 'Test Bottleneck', 'All platforms full', 'TRIP-901', 0, '2026-10-11T12:00:00');
        """)
        self.conn.commit()

        # Staff performs manual override to Platform 1
        assign_id = apply_platform_assignment(
            self.conn,
            trip_id='TRIP-901',
            platform_id=1,
            mode='MANUAL_OVERRIDE',
            reason='Supervisor emergency clearance of Platform 1 bay',
            assigned_by='STAFF_ID_S_INGLE'
        )

        self.assertTrue(assign_id.startswith('ASSIGN-'))

        # Check alert is now resolved
        cursor.execute("SELECT is_resolved, resolved_by FROM alerts WHERE id = 'ALT-TEST-99';")
        resolved_alert = cursor.fetchone()
        self.assertEqual(resolved_alert['is_resolved'], 1)
        self.assertEqual(resolved_alert['resolved_by'], 'STAFF_ID_S_INGLE')

if __name__ == '__main__':
    unittest.main()
