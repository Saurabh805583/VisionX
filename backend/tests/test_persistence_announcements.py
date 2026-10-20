"""
Unit Tests for Smart MSRTC Data Persistence & Announcement Eligibility
Tests persistence across database connections, audit trail logging, and announcement generation.
"""

import unittest
import os
import tempfile
from backend.database import init_db, get_db_connection
from backend.event_service import process_arrival_event

class TestPersistenceAnnouncements(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path, force_reseed=True)
        self.conn = get_db_connection(self.temp_db_path)

    def tearDown(self):
        self.conn.close()
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_announcement_generation_and_persistence(self):
        """Arrival event generates Marathi announcement in database and persists across new connections."""
        payload = {
            'event_type': 'BUS_ARRIVED',
            'trip_id': 'TRIP-902',
            'bus_id': 'BUS-102',
            'source': 'SIMULATED',
            'idempotency_key': 'KEY-ANN-TEST-01'
        }
        res = process_arrival_event(self.conn, payload)
        self.assertTrue(res['success'])
        self.assertTrue(res['announcement_created'])
        ann_id = res['announcement_id']

        # Close current connection and open fresh connection to verify disk persistence
        self.conn.close()
        new_conn = get_db_connection(self.temp_db_path)
        cursor = new_conn.cursor()

        cursor.execute("SELECT * FROM announcements WHERE id = ?;", (ann_id,))
        ann = cursor.fetchone()
        self.assertIsNotNone(ann)
        self.assertEqual(ann['trip_id'], 'TRIP-902')
        self.assertIn('Nagpur', ann['announcement_text'])
        self.assertEqual(ann['status'], 'QUEUED')
        self.assertEqual(ann['language'], 'mr-IN')

        # Check audit trail record
        cursor.execute("SELECT * FROM audit_logs WHERE action = 'PLATFORM_ASSIGNMENT';")
        audit_log = cursor.fetchone()
        self.assertIsNotNone(audit_log)

        new_conn.close()

if __name__ == '__main__':
    unittest.main()
