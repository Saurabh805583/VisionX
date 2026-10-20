"""
Unit Tests for Smart MSRTC Idempotency & Duplicate Event Guard
Verifies that duplicate arrival events do not produce repeated platform allocations or announcements.
"""

import unittest
import os
import tempfile
from backend.database import init_db, get_db_connection
from backend.event_service import process_arrival_event

class TestDuplicateEvents(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path, force_reseed=True)
        self.conn = get_db_connection(self.temp_db_path)

    def tearDown(self):
        self.conn.close()
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_idempotent_event_guard(self):
        """Identical event with same idempotency_key must be accepted once and ignored on second delivery."""
        payload = {
            'event_type': 'BUS_ARRIVED',
            'trip_id': 'TRIP-901',
            'bus_id': 'BUS-101',
            'source': 'SIMULATED',
            'idempotency_key': 'KEY-IDEMPOTENT-001'
        }

        # First delivery: should process and assign platform
        res1 = process_arrival_event(self.conn, payload)
        self.assertTrue(res1['success'])
        self.assertFalse(res1['duplicate'])
        self.assertTrue(res1['announcement_created'])

        # Count announcements after first event
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM announcements WHERE trip_id = 'TRIP-901';")
        count_first = cursor.fetchone()['c']
        self.assertEqual(count_first, 1)

        # Second delivery with exact same idempotency_key
        res2 = process_arrival_event(self.conn, payload)
        self.assertTrue(res2['success'])
        self.assertTrue(res2['duplicate'])
        self.assertEqual(res2['status'], 'IDEMPOTENT_IGNORED')

        # Check announcements count is still 1
        cursor.execute("SELECT COUNT(*) as c FROM announcements WHERE trip_id = 'TRIP-901';")
        count_second = cursor.fetchone()['c']
        self.assertEqual(count_second, 1)

if __name__ == '__main__':
    unittest.main()
