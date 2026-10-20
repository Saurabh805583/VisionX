"""
Smart MSRTC - VisionX
Event Ingestion & Processing Pipeline
Unified event workflow supporting Simulator, Manual Dispatch, and GPS Telemetry with Idempotency.
"""

import json
import uuid
from datetime import datetime, timezone
from backend.database import get_db_connection
from backend.platform_engine import evaluate_platform_allocation, apply_platform_assignment

VALID_SOURCES = {'SIMULATED', 'MANUAL', 'PHONE_GPS', 'IOT_DEVICE', 'OFFICIAL_FEED', 'UNKNOWN'}

def format_devanagari_bus_phonetics(bus_num: str) -> str:
    char_map = {
        'M': 'एम', 'H': 'एच', 'B': 'बी', 'L': 'एल', 'T': 'टी', 'K': 'के', 'R': 'आर',
        'N': 'एन', 'G': 'जी', 'P': 'पी', 'A': 'ए', 'S': 'एस', 'D': 'डी', 'C': 'सी',
        'J': 'जे', 'V': 'व्ही', 'W': 'डब्ल्यू', 'X': 'एक्स', 'Y': 'वाय', 'Z': 'झेड'
    }
    parts = bus_num.split('-')
    spoken = []
    for p in parts:
        if p.isalpha():
            spoken.append(' '.join(char_map.get(c.upper(), c) for c in p))
        elif p.isdigit():
            if len(p) == 4:
                spoken.append(f"{p[:2]} {p[2:]}")
            else:
                spoken.append(p)
        else:
            spoken.append(p)
    return ', '.join(spoken)

