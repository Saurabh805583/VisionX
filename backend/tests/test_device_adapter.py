"""
Unit Tests for Smart MSRTC IoT Device Integration Adapter
Tests token authentication, unauthorized access rejection, and canonical event mapping.
"""

import unittest
import os
import tempfile
from backend.database import init_db, get_db_connection
from backend.device_service import ingest_device_event

class TestDeviceAdapter(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path, force_reseed=True)
        self.conn = get_db_connection(self.temp_db_path)

    def tearDown(self):
        self.conn.close()
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_unauthorized_device_rejected(self):
        """Device ingestion with invalid or missing token must be rejected."""
        res = ingest_device_event(
            self.conn,
            device_code='RFID-GATE-MKR-01',
            auth_token='INVALID-SECRET-TOKEN',
            payload={'gate_direction': 'IN', 'bus_id': 'BUS-101'}
        )
        self.assertFalse(res['success'])
        self.assertEqual(res['error'], 'AUTHENTICATION_FAILED')

    def test_authenticated_rfid_device_ingestion(self):
        """Valid RFID scanner event maps to canonical arrival event and updates device heartbeat."""
        res = ingest_device_event(
            self.conn,
            device_code='RFID-GATE-MKR-01',
            auth_token='TOKEN-SEC-RFID-9901', # Valid seeded token
            payload={'gate_direction': 'IN', 'bus_id': 'BUS-101', 'trip_id': 'TRIP-901'}
        )
        self.assertTrue(res['success'])
        self.assertTrue(res['authenticated'])
        self.assertEqual(res['device_type'], 'RFID_GATE_READER')
        self.assertTrue(res['canonical_result']['success'])

        # Check device heartbeat updated in database
        cursor = self.conn.cursor()
        cursor.execute("SELECT status, last_heartbeat FROM iot_devices WHERE device_code = 'RFID-GATE-MKR-01';")
        dev = cursor.fetchone()
        self.assertEqual(dev['status'], 'ONLINE')
        self.assertIsNotNone(dev['last_heartbeat'])

if __name__ == '__main__':
    unittest.main()
