"""
Smart MSRTC - VisionX
IoT Device Adapter & Ingestion Service
Manages future-ready hardware adapters (GPS trackers, ESP32, RFID, BLE, ANPR)
with strict token authentication and canonical event forwarding.
"""

import json
from datetime import datetime, timezone
from backend.database import get_db_connection
from backend.event_service import process_arrival_event

def authenticate_device(conn, device_code, provided_token):
    """Verifies that the device exists, is active, and provided_token matches."""
    if not device_code or not provided_token:
        return None

    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM iot_devices
    WHERE device_code = ? AND is_active = 1;
    """, (device_code,))
    device = cursor.fetchone()

    if not device:
        return None

    if device['auth_token'] != provided_token:
        return None

    return device

def ingest_device_event(conn, device_code, auth_token, payload):
    """
    Ingests an authenticated event from a field IoT device.
    Rejects unauthorized access without exposing internal state.
    """
    device = authenticate_device(conn, device_code, auth_token)
    if not device:
        return {
            'success': False,
            'error': 'AUTHENTICATION_FAILED',
            'message': f"Device '{device_code}' authentication failed or device is inactive."
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = conn.cursor()

    # Update heartbeat
    cursor.execute("""
    UPDATE iot_devices
    SET last_heartbeat = ?, status = 'ONLINE'
    WHERE id = ?;
    """, (now_iso, device['id']))

    device_type = device['device_type']
    raw_event_type = payload.get('event_type')
    bus_id = payload.get('bus_id') or device['assigned_bus_id']
    trip_id = payload.get('trip_id')
    platform_id = payload.get('platform_id') or device['assigned_platform_id']

    # Map device telemetry to canonical event
    canonical_event = {
        'source': 'IOT_DEVICE',
        'device_code': device_code,
        'device_type': device_type,
        'bus_id': bus_id,
        'trip_id': trip_id,
        'platform_id': platform_id,
        'latitude': payload.get('latitude'),
        'longitude': payload.get('longitude'),
        'speed_kmh': payload.get('speed_kmh', 0.0),
        'accuracy_meters': payload.get('accuracy_meters', 2.0),
        'idempotency_key': payload.get('idempotency_key') or f"IOT-{device_code}-{now_iso[:19]}"
    }

    if device_type in ('RFID_GATE_READER', 'ANPR_CAMERA'):
        # Depot gate detection maps to approaching or arrived
        canonical_event['event_type'] = 'BUS_ARRIVED' if payload.get('gate_direction') == 'IN' else 'BUS_DEPARTED'
    elif device_type == 'BLE_BEACON':
        # Micro-proximity platform detection
        canonical_event['event_type'] = 'DOCK_AT_PLATFORM'
        canonical_event['requested_platform_id'] = platform_id
    else:
        # Default or GPS Tracker
        canonical_event['event_type'] = raw_event_type or 'BUS_APPROACHING'

    # Route through shared event service
    res = process_arrival_event(conn, canonical_event)

    # Log device audit
    cursor.execute("""
    INSERT INTO audit_logs (action, entity_type, entity_id, actor, details_json, created_at)
    VALUES ('IOT_DEVICE_EVENT', 'DEVICE', ?, ?, ?, ?);
    """, (device_code, f"DEV_{device_type}", json.dumps({
        'device_name': device['name'],
        'canonical_event_type': canonical_event['event_type'],
        'bus_id': bus_id,
        'outcome': res.get('success')
    }), now_iso))

    conn.commit()

    return {
        'success': True,
        'authenticated': True,
        'device_code': device_code,
        'device_type': device_type,
        'canonical_result': res
    }
