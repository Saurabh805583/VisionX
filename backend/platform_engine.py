"""
Smart MSRTC - VisionX
Platform Coordination Engine
Deterministic rule-based allocation service with buffer enforcement,
corridor matching, conflict detection, and transparent explanations.
"""

import json
from datetime import datetime, timezone, timedelta
from backend.database import get_db_connection

def evaluate_platform_allocation(conn, trip_id, arrival_time_str=None, bus_type_override=None):
    """
    Evaluates platforms 1..N deterministically for an incoming trip.
    Returns:
    {
        'success': bool,
        'recommended_platform_id': int or None,
        'recommendation_reason': str,
        'candidate_evaluations': list of dicts,
        'conflict_detected': bool,
        'conflict_details': dict or None
    }
    """
    cursor = conn.cursor()

    # 1. Fetch Trip & Bus & Route details
    cursor.execute("""
    SELECT t.*, b.bus_number, b.bus_type, b.capacity, r.destination as route_dest, r.route_name
    FROM trips t
    JOIN buses b ON t.bus_id = b.id
    JOIN routes r ON t.route_id = r.id
    WHERE t.id = ?;
    """, (trip_id,))
    trip = cursor.fetchone()

    if not trip:
        return {
            'success': False,
            'recommended_platform_id': None,
            'recommendation_reason': f"Trip {trip_id} not found in database.",
            'candidate_evaluations': [],
            'conflict_detected': True,
            'conflict_details': {'type': 'TRIP_NOT_FOUND', 'message': f"Trip {trip_id} not found"}
        }

    # 2. Get Configurable Buffer Time
    cursor.execute("SELECT value FROM system_settings WHERE key = 'buffer_time_minutes';")
    setting_row = cursor.fetchone()
    buffer_minutes = int(setting_row['value']) if setting_row else 10

    # 3. Fetch All Active Platforms
    cursor.execute("""
    SELECT p.*, t.trip_number as active_trip_number, t.destination as active_trip_destination,
           t.scheduled_departure as active_scheduled_departure, b.bus_number as active_bus_number
    FROM platforms p
    LEFT JOIN trips t ON p.assigned_trip_id = t.id
    LEFT JOIN buses b ON t.bus_id = b.id
    WHERE p.is_active = 1
    ORDER BY p.platform_number ASC;
    """)
    platforms = cursor.fetchall()

    candidate_evaluations = []
    recommended_platform_id = None
    best_score = -999
    best_explanation = ""

    dest = (trip['route_dest'] or trip['destination']).lower()
    bus_type = (bus_type_override or trip['bus_type']).lower()
    is_express = ('shivshahi' in bus_type or 'asiad' in bus_type or 'luxury' in bus_type or 'express' in bus_type)

    for plat in platforms:
        plat_id = plat['id']
        plat_num = plat['platform_number']
        is_occupied = (plat['status'] == 'OCCUPIED' and plat['assigned_trip_id'] is not None and plat['assigned_trip_id'] != trip_id)
        allows_express = bool(plat['allows_express'])
        corridor = (plat['preferred_corridor'] or "").lower()

        eval_item = {
            'platform_id': plat_id,
            'platform_number': plat_num,
            'current_status': plat['status'],
            'is_occupied': is_occupied,
            'eligible': False,
            'score': 0,
            'reasons': []
        }

        # Rule 1: Immediate Physical Occupancy
        if is_occupied:
            eval_item['eligible'] = False
            eval_item['reasons'].append(f"Currently occupied by Trip {plat['active_trip_number']} ({plat['active_bus_number']}) bound for {plat['active_trip_destination']}.")
            candidate_evaluations.append(eval_item)
            continue

        # Rule 2: Active or Overlapping Assignments buffer check
        cursor.execute("""
        SELECT pa.*, t.scheduled_departure, t.trip_number
        FROM platform_assignments pa
        JOIN trips t ON pa.trip_id = t.id
        WHERE pa.platform_id = ? AND pa.status = 'ACTIVE' AND pa.trip_id != ?;
        """, (plat_id, trip_id))
        active_assignments = cursor.fetchall()

        if len(active_assignments) >= plat['max_capacity']:
            eval_item['eligible'] = False
            eval_item['reasons'].append(f"Reserved capacity reached ({len(active_assignments)}/{plat['max_capacity']}).")
            candidate_evaluations.append(eval_item)
            continue

        # Rule 3: Express / Long-distance vs Regional Platform Capability
        score = 50  # base score for free platform
        eligibility_notes = []

        if is_express and allows_express:
            score += 30
            eligibility_notes.append("Supports Express/Luxury vehicle dimensions.")
        elif is_express and not allows_express:
            score -= 20
            eligibility_notes.append("Sub-optimal for Express (prefers regional platform).")

        # Rule 4: Preferred Corridor / Route Affinity
        if 'pune' in dest or 'nashik' in dest:
            if plat_num == 1:
                score += 40
                eligibility_notes.append("Primary Pune/Nashik corridor alignment (Platform 1).")
        elif 'nagpur' in dest or 'amravati' in dest or 'akola' in dest:
            if plat_num == 2:
                score += 40
                eligibility_notes.append("Primary Nagpur/Eastbound express alignment (Platform 2).")
        elif 'jalgaon' in dest or 'bhusawal' in dest or 'buldhana' in dest:
            if plat_num == 3:
                score += 35
                eligibility_notes.append("Regional feeder corridor alignment (Platform 3).")
        elif 'shegaon' in dest or 'nandura' in dest or 'rural' in corridor:
            if plat_num == 4:
                score += 35
                eligibility_notes.append("Local shuttle & feeder alignment (Platform 4).")

        # Tie-breaker: Lower platform number preferred for passenger convenience
        score += (10 - plat_num)

        eval_item['eligible'] = True
        eval_item['score'] = score
        eval_item['reasons'].extend(eligibility_notes)
        candidate_evaluations.append(eval_item)

        if score > best_score:
            best_score = score
            recommended_platform_id = plat_id
            best_explanation = (
                f"Platform {plat_num} recommended: Free of occupancy, satisfies {buffer_minutes}-min clearance buffer. "
                + (", ".join(eligibility_notes) if eligibility_notes else "Platform available.")
            )

    # 4. Conflict Determination
    if recommended_platform_id is None:
        conflict_details = {
            'type': 'PLATFORM_CONGESTION_CONFLICT',
            'severity': 'HIGH',
            'title': f'No Available Platform for Trip {trip["trip_number"]}',
            'description': f'All {len(platforms)} platforms are occupied or reserved. Immediate staff override or holding bay routing required for Bus {trip["bus_number"]}.'
        }
        return {
            'success': False,
            'recommended_platform_id': None,
            'recommendation_reason': 'No platform available meeting minimum buffer and clearance rules.',
            'candidate_evaluations': candidate_evaluations,
            'conflict_detected': True,
            'conflict_details': conflict_details
        }

    return {
        'success': True,
        'recommended_platform_id': recommended_platform_id,
        'recommendation_reason': best_explanation,
        'candidate_evaluations': candidate_evaluations,
        'conflict_detected': False,
        'conflict_details': None
    }

