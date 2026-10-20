"""
Unit Tests for Smart MSRTC Platform Allocation Engine
Tests deterministic rules, corridor affinity, and buffer calculation.
"""

import unittest
import sqlite3
import os
import tempfile
from backend.database import init_db, get_db_connection
from backend.platform_engine import evaluate_platform_allocation, apply_platform_assignment

class TestPlatformAllocation(unittest.TestCase):
    def setUp(self):
        # Create an isolated temporary test database
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path, force_reseed=True)
        self.conn = get_db_connection(self.temp_db_path)

    def tearDown(self):
        self.conn.close()
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_pune_express_allocates_to_platform_1(self):
        """Pune express trip should deterministically recommend Platform 1 based on corridor alignment."""
        result = evaluate_platform_allocation(self.conn, 'TRIP-901')
        self.assertTrue(result['success'])
        self.assertEqual(result['recommended_platform_id'], 1)
        self.assertIn("Pune/Nashik corridor", result['recommendation_reason'])

    def test_nagpur_trip_allocates_to_platform_2(self):
        """Nagpur eastbound trip should deterministically recommend Platform 2."""
        result = evaluate_platform_allocation(self.conn, 'TRIP-902')
        self.assertTrue(result['success'])
        self.assertEqual(result['recommended_platform_id'], 2)
        self.assertIn("Nagpur", result['recommendation_reason'])

    def test_occupied_platform_is_skipped(self):
        """Platform 3 is occupied by TRIP-903 in seed data; new allocation should not choose Platform 3."""
        result = evaluate_platform_allocation(self.conn, 'TRIP-904')
        self.assertTrue(result['success'])
        # Since Platform 3 is occupied, it should pick another suitable platform
        self.assertNotEqual(result['recommended_platform_id'], 3)

    def test_platform_assignment_atomic_commit(self):
        """Applying assignment updates platform to OCCUPIED and trip to AT_PLATFORM."""
        assign_id = apply_platform_assignment(self.conn, 'TRIP-901', 1, mode='AUTOMATIC', reason='Unit test test allocation')
        self.assertTrue(assign_id.startswith('ASSIGN-'))

        cursor = self.conn.cursor()
        cursor.execute("SELECT status, assigned_trip_id FROM platforms WHERE id = 1;")
        plat = cursor.fetchone()
        self.assertEqual(plat['status'], 'OCCUPIED')
        self.assertEqual(plat['assigned_trip_id'], 'TRIP-901')

        cursor.execute("SELECT status, current_platform_id FROM trips WHERE id = 'TRIP-901';")
        trip = cursor.fetchone()
        self.assertEqual(trip['status'], 'AT_PLATFORM')
        self.assertEqual(trip['current_platform_id'], 1)

if __name__ == '__main__':
    unittest.main()
