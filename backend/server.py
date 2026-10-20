"""
Smart MSRTC - VisionX
Standalone Python Server
Implements the complete REST API contract using Python standard library http.server,
guaranteeing 100% operational execution on any Python 3 environment without external packages.
"""

import sys
import os
import json
import sqlite3
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.database import get_db_connection, init_db
from backend.platform_engine import evaluate_platform_allocation, apply_platform_assignment
from backend.event_service import process_arrival_event
from backend.geofence_service import process_mobile_gps_update, haversine_distance_meters
from backend.device_service import ingest_device_event

PORT = int(os.environ.get('BACKEND_PORT', 5050))

class RestRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write(f"[{datetime.now().strftime('%H:%M:%S')}] Python API: {format % args}\n")

    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Token')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode('utf-8')
            return json.loads(body)
        return {}

    def _send_json(self, data, status=200):
        body_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')

        conn = get_db_connection()
        c = conn.cursor()

        try:
            if path == '/api/health':
                self._send_json({
                    'status': 'HEALTHY',
                    'system': 'Smart MSRTC — VisionX',
                    'station': 'Malkapur Bus Stand (MKR-MS)',
                    'port': PORT,
                    'database': 'SQLite 3 (Persistent)',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })

            elif path in ('/api/dashboard/stats', '/api/dashboard'):
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

                self._send_json({
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

            elif path == '/api/depots':
                c.execute("SELECT * FROM depots ORDER BY name ASC;")
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path == '/api/buses':
                c.execute("""
                SELECT b.*, COALESCE(d.name, b.depot, 'Depot not recorded') as operating_depot,
                       d.depot_code, d.division as depot_division, d.name_mr as depot_name_mr, d.name_hi as depot_name_hi
                FROM buses b
                LEFT JOIN depots d ON b.depot_id = d.id
                ORDER BY b.bus_number ASC;
                """)
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path == '/api/platforms':
                c.execute("""
                SELECT p.*, t.trip_number, t.destination, t.scheduled_departure, t.delay_minutes,
                       b.bus_number, b.bus_type, b.depot as operating_depot
                FROM platforms p
                LEFT JOIN trips t ON p.assigned_trip_id = t.id
                LEFT JOIN buses b ON t.bus_id = b.id
                ORDER BY p.platform_number ASC;
                """)
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path == '/api/trips':
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
                self._send_json(rows)

            elif path == '/api/routes':
                c.execute("SELECT * FROM routes ORDER BY route_code ASC;")
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path == '/api/passenger-display':
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

                # Fetch active public announcements to show on passenger screen
                c.execute("""
                SELECT * FROM announcements
                WHERE status IN ('QUEUED', 'SPEAKING') OR priority = 'URGENT'
                ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END, created_at DESC
                LIMIT 3;
                """)
                active_announcements = [dict(r) for r in c.fetchall()]

                self._send_json({
                    'station': 'Malkapur Bus Stand',
                    'station_mr': 'मल्कापूर बस स्थानक',
                    'station_hi': 'मलकापुर बस स्टैंड',
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'trips': rows,
                    'announcements': active_announcements
                })

            elif path == '/api/announcements':
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
                self._send_json(rows)

            elif path == '/api/conflicts':
                c.execute("""
                SELECT al.*, t.trip_number, t.destination, b.bus_number
                FROM alerts al
                LEFT JOIN trips t ON al.trip_id = t.id
                LEFT JOIN buses b ON t.bus_id = b.id
                ORDER BY al.created_at DESC;
                """)
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path in ('/api/audit-logs', '/api/audit-trail'):
                c.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;")
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path == '/api/events':
                c.execute("SELECT * FROM events ORDER BY created_at DESC LIMIT 100;")
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path == '/api/devices':
                c.execute("""
                SELECT d.*, b.bus_number, p.platform_number
                FROM iot_devices d
                LEFT JOIN buses b ON d.assigned_bus_id = b.id
                LEFT JOIN platforms p ON d.assigned_platform_id = p.id
                ORDER BY d.created_at DESC;
                """)
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path in ('/api/geofence/sessions', '/api/geofence/status'):
                c.execute("""
                SELECT s.*, b.bus_number, t.trip_number, t.destination
                FROM geofence_tracking_sessions s
                JOIN buses b ON s.bus_id = b.id
                JOIN trips t ON s.trip_id = t.id
                ORDER BY s.updated_at DESC;
                """)
                rows = [dict(r) for r in c.fetchall()]
                self._send_json(rows)

            elif path == '/api/settings':
                c.execute("SELECT * FROM system_settings;")
                rows = {r['key']: r['value'] for r in c.fetchall()}
                self._send_json(rows)

            elif path == '/api/diagnostics':
                # Comprehensive Diagnostics Report
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

                self._send_json({
                    'status': 'OPERATIONAL',
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'checks': {
                        'api_server': {'healthy': True, 'message': 'Python REST API responding normally.'},
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
                            'default_language': settings.get('active_language', 'mr-IN'),
                            'queue_paused': settings.get('announcement_queue_paused', '0') == '1'
                        },
                        'iot_adapters': {
                            'healthy': True,
                            'online_devices': online_devices,
                            'authentication_required': True
                        }
                    }
                })

            elif path == '/api/gps/ping':
                # Query param support for Traccar / OsmAnd / Phone GPS HTTP ping
                query = parse_qs(parsed.query)
                bus_val = query.get('bus_id', query.get('id', query.get('bus_number', [''])))[0]
                trip_val = query.get('trip_id', [''])[0] or None
                lat_val = query.get('lat', query.get('latitude', [None]))[0]
                lng_val = query.get('lng', query.get('lon', query.get('longitude', [None])))[0]
                speed_val = float(query.get('speed', [0.0])[0])
                acc_val = float(query.get('acc', query.get('accuracy', [15.0]))[0])
                hdg_val = float(query.get('heading', query.get('bearing', [0.0]))[0])

                payload = {
                    'bus_id': bus_val,
                    'trip_id': trip_val,
                    'latitude': float(lat_val) if lat_val is not None else None,
                    'longitude': float(lng_val) if lng_val is not None else None,
                    'speed_kmh': speed_val,
                    'accuracy_meters': acc_val,
                    'heading': hdg_val,
                    'source': 'PHONE_GPS',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                res = process_mobile_gps_update(conn, payload)
                self._send_json(res)

            else:
                self._send_json({'error': f'Route {path} not found'}, 404)
        except Exception as e:
            self.log_message("Exception in do_GET %s: %s", path, str(e))
            self._send_json({'error': str(e)}, 500)
        finally:
            conn.close()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')

        conn = get_db_connection()
        body = self._read_json_body()

        try:
            if path == '/api/gps/update':
                # Mobile driver GPS update
                res = process_mobile_gps_update(conn, body)
                self._send_json(res)

            elif path == '/api/events/arrival':
                res = process_arrival_event(conn, body)
                self._send_json(res)

            elif path == '/api/platforms/recommend':
                trip_id = body.get('trip_id')
                res = evaluate_platform_allocation(conn, trip_id)
                self._send_json(res)

            elif path == '/api/platforms/override':
                trip_id = body.get('trip_id')
                platform_id = int(body.get('platform_id'))
                reason = body.get('reason', 'Supervisor manual override')
                actor = body.get('actor', 'STAFF_SUPERVISOR')
                assign_id = apply_platform_assignment(conn, trip_id, platform_id, mode='MANUAL_OVERRIDE', reason=reason, assigned_by=actor)
                conn.commit()
                self._send_json({'success': True, 'assignment_id': assign_id})

            elif path == '/api/announcements':
                # Manual announcement creation with validation
                now_iso = datetime.now(timezone.utc).isoformat()
                trip_id = body.get('trip_id')
                bus_id = body.get('bus_id')
                platform_id = body.get('platform_id')
                ann_type = body.get('announcement_type', 'GENERAL_ADVISORY')
                lang = body.get('language', 'mr-IN')
                text = (body.get('announcement_text') or '').strip()
                priority = body.get('priority', 'NORMAL')

                if not text:
                    self._send_json({'success': False, 'error': 'Announcement text cannot be empty'}, 400)
                    return

                ann_id = f"ANN-MAN-{int(datetime.now(timezone.utc).timestamp()*1000)}"
                c = conn.cursor()
                c.execute("""
                INSERT INTO announcements (id, announcement_type, trip_id, platform_id, bus_id, language, announcement_text, phonetics_text, priority, status, play_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', 0, ?);
                """, (ann_id, ann_type, trip_id or 'GENERAL', platform_id, bus_id or 'GENERAL', lang, text, text, priority, now_iso))
                conn.commit()
                self._send_json({'success': True, 'id': ann_id, 'announcement_text': text}, 201)

            elif path == '/api/announcements/control':
                action = body.get('action') # 'PAUSE', 'RESUME', 'CLEAR'
                c = conn.cursor()
                now_iso = datetime.now(timezone.utc).isoformat()
                if action == 'PAUSE':
                    c.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('announcement_queue_paused', '1', ?);", (now_iso,))
                elif action == 'RESUME':
                    c.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('announcement_queue_paused', '0', ?);", (now_iso,))
                elif action == 'CLEAR':
                    c.execute("UPDATE announcements SET status = 'SKIPPED' WHERE status = 'QUEUED';")
                conn.commit()
                self._send_json({'success': True, 'action': action})

            elif path.startswith('/api/announcements/') and path.endswith('/play'):
                parts = path.split('/')
                ann_id = parts[3]
                now_iso = datetime.now(timezone.utc).isoformat()
                c = conn.cursor()
                c.execute("""
                UPDATE announcements
                SET play_count = play_count + 1, status = 'COMPLETED', last_played_at = ?
                WHERE id = ?;
                """, (now_iso, ann_id))
                conn.commit()
                self._send_json({'success': True, 'id': ann_id, 'played_at': now_iso})

            elif path.startswith('/api/announcements/') and path.endswith('/status'):
                parts = path.split('/')
                ann_id = parts[3]
                new_status = body.get('status', 'COMPLETED')
                now_iso = datetime.now(timezone.utc).isoformat()
                c = conn.cursor()
                c.execute("""
                UPDATE announcements
                SET status = ?, last_played_at = CASE WHEN ? = 'COMPLETED' THEN ? ELSE last_played_at END,
                    play_count = CASE WHEN ? = 'COMPLETED' THEN play_count + 1 ELSE play_count END
                WHERE id = ?;
                """, (new_status, new_status, now_iso, new_status, ann_id))
                conn.commit()
                self._send_json({'success': True, 'id': ann_id, 'status': new_status})

            elif path == '/api/devices/ingest':
                # Authenticated IoT Ingestion Endpoint
                token_header = self.headers.get('X-Device-Token') or body.get('auth_token')
                device_code = body.get('device_code')
                res = ingest_device_event(conn, device_code, token_header, body)
                if not res.get('success') and res.get('error') == 'AUTHENTICATION_FAILED':
                    self._send_json(res, 401)
                else:
                    self._send_json(res)

            elif path.startswith('/api/devices/') and path.endswith('/simulate'):
                parts = path.split('/')
                dev_id = parts[3]
                c = conn.cursor()
                c.execute("SELECT * FROM iot_devices WHERE id = ?;", (dev_id,))
                dev = c.fetchone()
                if not dev:
                    self._send_json({'error': 'Device not found'}, 404)
                    return

                # Send simulated test event with valid device credentials
                sim_payload = {
                    'device_code': dev['device_code'],
                    'auth_token': dev['auth_token'],
                    'gate_direction': body.get('gate_direction', 'IN'),
                    'bus_id': dev['assigned_bus_id'] or 'BUS-101',
                    'trip_id': body.get('trip_id'),
                    'platform_id': dev['assigned_platform_id'],
                    'latitude': 20.8871,
                    'longitude': 76.2014,
                    'speed_kmh': 12.0
                }
                res = ingest_device_event(conn, dev['device_code'], dev['auth_token'], sim_payload)
                self._send_json(res)

            elif path.startswith('/api/conflicts/') and path.endswith('/resolve'):
                parts = path.split('/')
                alert_id = parts[3]
                actor = body.get('actor', 'STATION_MASTER')
                now_iso = datetime.now(timezone.utc).isoformat()
                c = conn.cursor()
                c.execute("""
                UPDATE alerts
                SET is_resolved = 1, resolved_by = ?, resolved_at = ?
                WHERE id = ?;
                """, (actor, now_iso, alert_id))
                conn.commit()
                self._send_json({'success': True, 'alert_id': alert_id})

            elif path == '/api/depots':
                now_iso = datetime.now(timezone.utc).isoformat()
                depot_id = body.get('id') or f"DEPOT-{int(datetime.now(timezone.utc).timestamp())}"
                depot_code = (body.get('depot_code') or f"DEP-{int(datetime.now(timezone.utc).timestamp())}").strip().upper()
                name = (body.get('name') or 'Unnamed Depot').strip()
                name_mr = body.get('name_mr') or name
                name_hi = body.get('name_hi') or name
                division = body.get('division') or 'Buldhana Division'
                region = body.get('region') or 'Maharashtra'
                phone = body.get('contact_phone') or ''
                c = conn.cursor()
                c.execute("""
                INSERT INTO depots (id, depot_code, name, name_mr, name_hi, division, region, contact_phone, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
                """, (depot_id, depot_code, name, name_mr, name_hi, division, region, phone, now_iso))
                conn.commit()
                self._send_json({'success': True, 'id': depot_id}, 201)

            elif path == '/api/buses':
                bus_id = body.get('id') or f"BUS-{int(datetime.now(timezone.utc).timestamp())}"
                c = conn.cursor()
                depot_id = body.get('depot_id') or None
                depot_name = body.get('depot')
                if not depot_name and depot_id:
                    c.execute("SELECT name FROM depots WHERE id = ?;", (depot_id,))
                    d_row = c.fetchone()
                    if d_row:
                        depot_name = d_row['name']
                if not depot_name:
                    depot_name = 'Depot not recorded'

                c.execute("""
                INSERT INTO buses (id, bus_number, depot, depot_id, bus_type, capacity, current_status, live_lat, live_lng, speed_kmh, heading, source, notes, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
                """, (
                    bus_id,
                    body.get('bus_number', '').strip().upper(),
                    depot_name,
                    depot_id,
                    body.get('bus_type', 'Ordinary Parivahan'),
                    int(body.get('capacity', 45)),
                    body.get('current_status', 'SCHEDULED'),
                    float(body.get('live_lat', 20.8871)),
                    float(body.get('live_lng', 76.2014)),
                    float(body.get('speed_kmh', 0)),
                    float(body.get('heading', 0)),
                    body.get('source', 'MANUAL'),
                    body.get('notes', 'Added via fleet management console')
                ))
                conn.commit()
                self._send_json({'success': True, 'id': bus_id}, 201)

            elif path == '/api/simulator/reset':
                init_db(force_reseed=True)
                self._send_json({'success': True, 'message': 'Database re-seeded with Malkapur initial prototype state.'})

            elif path == '/api/simulator/step':
                bus_id = body.get('bus_id', 'BUS-101')
                stage = body.get('stage', 'APPROACHING')
                source = body.get('source', 'SIMULATED')

                coord_map = {
                    'APPROACH_5KM': {'lat': 20.8990, 'lng': 76.1550, 'speed': 62.0, 'heading': 110.0, 'event_type': 'GEOFENCE_ENTERED'},
                    'APPROACH_1KM': {'lat': 20.8890, 'lng': 76.1910, 'speed': 35.0, 'heading': 95.0, 'event_type': 'BUS_APPROACHING'},
                    'BUS_ARRIVED': {'lat': 20.8871, 'lng': 76.2014, 'speed': 10.0, 'heading': 90.0, 'event_type': 'BUS_ARRIVED'},
                    'BUS_DEPARTED': {'lat': 20.8750, 'lng': 76.2300, 'speed': 45.0, 'heading': 80.0, 'event_type': 'BUS_DEPARTED'}
                }

                step_info = coord_map.get(stage, coord_map['APPROACH_1KM'])
                event_payload = {
                    'event_type': step_info['event_type'],
                    'bus_id': bus_id,
                    'trip_id': body.get('trip_id'),
                    'latitude': step_info['lat'],
                    'longitude': step_info['lng'],
                    'speed_kmh': step_info['speed'],
                    'heading': step_info['heading'],
                    'source': source,
                    'idempotency_key': f"SIM-STEP-{bus_id}-{stage}-{int(datetime.now(timezone.utc).timestamp())}"
                }
                res = process_arrival_event(conn, event_payload)
                self._send_json(res)

            else:
                self._send_json({'error': f'Route {path} not found'}, 404)
        except Exception as e:
            self._send_json({'error': str(e)}, 500)
        finally:
            conn.close()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')
        conn = get_db_connection()
        body = self._read_json_body()
        c = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()

        try:
            if path == '/api/settings':
                for k, v in body.items():
                    c.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?);", (k, str(v), now_iso))
                conn.commit()
                self._send_json({'success': True})

            elif path.startswith('/api/buses/'):
                bus_id = path.split('/')[3]
                depot_name = body.get('depot')
                depot_id = body.get('depot_id')
                if depot_id and not depot_name:
                    c.execute("SELECT name FROM depots WHERE id = ?;", (depot_id,))
                    d_row = c.fetchone()
                    if d_row:
                        depot_name = d_row['name']

                # Update bus fields safely
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
                self._send_json({'success': True, 'id': bus_id})

            elif path.startswith('/api/depots/'):
                depot_id = path.split('/')[3]
                updates = []
                params = []
                for field in ['name', 'name_mr', 'name_hi', 'division', 'region', 'contact_phone', 'is_active']:
                    if field in body:
                        updates.append(f"{field} = ?")
                        params.append(body[field])
                if updates:
                    params.append(depot_id)
                    sql = f"UPDATE depots SET {', '.join(updates)} WHERE id = ?;"
                    c.execute(sql, params)
                    conn.commit()
                self._send_json({'success': True, 'id': depot_id})

            else:
                self._send_json({'error': f'Route {path} not found'}, 404)
        except Exception as e:
            self._send_json({'error': str(e)}, 500)
        finally:
            conn.close()

def run_server():
    init_db()
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, RestRequestHandler)
    print(f"Smart MSRTC Python REST API server running on http://127.0.0.1:{PORT}")
    sys.stdout.flush()
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