def process_arrival_event(conn, event_payload):
    """
    Unified end-to-end event handler for bus arrival / proximity events.
    Handles:
    - Validation and source normalization
    - Idempotency guard (rejects or ignores duplicates)
    - Bus & active trip identification
    - Location update
    - Rule-based platform evaluation
    - Platform assignment or conflict generation
    - Multilingual announcement generation (Marathi, Hindi, English)
    - Audit logging
    """
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Validate mandatory fields
    event_type = event_payload.get('event_type', 'BUS_APPROACHING')
    bus_id = event_payload.get('bus_id')
    trip_id = event_payload.get('trip_id')
    source = event_payload.get('source', 'UNKNOWN')
    idempotency_key = event_payload.get('idempotency_key')
    event_uuid = event_payload.get('event_uuid') or f"EVT-{uuid.uuid4().hex[:12].upper()}"

    if source not in VALID_SOURCES:
        source = 'UNKNOWN'

    if not bus_id and not trip_id:
        return {
            'success': False,
            'error': 'VALIDATION_ERROR',
            'message': 'Either bus_id or trip_id must be provided in event payload.'
        }

    # 2. Idempotency Check
    if idempotency_key:
        cursor.execute("SELECT * FROM events WHERE idempotency_key = ?;", (idempotency_key,))
        existing_event = cursor.fetchone()
        if existing_event:
            return {
                'success': True,
                'duplicate': True,
                'status': 'IDEMPOTENT_IGNORED',
                'message': f"Event with idempotency key '{idempotency_key}' already processed.",
                'event_uuid': existing_event['event_uuid'],
                'created_at': existing_event['created_at']
            }

    # 3. Identify Bus and Active Trip
    if not trip_id:
        cursor.execute("""
        SELECT id FROM trips
        WHERE bus_id = ? AND status IN ('SCHEDULED', 'APPROACHING', 'EN_ROUTE', 'AT_PLATFORM')
        ORDER BY scheduled_arrival ASC LIMIT 1;
        """, (bus_id,))
        trip_row = cursor.fetchone()
        if trip_row:
            trip_id = trip_row['id']

    if not bus_id and trip_id:
        cursor.execute("SELECT bus_id FROM trips WHERE id = ?;", (trip_id,))
        trip_row = cursor.fetchone()
        if trip_row:
            bus_id = trip_row['bus_id']

    cursor.execute("SELECT * FROM buses WHERE id = ?;", (bus_id,))
    bus = cursor.fetchone()
    if not bus:
        return {
            'success': False,
            'error': 'BUS_NOT_FOUND',
            'message': f"Bus {bus_id} could not be located in database."
        }

    # 4. Update GPS / Location telemetry if supplied
    lat = event_payload.get('latitude')
    lng = event_payload.get('longitude')
    speed = event_payload.get('speed_kmh', 0.0)
    heading = event_payload.get('heading', 0.0)

    if lat is not None and lng is not None:
        cursor.execute("""
        UPDATE buses
        SET live_lat = ?, live_lng = ?, speed_kmh = ?, heading = ?, last_seen = ?, source = ?
        WHERE id = ?;
        """, (lat, lng, speed, heading, now_iso, source, bus_id))

        cursor.execute("""
        INSERT INTO location_records (bus_id, trip_id, latitude, longitude, speed_kmh, heading, accuracy_meters, source, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (bus_id, trip_id, lat, lng, speed, heading, event_payload.get('accuracy_meters', 5.0), source, now_iso))

    # 5. Process state based on event_type
    assigned_platform_id = None
    allocation_reason = ""
    conflict_created = False
    announcement_created = False
    announcement_id = None

    if event_type in ('BUS_APPROACHING', 'GEOFENCE_ENTERED'):
        if trip_id:
            cursor.execute("UPDATE trips SET status = 'APPROACHING', source = ?, last_updated = ? WHERE id = ?;", (source, now_iso, trip_id))
            cursor.execute("UPDATE buses SET current_status = 'APPROACHING' WHERE id = ?;", (bus_id,))

    elif event_type in ('BUS_ARRIVED', 'DOCK_AT_PLATFORM', 'PLATFORM_REQUEST'):
        # Check if platform is explicitly requested or evaluate rule-based engine
        requested_platform = event_payload.get('requested_platform_id')

        if requested_platform:
            # Manual or requested override
            assigned_platform_id = int(requested_platform)
            allocation_reason = event_payload.get('override_reason', 'Manual platform specification by operator')
            apply_platform_assignment(conn, trip_id, assigned_platform_id, mode='MANUAL', reason=allocation_reason, assigned_by=event_payload.get('operator_id', 'STAFF_DISPATCH'))
        else:
            # Deterministic rule engine evaluation
            eval_result = evaluate_platform_allocation(conn, trip_id)

            if eval_result['success']:
                assigned_platform_id = eval_result['recommended_platform_id']
                allocation_reason = eval_result['recommendation_reason']
                apply_platform_assignment(conn, trip_id, assigned_platform_id, mode='AUTOMATIC', reason=allocation_reason, assigned_by='RULE_ENGINE')
            else:
                # Platform congestion conflict!
                conflict_created = True
                conflict_details = eval_result['conflict_details']
                alert_id = f"ALT-{int(datetime.now(timezone.utc).timestamp()*1000)}"
                cursor.execute("""
                INSERT INTO alerts (id, alert_type, severity, title, description, trip_id, is_resolved, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?);
                """, (alert_id, conflict_details['type'], conflict_details['severity'], conflict_details['title'], conflict_details['description'], trip_id, now_iso))



        # 6. Generate Multilingual Announcements if successfully assigned
        if assigned_platform_id and not conflict_created:
            cursor.execute("""
            SELECT t.destination, r.route_name, b.bus_number, b.bus_type
            FROM trips t
            JOIN buses b ON t.bus_id = b.id
            JOIN routes r ON t.route_id = r.id
            WHERE t.id = ?;
            """, (trip_id,))
            trip_info = cursor.fetchone()

            dest_marathi = trip_info['destination']
            bus_num = trip_info['bus_number']
            bus_phonetics = format_devanagari_bus_phonetics(bus_num)

            # Authentic, respectful MSRTC Station Announcement Phrasing
            ann_text_mr = f"कृपया लक्ष द्या! {dest_marathi} जाणारी बस क्रमांक {bus_num} फलाट क्रमांक {assigned_platform_id} वर येत आहे. प्रवाशांनी कृपया नोंद घ्यावी."
            phonetics_mr = f"कृपया लक्ष द्या... {dest_marathi} जाणारी गाडी, गाडी क्रमांक {bus_phonetics}... फलाट क्रमांक {assigned_platform_id} वर लागत आहे... प्रवाशांनी कृपया नोंद घ्यावी."

            announcement_id = f"ANN-{int(datetime.now(timezone.utc).timestamp()*1000)}"
            cursor.execute("""
            INSERT INTO announcements (id, announcement_type, trip_id, platform_id, bus_id, language, announcement_text, phonetics_text, status, play_count, created_at)
            VALUES (?, 'ARRIVAL', ?, ?, ?, 'mr-IN', ?, ?, 'QUEUED', 0, ?);
            """, (announcement_id, trip_id, assigned_platform_id, bus_id, ann_text_mr, phonetics_mr, now_iso))
            announcement_created = True

    elif event_type in ('BUS_DEPARTED'):
        if trip_id:
            cursor.execute("""
            UPDATE trips
            SET status = 'DEPARTED', actual_departure = COALESCE(actual_departure, ?), current_platform_id = NULL, last_updated = ?
            WHERE id = ?;
            """, (now_iso[11:16], now_iso, trip_id))

            cursor.execute("""
            UPDATE buses
            SET current_status = 'DEPARTED', current_platform_id = NULL, speed_kmh = 40.0, last_seen = ?
            WHERE id = ?;
            """, (now_iso, bus_id))

            cursor.execute("""
            UPDATE platforms
            SET status = 'FREE', assigned_trip_id = NULL
            WHERE assigned_trip_id = ?;
            """, (trip_id,))

            cursor.execute("""
            UPDATE platform_assignments
            SET status = 'COMPLETED'
            WHERE trip_id = ? AND status = 'ACTIVE';
            """, (trip_id,))

    # 7. Record Immutable Event Record
    cursor.execute("""
    INSERT INTO events (id, event_uuid, event_type, bus_id, trip_id, platform_id, timestamp, payload_json, idempotency_key, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (event_uuid, event_uuid, event_type, bus_id, trip_id, assigned_platform_id, now_iso, json.dumps(event_payload), idempotency_key, source, now_iso))

    conn.commit()

    return {
        'success': True,
        'duplicate': False,
        'event_uuid': event_uuid,
        'event_type': event_type,
        'bus_id': bus_id,
        'trip_id': trip_id,
        'assigned_platform_id': assigned_platform_id,
        'allocation_reason': allocation_reason,
        'conflict_created': conflict_created,
        'announcement_created': announcement_created,
        'announcement_id': announcement_id,
        'source': source,
        'timestamp': now_iso
    }
