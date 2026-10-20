"""
Smart MSRTC - VisionX
Geofence Arrival Detection & Mobile GPS Ingestion Service
Computes geodesic distances, enforces accuracy thresholds, rejects stale coordinates,
requires multi-sample consecutive confirmation, and applies cooldown hysteresis.
"""

import math
import json
from datetime import datetime, timezone, timedelta
from backend.database import get_db_connection
from backend.event_service import process_arrival_event

def haversine_distance_meters(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def process_mobile_gps_update(conn, payload):
    """
    Ingests a PHONE_GPS location update from the mobile driver browser.
    Validates association, checks freshness, evaluates geofence rules,
    tracks multi-sample confirmations, and fires arrival when rules pass.
    """
    cursor = conn.cursor()
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    bus_id = payload.get('bus_id')
    trip_id = payload.get('trip_id')
    lat = payload.get('latitude')
    lng = payload.get('longitude')
    accuracy = payload.get('accuracy_meters', 999.0)
    speed = payload.get('speed_kmh', 0.0)
    heading = payload.get('heading', 0.0)
    sample_time_str = payload.get('timestamp') or now_iso
    source = payload.get('source', 'PHONE_GPS')

    # 1. Coordinate Validity
    if lat is None or lng is None:
        return {'success': False, 'error': 'INVALID_COORDINATES', 'message': 'Missing latitude/longitude'}
    try:
        lat = float(lat)
        lng = float(lng)
        accuracy = float(accuracy)
    except (ValueError, TypeError):
        return {'success': False, 'error': 'MALFORMED_COORDINATES', 'message': 'Coordinates must be valid numbers'}

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        return {'success': False, 'error': 'COORDINATES_OUT_OF_BOUNDS', 'message': 'Latitude must be in [-90,90] and longitude in [-180,180]'}

    # 2. Association Verification (match by id or bus_number like MH-28-BL-4521)
    cursor.execute("""
    SELECT * FROM buses 
    WHERE (id = ? OR bus_number = ? OR REPLACE(bus_number, '-', '') = REPLACE(?, '-', ''))
      AND is_active = 1;
    """, (bus_id, bus_id, bus_id))
    bus = cursor.fetchone()
    if not bus:
        return {'success': False, 'error': 'BUS_NOT_FOUND', 'message': f"Bus {bus_id} is not registered or active."}

    # Canonicalize bus_id to database primary key
    bus_id = bus['id']

    if not trip_id:
        # Resolve active trip
        cursor.execute("""
        SELECT * FROM trips
        WHERE bus_id = ? AND status IN ('SCHEDULED', 'APPROACHING', 'EN_ROUTE', 'AT_PLATFORM')
        ORDER BY scheduled_arrival ASC LIMIT 1;
        """, (bus_id,))
        trip_row = cursor.fetchone()
        if trip_row:
            trip_id = trip_row['id']
            trip = trip_row
        else:
            return {'success': False, 'error': 'NO_ACTIVE_TRIP', 'message': f"No active trip scheduled for bus {bus['bus_number']}."}
    else:
        cursor.execute("SELECT * FROM trips WHERE id = ? AND bus_id = ?;", (trip_id, bus_id))
        trip = cursor.fetchone()
        if not trip:
            return {'success': False, 'error': 'INVALID_TRIP_ASSOCIATION', 'message': f"Trip {trip_id} is not linked to bus {bus_id}."}

    # 3. Read Geofence & GPS Threshold Settings
    cursor.execute("SELECT key, value FROM system_settings WHERE key IN ('station_lat', 'station_lng', 'geofence_arrival_radius_meters', 'gps_accuracy_threshold_meters', 'geofence_required_consecutive_samples', 'geofence_cooldown_minutes', 'gps_stale_threshold_seconds');")
    settings = {row['key']: row['value'] for row in cursor.fetchall()}

    station_lat = float(settings.get('station_lat', '20.8871'))
    station_lng = float(settings.get('station_lng', '76.2014'))
    radius_meters = float(settings.get('geofence_arrival_radius_meters', '1200'))
    accuracy_threshold = float(settings.get('gps_accuracy_threshold_meters', '50'))
    required_samples = int(settings.get('geofence_required_consecutive_samples', '2'))
    cooldown_minutes = int(settings.get('geofence_cooldown_minutes', '15'))
    stale_threshold_seconds = int(settings.get('gps_stale_threshold_seconds', '60'))

    # 4. Check Stale Data
    try:
        sample_dt = datetime.fromisoformat(sample_time_str.replace('Z', '+00:00'))
        age_seconds = (now_utc - sample_dt).total_seconds()
        if age_seconds > stale_threshold_seconds:
            return {
                'success': False,
                'rejected': True,
                'reason': 'STALE_GPS_SAMPLE',
                'message': f"Sample rejected: coordinate capture age ({int(age_seconds)}s) exceeds max freshness threshold ({stale_threshold_seconds}s).",
                'age_seconds': age_seconds
            }
    except Exception:
        pass  # If timestamp parsing fails, continue with current time

    # Always persist latest verified position in location_records and buses
    cursor.execute("""
    UPDATE buses
    SET live_lat = ?, live_lng = ?, speed_kmh = ?, heading = ?, last_seen = ?, source = ?
    WHERE id = ?;
    """, (lat, lng, speed, heading, now_iso, source, bus_id))

    cursor.execute("""
    INSERT INTO location_records (bus_id, trip_id, latitude, longitude, speed_kmh, heading, accuracy_meters, source, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (bus_id, trip_id, lat, lng, speed, heading, accuracy, source, now_iso))

    # 5. Geofence Distance Calculation
    distance_meters = haversine_distance_meters(lat, lng, station_lat, station_lng)

    # 6. Read or Initialize Geofence Session
    cursor.execute("SELECT * FROM geofence_tracking_sessions WHERE trip_id = ?;", (trip_id,))
    session = cursor.fetchone()

    consecutive_samples = session['consecutive_samples'] if session and 'consecutive_samples' in session.keys() else (session['consecutive_inside_samples'] if session else 0)
    cooldown_until_str = session['cooldown_until'] if session else None
    current_session_status = session['status'] if session else 'OUTSIDE'

    # Check Cooldown
    in_cooldown = False
    if cooldown_until_str:
        try:
            cooldown_dt = datetime.fromisoformat(cooldown_until_str)
            if now_utc < cooldown_dt:
                in_cooldown = True
        except Exception:
            pass

    # 7. Evaluate Geofence Entry Logic
    event_result = None
    diagnostic_reason = ""
    new_status = current_session_status
    arrival_triggered = False

    is_accurate = accuracy <= accuracy_threshold
    is_inside_radius = distance_meters <= radius_meters

    if in_cooldown:
        diagnostic_reason = f"Inside or near geofence ({int(distance_meters)}m). Cooldown active until {cooldown_until_str[11:19]} UTC to prevent flutter."
        new_status = 'COOLDOWN'

    elif not is_accurate:
        diagnostic_reason = f"Sample accuracy ({accuracy:.1f}m) exceeds acceptable threshold ({accuracy_threshold:.0f}m). Location saved, geofence confirmation halted."
        # Reset counter on inaccurate data
        consecutive_samples = 0
        new_status = 'LOW_ACCURACY'

    elif not is_inside_radius:
        consecutive_samples = 0
        diagnostic_reason = f"Outside station geofence: {distance_meters/1000.0:.2f} km from Malkapur Bus Stand (threshold: {radius_meters/1000.0:.2f} km)."
        new_status = 'OUTSIDE'
        if trip['status'] == 'SCHEDULED':
            cursor.execute("UPDATE trips SET status = 'APPROACHING', last_updated = ? WHERE id = ?;", (now_iso, trip_id))

    else:
        # Inside geofence and accurate!
        consecutive_samples += 1

        if consecutive_samples < required_samples:
            # Candidate stage
            new_status = 'ARRIVAL_CANDIDATE'
            diagnostic_reason = f"Inside geofence ({int(distance_meters)}m). Valid sample {consecutive_samples}/{required_samples}. Candidate recorded; awaiting {required_samples - consecutive_samples} more confirmation sample(s)."

            # Record ARRIVAL_CANDIDATE event
            event_result = process_arrival_event(conn, {
                'event_type': 'ARRIVAL_CANDIDATE',
                'bus_id': bus_id,
                'trip_id': trip_id,
                'latitude': lat,
                'longitude': lng,
                'speed_kmh': speed,
                'accuracy_meters': accuracy,
                'source': source,
                'idempotency_key': f"CANDIDATE-{trip_id}-{consecutive_samples}-{now_iso[:16]}"
            })
        else:
            # Confirmation threshold achieved! Confirm arrival!
            new_status = 'CONFIRMED_ARRIVED'
            diagnostic_reason = f"Geofence entry confirmed! {consecutive_samples} consecutive samples inside {radius_meters:.0f}m radius with ±{accuracy:.1f}m accuracy."
            arrival_triggered = True

            cooldown_time = (now_utc + timedelta(minutes=cooldown_minutes)).isoformat()

            # Execute canonical arrival through platform allocation engine
            event_result = process_arrival_event(conn, {
                'event_type': 'BUS_ARRIVED',
                'bus_id': bus_id,
                'trip_id': trip_id,
                'latitude': lat,
                'longitude': lng,
                'speed_kmh': speed,
                'accuracy_meters': accuracy,
                'source': source,
                'idempotency_key': f"ARRIVED-{trip_id}-{now_iso[:10]}"
            })

            cursor.execute("""
            UPDATE geofence_tracking_sessions
            SET arrival_confirmed_at = ?, cooldown_until = ?
            WHERE trip_id = ?;
            """, (now_iso, cooldown_time, trip_id))

    # Update or Insert tracking session
    cursor.execute("""
    INSERT INTO geofence_tracking_sessions (
        trip_id, bus_id, consecutive_inside_samples, last_sample_lat, last_sample_lng,
        last_sample_accuracy, last_sample_time, distance_to_station_meters, status,
        last_diagnostic, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(trip_id) DO UPDATE SET
        consecutive_inside_samples = excluded.consecutive_inside_samples,
        last_sample_lat = excluded.last_sample_lat,
        last_sample_lng = excluded.last_sample_lng,
        last_sample_accuracy = excluded.last_sample_accuracy,
        last_sample_time = excluded.last_sample_time,
        distance_to_station_meters = excluded.distance_to_station_meters,
        status = excluded.status,
        last_diagnostic = excluded.last_diagnostic,
        updated_at = excluded.updated_at;
    """, (
        trip_id, bus_id, consecutive_samples, lat, lng,
        accuracy, now_iso, distance_meters, new_status,
        diagnostic_reason, now_iso
    ))

    conn.commit()

    return {
        'success': True,
        'bus_id': bus_id,
        'bus_number': bus['bus_number'],
        'trip_id': trip_id,
        'trip_number': trip['trip_number'],
        'distance_to_station_meters': round(distance_meters, 1),
        'geofence_radius_meters': radius_meters,
        'is_inside_geofence': is_inside_radius,
        'accuracy_meters': accuracy,
        'accuracy_acceptable': is_accurate,
        'consecutive_samples': consecutive_samples,
        'required_samples': required_samples,
        'geofence_status': new_status,
        'arrival_confirmed': arrival_triggered,
        'diagnostic_reason': diagnostic_reason,
        'event_result': event_result,
        'timestamp': now_iso
    }
