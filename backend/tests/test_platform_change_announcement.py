"""
Unit Tests for Smart MSRTC Platform Change & Announcement Synchronization
Verifies that approved platform changes generate urgent announcements,
and that failed allocations do not announce unconfirmed platforms.
"""

import unittest
import os
import tempfile
from backend.database import init_db, get_db_connection
from backend.platform_engine import apply_platform_assignment
from backend.event_service import process_arrival_event

class TestPlatformChangeAnnouncement(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path, force_reseed=True)
        self.conn = get_db_connection(self.temp_db_path)

    def tearDown(self):
        self.conn.close()
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_platform_change_creates_urgent_announcement(self):
        """When a docked trip's platform is reassigned to another platform, a PLATFORM_CHANGE announcement is enqueued."""
        # TRIP-903 is docked at Platform 3 in seed data
        cursor = self.conn.cursor()
        cursor.execute("SELECT current_platform_id FROM trips WHERE id = 'TRIP-903';")
        self.assertEqual(cursor.fetchone()['current_platform_id'], 3)

        # Supervisor reassigns TRIP-903 to Platform 1
        apply_platform_assignment(
            self.conn,
            trip_id='TRIP-903',
            platform_id=1,
            mode='MANUAL_OVERRIDE',
            reason='Supervisor emergency reallocation to Express Bay 1',
            assigned_by='STAFF_ID_SM'
        )

        # Verify announcement created with priority URGENT and type PLATFORM_CHANGE
        cursor.execute("""
        SELECT * FROM announcements
        WHERE trip_id = 'TRIP-903' AND announcement_type = 'PLATFORM_CHANGE'
        ORDER BY created_at DESC LIMIT 1;
        """)
        ann = cursor.fetchone()
        self.assertIsNotNone(ann)
        self.assertEqual(ann['priority'], 'URGENT')
        self.assertIn("चा प्लॅटफॉर्म बदलण्यात आला आहे", ann['announcement_text'])
        self.assertIn("नवीन प्लॅटफॉर्म क्रमांक 1 आहे", ann['announcement_text'])

    def test_conflict_does_not_announce_unconfirmed_platform(self):
        """When all platforms are occupied, conflict alert is generated and NO platform announcement is made."""
        cursor = self.conn.cursor()
        # Mark all platforms occupied
        cursor.execute("UPDATE platforms SET status = 'OCCUPIED', assigned_trip_id = 'DUMMY';")
        self.conn.commit()

        # Ingest arrival for TRIP-901
        res = process_arrival_event(self.conn, {
            'event_type': 'BUS_ARRIVED',
            'trip_id': 'TRIP-901',
            'bus_id': 'BUS-101',
            'source': 'PHONE_GPS'
        })
        self.assertTrue(res['success'])
        self.assertTrue(res['conflict_created'])
        self.assertFalse(res['announcement_created'])

        # Check announcements table for TRIP-901: must NOT have any new announcement
        cursor.execute("SELECT COUNT(*) as c FROM announcements WHERE trip_id = 'TRIP-901';")
        self.assertEqual(cursor.fetchone()['c'], 0)

if __name__ == '__main__':
    unittest.main()
