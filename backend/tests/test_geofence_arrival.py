"""
Unit Tests for Smart MSRTC Geofence Arrival Detection & Mobile GPS
Tests accuracy thresholding, stale sample rejection, multi-sample confirmation,
and geofence cooldown hysteresis.
"""

import unittest
import os
import tempfile
from datetime import datetime, timezone, timedelta
from backend.database import init_db, get_db_connection
from backend.geofence_service import process_mobile_gps_update, haversine_distance_meters

class TestGeofenceArrival(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path, force_reseed=True)
        self.conn = get_db_connection(self.temp_db_path)

    def tearDown(self):
        self.conn.close()
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_haversine_distance_calculation(self):
        """Distance between Malkapur Bus Stand (20.8871, 76.2014) and nearby point should be calculated accurately."""
        dist = haversine_distance_meters(20.8871, 76.2014, 20.8871, 76.2014)
        self.assertAlmostEqual(dist, 0.0, places=1)

        # ~1km away
        dist_1km = haversine_distance_meters(20.8871, 76.2014, 20.8961, 76.2014)
        self.assertGreater(dist_1km, 900)
        self.assertLess(dist_1km, 1100)

    def test_reject_stale_gps_sample(self):
        """GPS sample with timestamp older than stale threshold (60s) must be rejected."""
        stale_time = (datetime.now(timezone.utc) - timedelta(seconds=120)).isoformat()
        payload = {
            'bus_id': 'BUS-101',
            'trip_id': 'TRIP-901',
            'latitude': 20.8871,
            'longitude': 76.2014,
            'accuracy_meters': 10.0,
            'timestamp': stale_time,
            'source': 'PHONE_GPS'
        }
        res = process_mobile_gps_update(self.conn, payload)
        self.assertFalse(res['success'])
        self.assertTrue(res.get('rejected'))
        self.assertEqual(res['reason'], 'STALE_GPS_SAMPLE')

    def test_low_accuracy_gps_does_not_trigger_arrival(self):
        """Sample inside geofence but with bad accuracy (>50m) must not confirm arrival."""
        payload = {
            'bus_id': 'BUS-101',
            'trip_id': 'TRIP-901',
            'latitude': 20.8871,
            'longitude': 76.2014,
            'accuracy_meters': 120.0, # Bad accuracy
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'PHONE_GPS'
        }
        res = process_mobile_gps_update(self.conn, payload)
        self.assertTrue(res['success'])
        self.assertFalse(res['accuracy_acceptable'])
        self.assertFalse(res['arrival_confirmed'])
        self.assertEqual(res['geofence_status'], 'LOW_ACCURACY')

    def test_multi_sample_confirmation_candidate_then_confirmed(self):
        """First valid sample inside geofence must yield ARRIVAL_CANDIDATE; second sample confirms arrival."""
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            'bus_id': 'BUS-101',
            'trip_id': 'TRIP-901',
            'latitude': 20.8875,
            'longitude': 76.2018,
            'accuracy_meters': 8.0,
            'timestamp': now_iso,
            'source': 'PHONE_GPS'
        }

        # Sample 1: Should be candidate
        res1 = process_mobile_gps_update(self.conn, payload)
        self.assertTrue(res1['success'])
        self.assertEqual(res1['consecutive_samples'], 1)
        self.assertEqual(res1['geofence_status'], 'ARRIVAL_CANDIDATE')
        self.assertFalse(res1['arrival_confirmed'])

        # Check trip is NOT yet docked at platform
        cursor = self.conn.cursor()
        cursor.execute("SELECT status, current_platform_id FROM trips WHERE id = 'TRIP-901';")
        trip1 = cursor.fetchone()
        self.assertNotEqual(trip1['status'], 'AT_PLATFORM')

        # Sample 2: Consecutive sample inside geofence -> triggers confirmed arrival!
        res2 = process_mobile_gps_update(self.conn, payload)
        self.assertTrue(res2['success'])
        self.assertEqual(res2['consecutive_samples'], 2)
        self.assertEqual(res2['geofence_status'], 'CONFIRMED_ARRIVED')
        self.assertTrue(res2['arrival_confirmed'])

        # Now trip must be AT_PLATFORM with assigned platform!
        cursor.execute("SELECT status, current_platform_id FROM trips WHERE id = 'TRIP-901';")
        trip2 = cursor.fetchone()
        self.assertEqual(trip2['status'], 'AT_PLATFORM')
        self.assertIsNotNone(trip2['current_platform_id'])

    def test_geofence_cooldown_prevents_duplicate_arrival(self):
        """Once confirmed arrived, subsequent samples within cooldown window do not re-trigger arrival or duplicate announcements."""
        now_iso = datetime.now(timezone.utc).isoformat()
        payload = {
            'bus_id': 'BUS-101',
            'trip_id': 'TRIP-901',
            'latitude': 20.8872,
            'longitude': 76.2015,
            'accuracy_meters': 10.0,
            'timestamp': now_iso,
            'source': 'PHONE_GPS'
        }

        # Sample 1 & 2 to confirm arrival
        process_mobile_gps_update(self.conn, payload)
        res2 = process_mobile_gps_update(self.conn, payload)
        self.assertTrue(res2['arrival_confirmed'])

        # Count announcements
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM announcements WHERE trip_id = 'TRIP-901';")
        count_after_arrival = cursor.fetchone()['c']

        # Sample 3 immediately after: should be in cooldown
        res3 = process_mobile_gps_update(self.conn, payload)
        self.assertTrue(res3['success'])
        self.assertFalse(res3['arrival_confirmed'])
        self.assertEqual(res3['geofence_status'], 'COOLDOWN')

        # Count announcements must be unchanged
        cursor.execute("SELECT COUNT(*) as c FROM announcements WHERE trip_id = 'TRIP-901';")
        count_after_cooldown = cursor.fetchone()['c']
        self.assertEqual(count_after_cooldown, count_after_arrival)

if __name__ == '__main__':
    unittest.main()