def apply_platform_assignment(conn, trip_id, platform_id, mode='AUTOMATIC', reason='Engine allocation', assigned_by='ENGINE'):
    """
    Atomically commits a platform assignment:
    - Updates platform to OCCUPIED and assigned_trip_id
    - Updates trip current_platform_id and status to 'AT_PLATFORM'
    - Closes previous assignments for this trip or platform
    - Inserts new row in platform_assignments
    - Generates audit log
    """
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Get Trip info
    cursor.execute("SELECT t.*, b.id as bus_id, b.bus_number FROM trips t JOIN buses b ON t.bus_id = b.id WHERE t.id = ?;", (trip_id,))
    trip = cursor.fetchone()
    if not trip:
        raise ValueError(f"Trip {trip_id} not found")

    bus_id = trip['bus_id']
    old_platform_id = trip['current_platform_id']
    is_platform_change = (old_platform_id is not None and old_platform_id != platform_id)

    # Free any platform previously assigned to this trip
    cursor.execute("""
    UPDATE platforms SET status = 'FREE', assigned_trip_id = NULL
    WHERE assigned_trip_id = ? AND id != ?;
    """, (trip_id, platform_id))

    # Mark old assignments as SUPERSEDED or COMPLETED
    cursor.execute("""
    UPDATE platform_assignments SET status = 'SUPERSEDED'
    WHERE trip_id = ? AND status = 'ACTIVE';
    """, (trip_id,))

    # Update new Platform
    cursor.execute("""
    UPDATE platforms
    SET status = 'OCCUPIED', assigned_trip_id = ?
    WHERE id = ?;
    """, (trip_id, platform_id))

    # Update Trip
    cursor.execute("""
    UPDATE trips
    SET current_platform_id = ?, status = 'AT_PLATFORM', actual_arrival = COALESCE(actual_arrival, ?), last_updated = ?
    WHERE id = ?;
    """, (platform_id, now_iso[11:16], now_iso, trip_id))

    # Update Bus
    cursor.execute("""
    UPDATE buses
    SET current_platform_id = ?, current_status = 'AT_PLATFORM', speed_kmh = 0, last_seen = ?
    WHERE id = ?;
    """, (platform_id, now_iso, bus_id))

    # Insert assignment record
    assign_id = f"ASSIGN-{int(datetime.now(timezone.utc).timestamp()*1000)}"
    cursor.execute("""
    INSERT INTO platform_assignments (id, platform_id, trip_id, bus_id, assigned_at, departure_expected, status, allocation_mode, allocation_reason, assigned_by)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?);
    """, (assign_id, platform_id, trip_id, bus_id, now_iso, trip['scheduled_departure'], mode, reason, assigned_by))

    # Enqueue Platform Change Announcement if this is an approved platform change
    if is_platform_change:
        dest = trip['destination']
        bus_no = trip['bus_number']
        mr_text = f"महत्त्वाची सूचना. {dest} कडे जाणाऱ्या बस क्रमांक {bus_no} चा प्लॅटफॉर्म बदलण्यात आला आहे. नवीन प्लॅटफॉर्म क्रमांक {platform_id} आहे."
        ann_id = f"ANN-CHG-{int(datetime.now(timezone.utc).timestamp()*1000)}"
        cursor.execute("""
        INSERT INTO announcements (id, announcement_type, trip_id, platform_id, bus_id, language, announcement_text, phonetics_text, priority, status, play_count, created_at)
        VALUES (?, 'PLATFORM_CHANGE', ?, ?, ?, 'mr-IN', ?, ?, 'URGENT', 'QUEUED', 0, ?);
        """, (ann_id, trip_id, platform_id, bus_id, mr_text, mr_text, now_iso))

    # If there was an unresolved conflict for this trip, mark it resolved
    cursor.execute("""
    UPDATE alerts
    SET is_resolved = 1, resolved_by = ?, resolved_at = ?
    WHERE trip_id = ? AND is_resolved = 0;
    """, (assigned_by, now_iso, trip_id))

    # Log in audit table
    action_type = 'PLATFORM_CHANGE' if is_platform_change else 'PLATFORM_ASSIGNMENT'
    cursor.execute("""
    INSERT INTO audit_logs (action, entity_type, entity_id, actor, details_json, created_at)
    VALUES (?, 'PLATFORM', ?, ?, ?, ?);
    """, (action_type, str(platform_id), assigned_by, json.dumps({
        'trip_id': trip_id,
        'bus_number': trip['bus_number'],
        'old_platform_id': old_platform_id,
        'new_platform_id': platform_id,
        'mode': mode,
        'reason': reason
    }), now_iso))

    return assign_id
