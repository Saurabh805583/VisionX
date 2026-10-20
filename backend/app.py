"""
Smart MSRTC - VisionX
Flask REST API Entry Point
Provides complete endpoints for fleet, timetable, platforms,
mobile GPS geofencing, IoT adapters, arrival simulator, announcements, conflicts, audit trail, and settings.
"""

import os
import json
from datetime import datetime, timezone
from backend.database import get_db_connection, init_db
from backend.platform_engine import evaluate_platform_allocation, apply_platform_assignment
from backend.event_service import process_arrival_event
from backend.geofence_service import process_mobile_gps_update, haversine_distance_meters
from backend.device_service import ingest_device_event

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    Flask = None

def create_flask_app():
    if not FLASK_AVAILABLE:
        raise RuntimeError("Flask is not installed in the current environment. Use python3 backend/server.py for zero-dependency execution.")

    app = Flask(__name__)
    CORS(app)

    init_db()

    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'HEALTHY',
            'system': 'Smart MSRTC — VisionX',
            'station': 'Malkapur Bus Stand (MKR-MS)',
            'database': 'SQLite 3 (Persistent)',
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    @app.route('/api/dashboard/stats', methods=['GET'])
    @app.route('/api/dashboard', methods=['GET'])
    def get_dashboard_stats():
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT COUNT(*) as count FROM buses WHERE is_active = 1;")
        total_buses = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM trips WHERE status = 'APPROACHING';")
        incoming_buses = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM platforms WHERE status = 'OCCUPIED';")
        occupied_platforms = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM platforms WHERE status = 'FREE' AND is_active = 1;")
        free_platforms = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM trips WHERE delay_minutes > 0 AND status != 'DEPARTED';")
        delayed_buses = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM trips WHERE status = 'DEPARTED';")
        departed_buses = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM alerts WHERE is_resolved = 0;")
        active_conflicts = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM announcements WHERE status = 'QUEUED';")
        queued_announcements = c.fetchone()['count']
        c.execute("SELECT * FROM events ORDER BY created_at DESC LIMIT 8;")
        recent_events = [dict(row) for row in c.fetchall()]

        conn.close()

        return jsonify({
            'total_buses': total_buses,
            'incoming_buses': incoming_buses,
            'buses_at_platforms': occupied_platforms,
            'free_platforms': free_platforms,
            'occupied_platforms': occupied_platforms,
            'delayed_buses': delayed_buses,
            'departed_buses': departed_buses,
            'active_conflicts': active_conflicts,
            'queued_announcements': queued_announcements,
            'recent_events': recent_events
        })

    @app.route('/api/gps/update', methods=['POST'])
    def mobile_gps_update():
        conn = get_db_connection()
        payload = request.json or {}
        res = process_mobile_gps_update(conn, payload)
        conn.close()
        return jsonify(res)

    @app.route('/api/gps/ping', methods=['GET'])
    def mobile_gps_ping():
        conn = get_db_connection()
        bus_val = request.args.get('bus_id') or request.args.get('id') or request.args.get('bus_number')
        trip_val = request.args.get('trip_id')
        lat_val = request.args.get('lat') or request.args.get('latitude')
        lng_val = request.args.get('lng') or request.args.get('lon') or request.args.get('longitude')
        speed_val = float(request.args.get('speed', 0.0))
        acc_val = float(request.args.get('acc', request.args.get('accuracy', 15.0)))
        hdg_val = float(request.args.get('heading', request.args.get('bearing', 0.0)))

        payload = {
            'bus_id': bus_val,
            'trip_id': trip_val,
            'latitude': float(lat_val) if lat_val else None,
            'longitude': float(lng_val) if lng_val else None,
            'speed_kmh': speed_val,
            'accuracy_meters': acc_val,
            'heading': hdg_val,
            'source': 'PHONE_GPS',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        res = process_mobile_gps_update(conn, payload)
        conn.close()
        return jsonify(res)

    @app.route('/api/depots', methods=['GET', 'POST'])
    def depots_endpoint():
        conn = get_db_connection()
        c = conn.cursor()
        if request.method == 'GET':
            c.execute("SELECT * FROM depots ORDER BY name ASC;")
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            return jsonify(rows)

        data = request.json or {}
        now_iso = datetime.now(timezone.utc).isoformat()
        depot_id = data.get('id') or f"DEPOT-{int(datetime.now(timezone.utc).timestamp())}"
        depot_code = (data.get('depot_code') or f"DEP-{int(datetime.now(timezone.utc).timestamp())}").strip().upper()
        name = (data.get('name') or 'Unnamed Depot').strip()
        name_mr = data.get('name_mr') or name
        name_hi = data.get('name_hi') or name
        division = data.get('division') or 'Buldhana Division'
        region = data.get('region') or 'Maharashtra'
        phone = data.get('contact_phone') or ''
        try:
            c.execute("""
            INSERT INTO depots (id, depot_code, name, name_mr, name_hi, division, region, contact_phone, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
            """, (depot_id, depot_code, name, name_mr, name_hi, division, region, phone, now_iso))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'id': depot_id}), 201
        except Exception as e:
            conn.close()
            return jsonify({'success': False, 'error': str(e)}), 400

    @app.route('/api/buses', methods=['GET', 'POST'])
    def buses_endpoint():
        conn = get_db_connection()
        c = conn.cursor()
        if request.method == 'GET':
            c.execute("""
            SELECT b.*, COALESCE(d.name, b.depot, 'Depot not recorded') as operating_depot,
                   d.depot_code, d.division as depot_division, d.name_mr as depot_name_mr, d.name_hi as depot_name_hi
            FROM buses b
            LEFT JOIN depots d ON b.depot_id = d.id
            ORDER BY b.bus_number ASC;
            """)
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            return jsonify(rows)

        data = request.json or {}
        bus_id = data.get('id') or f"BUS-{int(datetime.now(timezone.utc).timestamp())}"
        depot_id = data.get('depot_id') or None
        depot_name = data.get('depot')
        if not depot_name and depot_id:
            c.execute("SELECT name FROM depots WHERE id = ?;", (depot_id,))
            d_row = c.fetchone()
            if d_row:
                depot_name = d_row['name']
        if not depot_name:
            depot_name = 'Depot not recorded'

        try:
            c.execute("""
            INSERT INTO buses (id, bus_number, depot, depot_id, bus_type, capacity, current_status, live_lat, live_lng, speed_kmh, heading, source, notes, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
            """, (
                bus_id,
                data.get('bus_number', '').strip().upper(),
                depot_name,
                depot_id,
                data.get('bus_type', 'Ordinary Parivahan'),
                int(data.get('capacity', 45)),
                data.get('current_status', 'SCHEDULED'),
                float(data.get('live_lat', 20.8871)),
                float(data.get('live_lng', 76.2014)),
                float(data.get('speed_kmh', 0)),
                float(data.get('heading', 0)),
                data.get('source', 'MANUAL'),
                data.get('notes', 'Registered manually by transport manager')
            ))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'id': bus_id}), 201
        except Exception as e:
            conn.close()
            return jsonify({'success': False, 'error': str(e)}), 400

    @app.route('/api/buses/<bus_id>', methods=['PUT'])
    def update_bus(bus_id):
        conn = get_db_connection()
        c = conn.cursor()
        body = request.json or {}
        depot_name = body.get('depot')
        depot_id = body.get('depot_id')
        if depot_id and not depot_name:
            c.execute("SELECT name FROM depots WHERE id = ?;", (depot_id,))
            d_row = c.fetchone()
            if d_row:
                depot_name = d_row['name']

        updates = []
        params = []
        if 'bus_number' in body:
            updates.append("bus_number = ?")
            params.append(body['bus_number'].strip().upper())
        if 'depot' in body or depot_name:
            updates.append("depot = ?")
            params.append(depot_name or 'Depot not recorded')
        if 'depot_id' in body:
            updates.append("depot_id = ?")
            params.append(depot_id)
        if 'bus_type' in body:
            updates.append("bus_type = ?")
            params.append(body['bus_type'])
        if 'capacity' in body:
            updates.append("capacity = ?")
            params.append(int(body['capacity']))
        if 'current_status' in body:
            updates.append("current_status = ?")
            params.append(body['current_status'])
        if 'notes' in body:
            updates.append("notes = ?")
            params.append(body['notes'])

        if updates:
            params.append(bus_id)
            sql = f"UPDATE buses SET {', '.join(updates)} WHERE id = ?;"
            c.execute(sql, params)
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': bus_id})

    @app.route('/api/platforms', methods=['GET'])
    def get_platforms():
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
        SELECT p.*, t.trip_number, t.destination, t.scheduled_departure, t.delay_minutes,
               b.bus_number, b.bus_type
        FROM platforms p
        LEFT JOIN trips t ON p.assigned_trip_id = t.id
        LEFT JOIN buses b ON t.bus_id = b.id
        ORDER BY p.platform_number ASC;
        """)
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify(rows)

    @app.route('/api/trips', methods=['GET'])
    def get_trips():
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
        SELECT t.*, b.bus_number, b.bus_type, COALESCE(d.name, b.depot, 'Depot not recorded') as operating_depot,
               b.depot_id, d.depot_code, d.name_mr as depot_name_mr, d.name_hi as depot_name_hi,
               b.live_lat, b.live_lng, b.speed_kmh, r.route_name, r.route_code, p.platform_number
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        LEFT JOIN depots d ON b.depot_id = d.id
        JOIN routes r ON t.route_id = r.id
        LEFT JOIN platforms p ON t.current_platform_id = p.id
        ORDER BY t.scheduled_arrival ASC;
        """)
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify(rows)

    @app.route('/api/routes', methods=['GET'])
    def get_routes():
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM routes ORDER BY route_code ASC;")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify(rows)

    @app.route('/api/events/arrival', methods=['POST'])
    def ingest_arrival_event():
        conn = get_db_connection()
        payload = request.json or {}
        res = process_arrival_event(conn, payload)
        conn.close()
        return jsonify(res)

    @app.route('/api/platforms/recommend', methods=['POST'])
    def recommend_platform():
        conn = get_db_connection()
        data = request.json or {}
        trip_id = data.get('trip_id')
        res = evaluate_platform_allocation(conn, trip_id)
        conn.close()
        return jsonify(res)

    @app.route('/api/platforms/override', methods=['POST'])
    def override_platform():
        conn = get_db_connection()
        data = request.json or {}
        trip_id = data.get('trip_id')
        platform_id = int(data.get('platform_id'))
        reason = data.get('reason', 'Supervisor manual override')
        actor = data.get('actor', 'STAFF_SUPERVISOR')

        try:
            assign_id = apply_platform_assignment(conn, trip_id, platform_id, mode='MANUAL_OVERRIDE', reason=reason, assigned_by=actor)
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'assignment_id': assign_id})
        except Exception as e:
            conn.close()
            return jsonify({'success': False, 'error': str(e)}), 400

    @app.route('/api/passenger-display', methods=['GET'])
    def passenger_display():
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
        SELECT t.id, t.trip_number, t.destination, t.scheduled_arrival, t.scheduled_departure,
               t.estimated_arrival, t.delay_minutes, t.status, t.source,
               b.bus_number, b.bus_type, COALESCE(d.name, b.depot, 'Depot not recorded') as operating_depot,
               d.name_mr as depot_name_mr, d.name_hi as depot_name_hi,
               p.platform_number, p.name as platform_name
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        LEFT JOIN depots d ON b.depot_id = d.id
        LEFT JOIN platforms p ON t.current_platform_id = p.id
        WHERE t.status != 'DEPARTED'
        ORDER BY t.scheduled_arrival ASC;
        """)
        rows = [dict(r) for r in c.fetchall()]

        c.execute("""
        SELECT * FROM announcements
        WHERE status IN ('QUEUED', 'SPEAKING') OR priority = 'URGENT'
        ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, created_at DESC
        LIMIT 3;
        """)
        active_ann = [dict(r) for r in c.fetchall()]
        conn.close()

        return jsonify({
            'station': 'Malkapur Bus Stand',
            'station_mr': 'मल्कापूर बस स्थानक',
            'station_hi': 'मलकापुर बस स्टैंड',
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'trips': rows,
            'announcements': active_ann
        })

    @app.route('/api/announcements', methods=['GET', 'POST'])
    def announcements_endpoint():
        conn = get_db_connection()
        c = conn.cursor()
        if request.method == 'GET':
            c.execute("""
            SELECT a.*, b.bus_number, t.trip_number, t.destination, p.platform_number
            FROM announcements a
            LEFT JOIN buses b ON a.bus_id = b.id
            LEFT JOIN trips t ON a.trip_id = t.id
            LEFT JOIN platforms p ON a.platform_id = p.id
            ORDER BY CASE a.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
                     CASE a.status WHEN 'QUEUED' THEN 1 WHEN 'SPEAKING' THEN 2 ELSE 3 END,
                     a.created_at DESC
            LIMIT 50;
            """)
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            return jsonify(rows)

        data = request.json or {}
        now_iso = datetime.now(timezone.utc).isoformat()
        ann_id = f"ANN-MAN-{int(datetime.now(timezone.utc).timestamp()*1000)}"
        c.execute("""
        INSERT INTO announcements (id, announcement_type, trip_id, platform_id, bus_id, language, announcement_text, phonetics_text, priority, status, play_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', 0, ?);
        """, (
            ann_id,
            data.get('announcement_type', 'GENERAL_ADVISORY'),
            data.get('trip_id') or 'GENERAL',
            data.get('platform_id'),
            data.get('bus_id') or 'GENERAL',
            data.get('language', 'mr-IN'),
            data.get('announcement_text', ''),
            data.get('announcement_text', ''),
            data.get('priority', 'NORMAL'),
            now_iso
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': ann_id}), 201

    @app.route('/api/devices', methods=['GET'])
    def get_devices():
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
        SELECT d.*, b.bus_number, p.platform_number
        FROM iot_devices d
        LEFT JOIN buses b ON d.assigned_bus_id = b.id
        LEFT JOIN platforms p ON d.assigned_platform_id = p.id
        ORDER BY d.created_at DESC;
        """)
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify(rows)

    @app.route('/api/devices/ingest', methods=['POST'])
    def ingest_device():
        token = request.headers.get('X-Device-Token') or request.json.get('auth_token')
        code = request.json.get('device_code')
        conn = get_db_connection()
        res = ingest_device_event(conn, code, token, request.json)
        conn.close()
        if not res.get('success') and res.get('error') == 'AUTHENTICATION_FAILED':
            return jsonify(res), 401
        return jsonify(res)

    @app.route('/api/devices/<dev_id>/simulate', methods=['POST'])
    def simulate_device(dev_id):
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM iot_devices WHERE id = ?;", (dev_id,))
        dev = c.fetchone()
        if not dev:
            conn.close()
            return jsonify({'error': 'Device not found'}), 404

        sim_payload = {
            'device_code': dev['device_code'],
            'auth_token': dev['auth_token'],
            'gate_direction': request.json.get('gate_direction', 'IN'),
            'bus_id': dev['assigned_bus_id'] or 'BUS-101',
            'trip_id': request.json.get('trip_id'),
            'platform_id': dev['assigned_platform_id'],
            'latitude': 20.8871,
            'longitude': 76.2014,
            'speed_kmh': 10.0
        }
        res = ingest_device_event(conn, dev['device_code'], dev['auth_token'], sim_payload)
        conn.close()
        return jsonify(res)

    @app.route('/api/diagnostics', methods=['GET'])
    def get_diagnostics():
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) as count FROM buses;")
        bus_count = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM platforms;")
        plat_count = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM iot_devices WHERE status = 'ONLINE';")
        online_devices = c.fetchone()['count']
        c.execute("SELECT COUNT(*) as count FROM announcements WHERE status = 'QUEUED';")
        queued_ann = c.fetchone()['count']
        c.execute("SELECT key, value FROM system_settings;")
        settings = {r['key']: r['value'] for r in c.fetchall()}
        conn.close()

        return jsonify({
            'status': 'OPERATIONAL',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'checks': {
                'api_server': {'healthy': True, 'message': 'Flask REST API responding normally.'},
                'database': {'healthy': True, 'engine': 'SQLite 3 Persistent', 'bus_records': bus_count, 'platform_records': plat_count},
                'geofence': {
                    'healthy': True,
                    'station_coordinates': f"{settings.get('station_lat', '20.8871')}, {settings.get('station_lng', '76.2014')}",
                    'radius_meters': settings.get('geofence_arrival_radius_meters', '1200'),
                    'accuracy_threshold_meters': settings.get('gps_accuracy_threshold_meters', '50'),
                    'required_consecutive_samples': settings.get('geofence_required_consecutive_samples', '2'),
                    'cooldown_minutes': settings.get('geofence_cooldown_minutes', '15')
                },
                'announcements': {
                    'healthy': True,
                    'queued_count': queued_ann,
                    'default_language': settings.get('active_language', 'mr-IN')
                },
                'iot_adapters': {
                    'healthy': True,
                    'online_devices': online_devices,
                    'authentication_required': True
                }
            }
        })

    @app.route('/api/conflicts', methods=['GET'])
    def get_conflicts():
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
        SELECT al.*, t.trip_number, t.destination, b.bus_number
        FROM alerts al
        LEFT JOIN trips t ON al.trip_id = t.id
        LEFT JOIN buses b ON t.bus_id = b.id
        ORDER BY al.created_at DESC;
        """)
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify(rows)

    @app.route('/api/conflicts/<alert_id>/resolve', methods=['POST'])
    def resolve_conflict(alert_id):
        conn = get_db_connection()
        data = request.json or {}
        actor = data.get('actor', 'STATION_MASTER')
        now_iso = datetime.now(timezone.utc).isoformat()
        c = conn.cursor()
        c.execute("""
        UPDATE alerts
        SET is_resolved = 1, resolved_by = ?, resolved_at = ?
        WHERE id = ?;
        """, (actor, now_iso, alert_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'alert_id': alert_id})

    @app.route('/api/audit-logs', methods=['GET'])
    @app.route('/api/audit-trail', methods=['GET'])
    def get_audit_logs():
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify(rows)

    @app.route('/api/settings', methods=['GET', 'PUT'])
    def settings_endpoint():
        conn = get_db_connection()
        c = conn.cursor()
        if request.method == 'GET':
            c.execute("SELECT * FROM system_settings;")
            rows = {r['key']: r['value'] for r in c.fetchall()}
            conn.close()
            return jsonify(rows)

        data = request.json or {}
        now_iso = datetime.now(timezone.utc).isoformat()
        for k, v in data.items():
            c.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?);", (k, str(v), now_iso))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

    @app.route('/api/simulator/reset', methods=['POST'])
    def reset_simulator():
        init_db(force_reseed=True)
        return jsonify({'success': True, 'message': 'Database re-seeded with Malkapur initial prototype state.'})

    return app

if __name__ == '__main__':
    if FLASK_AVAILABLE:
        app = create_flask_app()
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("Flask not installed. Run python3 backend/server.py directly.")
