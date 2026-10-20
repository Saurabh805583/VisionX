"""
Smart MSRTC - VisionX
Database Initialization and Persistence Layer
Uses standard library sqlite3 for single shared persistent database.
"""

import os
import sqlite3
import json
from datetime import datetime, timezone, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'smart_msrtc.db')

def get_db_connection(db_path=None):
    """Returns a SQLite connection with row_factory set to Row."""
    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path=None, force_reseed=False):
    """Initializes tables and seeds initial data if tables do not exist or force_reseed is True."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buses (
        id TEXT PRIMARY KEY,
        bus_number TEXT NOT NULL UNIQUE,
        depot TEXT NOT NULL,
        bus_type TEXT NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 45,
        current_status TEXT NOT NULL DEFAULT 'SCHEDULED',
        live_lat REAL,
        live_lng REAL,
        speed_kmh REAL DEFAULT 0,
        heading REAL DEFAULT 0,
        current_platform_id INTEGER,
        last_seen TEXT,
        source TEXT NOT NULL DEFAULT 'SIMULATED',
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        route_code TEXT NOT NULL UNIQUE,
        route_name TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        distance_km REAL NOT NULL,
        travel_time_mins INTEGER NOT NULL,
        via_stops_json TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        trip_number TEXT NOT NULL UNIQUE,
        bus_id TEXT NOT NULL,
        route_id TEXT NOT NULL,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        scheduled_arrival TEXT NOT NULL,
        scheduled_departure TEXT NOT NULL,
        estimated_arrival TEXT,
        estimated_departure TEXT,
        actual_arrival TEXT,
        actual_departure TEXT,
        current_platform_id INTEGER,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        delay_minutes INTEGER NOT NULL DEFAULT 0,
        passenger_load INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'SIMULATED',
        last_updated TEXT NOT NULL,
        FOREIGN KEY (bus_id) REFERENCES buses(id),
        FOREIGN KEY (route_id) REFERENCES routes(id)
    );

    CREATE TABLE IF NOT EXISTS platforms (
        id INTEGER PRIMARY KEY,
        platform_number INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'FREE',
        assigned_trip_id TEXT,
        length_meters INTEGER NOT NULL DEFAULT 15,
        max_capacity INTEGER NOT NULL DEFAULT 1,
        allows_express INTEGER NOT NULL DEFAULT 1,
        preferred_corridor TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS platform_assignments (
        id TEXT PRIMARY KEY,
        platform_id INTEGER NOT NULL,
        trip_id TEXT NOT NULL,
        bus_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        departure_expected TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        allocation_mode TEXT NOT NULL DEFAULT 'AUTOMATIC',
        allocation_reason TEXT NOT NULL,
        assigned_by TEXT NOT NULL DEFAULT 'ENGINE',
        FOREIGN KEY (platform_id) REFERENCES platforms(id),
        FOREIGN KEY (trip_id) REFERENCES trips(id),
        FOREIGN KEY (bus_id) REFERENCES buses(id)
    );

    CREATE TABLE IF NOT EXISTS location_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bus_id TEXT NOT NULL,
        trip_id TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        speed_kmh REAL DEFAULT 0,
        heading REAL DEFAULT 0,
        accuracy_meters REAL DEFAULT 5,
        source TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        FOREIGN KEY (bus_id) REFERENCES buses(id)
    );

    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        event_uuid TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        bus_id TEXT NOT NULL,
        trip_id TEXT,
        platform_id INTEGER,
        timestamp TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        idempotency_key TEXT UNIQUE,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'WARNING',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        trip_id TEXT,
        platform_id INTEGER,
        is_resolved INTEGER NOT NULL DEFAULT 0,
        resolved_by TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        announcement_type TEXT NOT NULL,
        trip_id TEXT NOT NULL,
        platform_id INTEGER,
        bus_id TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'mr-IN',
        announcement_text TEXT NOT NULL,
        phonetics_text TEXT,
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        status TEXT NOT NULL DEFAULT 'QUEUED',
        play_count INTEGER NOT NULL DEFAULT 0,
        last_played_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (trip_id) REFERENCES trips(id),
        FOREIGN KEY (bus_id) REFERENCES buses(id)
    );

    CREATE TABLE IF NOT EXISTS iot_devices (
        id TEXT PRIMARY KEY,
        device_code TEXT NOT NULL UNIQUE,
        device_type TEXT NOT NULL,
        name TEXT NOT NULL,
        assigned_bus_id TEXT,
        assigned_platform_id INTEGER,
        status TEXT NOT NULL DEFAULT 'REGISTERED',
        auth_token TEXT NOT NULL,
        last_heartbeat TEXT,
        config_json TEXT NOT NULL DEFAULT '{}',
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS geofence_tracking_sessions (
        trip_id TEXT PRIMARY KEY,
        bus_id TEXT NOT NULL,
        consecutive_inside_samples INTEGER NOT NULL DEFAULT 0,
        last_sample_lat REAL,
        last_sample_lng REAL,
        last_sample_accuracy REAL,
        last_sample_time TEXT,
        distance_to_station_meters REAL,
        status TEXT NOT NULL DEFAULT 'OUTSIDE',
        arrival_confirmed_at TEXT,
        cooldown_until TEXT,
        last_diagnostic TEXT,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS depots (
        id TEXT PRIMARY KEY,
        depot_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        name_mr TEXT,
        name_hi TEXT,
        division TEXT NOT NULL,
        region TEXT,
        contact_phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()

    # Automatic schema migration for existing persistent databases
    cursor.execute("PRAGMA table_info(announcements);")
    ann_columns = {col['name'] for col in cursor.fetchall()}
    if 'priority' not in ann_columns:
        cursor.execute("ALTER TABLE announcements ADD COLUMN priority TEXT NOT NULL DEFAULT 'NORMAL';")
        conn.commit()

    cursor.execute("PRAGMA table_info(buses);")
    bus_columns = {col['name'] for col in cursor.fetchall()}
    if 'depot_id' not in bus_columns:
        cursor.execute("ALTER TABLE buses ADD COLUMN depot_id TEXT;")
        conn.commit()

    # Seed default depots if empty
    cursor.execute("SELECT COUNT(*) as count FROM depots;")
    depot_count = cursor.fetchone()['count']
    if depot_count == 0:
        now_iso = datetime.now(timezone.utc).isoformat()
        initial_depots = [
            ('DEPOT-MKR', 'MKR-01', 'Malkapur Depot', 'मल्कापूर आगार', 'मलकापुर डिपो', 'Buldhana Division', 'Amravati Region', '07267-222345', 1, now_iso),
            ('DEPOT-BLD', 'BLD-02', 'Buldhana Depot', 'बुलढाणा आगार', 'बुलढाणा डिपो', 'Buldhana Division', 'Amravati Region', '07262-242311', 1, now_iso),
            ('DEPOT-KHM', 'KHM-03', 'Khamgaon Depot', 'खामगाव आगार', 'खामगांव डिपो', 'Buldhana Division', 'Amravati Region', '07263-252110', 1, now_iso),
            ('DEPOT-AKL', 'AKL-04', 'Akola Depot', 'अकोला आगार', 'अकोला डिपो', 'Akola Division', 'Amravati Region', '0724-2434311', 1, now_iso),
            ('DEPOT-JLG', 'JLG-05', 'Jalgaon Depot', 'जळगाव आगार', 'जलगांव डिपो', 'Jalgaon Division', 'Nashik Region', '0257-2225511', 1, now_iso),
            ('DEPOT-NGP', 'NGP-06', 'Nagpur Ganeshpeth Depot', 'नागपूर गणेशपेठ आगार', 'नागपुर गणेशपेठ डिपो', 'Nagpur Division', 'Vidarbha Region', '0712-2726111', 1, now_iso),
            ('DEPOT-PUN', 'PUN-07', 'Pune Swargate Depot', 'पुणे स्वारगेट आगार', 'पुणे स्वारगेट डिपो', 'Pune Division', 'Western Maharashtra', '020-24440000', 1, now_iso),
            ('DEPOT-AMR', 'AMR-08', 'Amravati Central Depot', 'अमरावती मध्यवर्ती आगार', 'अमरावती सेंट्रल डिपो', 'Amravati Division', 'Amravati Region', '0721-2662211', 1, now_iso),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO depots (id, depot_code, name, name_mr, name_hi, division, region, contact_phone, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, initial_depots)
        conn.commit()

        # Associate existing buses with corresponding depot_id if not set
        cursor.execute("UPDATE buses SET depot_id = 'DEPOT-MKR' WHERE (depot_id IS NULL OR depot_id = '') AND depot LIKE '%Malkapur%';")
        cursor.execute("UPDATE buses SET depot_id = 'DEPOT-AKL' WHERE (depot_id IS NULL OR depot_id = '') AND depot LIKE '%Akola%';")
        cursor.execute("UPDATE buses SET depot_id = 'DEPOT-BLD' WHERE (depot_id IS NULL OR depot_id = '') AND depot LIKE '%Buldhana%';")
        cursor.execute("UPDATE buses SET depot_id = 'DEPOT-NGP' WHERE (depot_id IS NULL OR depot_id = '') AND depot LIKE '%Nagpur%';")
        conn.commit()

    # Check if seed data exists
    cursor.execute("SELECT COUNT(*) as count FROM platforms;")
    platform_count = cursor.fetchone()['count']

    if platform_count == 0 or force_reseed:
        if force_reseed:
            cursor.execute("DELETE FROM announcements;")
            cursor.execute("DELETE FROM alerts;")
            cursor.execute("DELETE FROM platform_assignments;")
            cursor.execute("DELETE FROM location_records;")
            cursor.execute("DELETE FROM events;")
            cursor.execute("DELETE FROM trips;")
            cursor.execute("DELETE FROM routes;")
            cursor.execute("DELETE FROM buses;")
            cursor.execute("DELETE FROM platforms;")
            cursor.execute("DELETE FROM audit_logs;")
            cursor.execute("DELETE FROM system_settings;")
            conn.commit()

        _seed_data(conn)

    conn.close()

def _seed_data(conn):
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    # System Settings
    settings = [
        ('station_name', 'Malkapur Bus Stand (मलकापूर मध्यवर्ती बस स्थानक)'),
        ('station_code', 'MKR-MS'),
        ('district', 'Buldhana'),
        ('division', 'Buldhana Division, MSRTC'),
        ('station_lat', '20.8871'),
        ('station_lng', '76.2014'),
        ('geofence_arrival_radius_km', '1.5'),
        ('geofence_arrival_radius_meters', '1200'),
        ('geofence_approach_radius_km', '5.0'),
        ('gps_accuracy_threshold_meters', '50'),
        ('geofence_required_consecutive_samples', '2'),
        ('geofence_cooldown_minutes', '15'),
        ('gps_stale_threshold_seconds', '60'),
        ('gps_update_interval_seconds', '4'),
        ('buffer_time_minutes', '10'),
        ('auto_assign_platforms', '1'),
        ('auto_announce', '1'),
        ('announcement_queue_paused', '0'),
        ('default_speech_rate', '0.9'),
        ('active_language', 'mr-IN'),
        ('station_audio_output_mode', 'BROWSER_DAC_LINE_OUT'),
        ('data_environment', 'OPERATIONAL_AUTHENTIC')
    ]
    for k, v in settings:
        cursor.execute("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?);", (k, v, now_iso))

    # Optional IoT Devices Registry (Adapters)
    iot_devices = [
        ('DEV-RFID-01', 'RFID-GATE-MKR-01', 'RFID_GATE_READER', 'Malkapur Ingress RFID Scanner (Gate 1)', None, None, 'ONLINE', 'TOKEN-SEC-RFID-9901', now_iso, json.dumps({'antenna_power_dbm': 26, 'gate_lane': 'NH53 Entry Lane'}), 1, 'Scans windshield FASTag/RFID transponders on entry', now_iso),
        ('DEV-GPS-101', 'AIS140-BUS-101', 'GPS_TRACKER', 'AIS-140 Onboard Telematics (MH-28-BL-4521)', 'BUS-MKR-101', None, 'ONLINE', 'TOKEN-SEC-GPS-1402', now_iso, json.dumps({'protocol': 'AIS-140-V2', 'satellite_constellation': 'IRNSS/GPS'}), 1, 'Standard MSRTC government telematics device', now_iso),
        ('DEV-BLE-P1', 'BLE-BAY-P1', 'BLE_BEACON', 'Platform 1 Micro-Location Beacon (Pune Bay)', None, 1, 'ONLINE', 'TOKEN-SEC-BLE-0001', now_iso, json.dumps({'tx_power': -4, 'interval_ms': 300, 'uuid': 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0'}), 1, 'Platform 1 bay docking verification', now_iso),
        ('DEV-ANPR-01', 'ANPR-GATE-01', 'ANPR_CAMERA', 'Optical License Plate Scanner (Malkapur Highway Gate)', None, None, 'STANDBY', 'TOKEN-SEC-ANPR-8820', now_iso, json.dumps({'resolution': '1080p', 'detection_threshold': 0.88}), 1, 'Automatic number plate recognition backup camera', now_iso),
        ('DEV-ESP32-01', 'ESP32-SENSOR-BAY3', 'ESP32_TELEMATICS', 'Ultrasonic Bay Clearance Prober (Platform 3)', None, 3, 'ONLINE', 'TOKEN-SEC-ESP-3301', now_iso, json.dumps({'sensor_type': 'HC-SR04', 'range_cm': 400}), 1, 'Physical bay ultrasonic occupancy prober', now_iso)
    ]
    for d in iot_devices:
        cursor.execute("""
        INSERT OR REPLACE INTO iot_devices (id, device_code, device_type, name, assigned_bus_id, assigned_platform_id, status, auth_token, last_heartbeat, config_json, is_active, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, d)

    # 4 Platforms for Malkapur Bus Stand
    platforms = [
        (1, 1, 'Platform 1 (फलाट १ — पुणे/नाशिक/मुंबई एक्सप्रेस)', 'FREE', None, 18, 1, 1, 'Pune, Nashik & Mumbai Corridor (Shivshahi/Express)', 1, 'Equipped with digital PID board and PA speaker cluster'),
        (2, 2, 'Platform 2 (फलाट २ — नागपूर/अमरावती/अकोला)', 'FREE', None, 18, 1, 1, 'Nagpur, Amravati & Akola Corridor (Eastbound NH53 Express)', 1, 'Equipped with digital PID board and PA speaker cluster'),
        (3, 3, 'Platform 3 (फलाट ३ — बुलढाणा/खामगाव/जळगाव/भुसावळ)', 'FREE', None, 16, 1, 0, 'Buldhana, Khamgaon & Jalgaon Regional Corridor', 1, 'Ordinary Parivahan and Asiad semi-luxury services'),
        (4, 4, 'Platform 4 (फलाट ४ — शेगाव/नांदुरा/ग्रामीण सेवा)', 'FREE', None, 15, 1, 0, 'Shegaon Gajanan Mandir, Nandura & Rural Feeder Corridor', 1, 'Short turnaround pilgrim shuttle bay')
    ]
    for p in platforms:
        cursor.execute("""
        INSERT OR REPLACE INTO platforms (id, platform_number, name, status, assigned_trip_id, length_meters, max_capacity, allows_express, preferred_corridor, is_active, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, p)

    # Import authentic real data
    try:
        from backend.real_routes_data import REAL_DEPOTS, REAL_ROUTES, REAL_BUSES, generate_real_trips
    except ImportError:
        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from backend.real_routes_data import REAL_DEPOTS, REAL_ROUTES, REAL_BUSES, generate_real_trips

    # Seed Depots
    for d in REAL_DEPOTS:
        cursor.execute("""
        INSERT OR REPLACE INTO depots (id, depot_code, name, name_mr, name_hi, division, region, contact_phone, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
        """, (d['id'], d['depot_code'], d['name'], d['name_mr'], d['name_hi'], d['division'], d['region'], d['contact_phone'], now_iso))

    # Seed Routes
    for r in REAL_ROUTES:
        cursor.execute("""
        INSERT OR REPLACE INTO routes (id, route_code, route_name, origin, destination, distance_km, travel_time_mins, via_stops_json, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);
        """, (r['id'], r['route_code'], r['route_name'], r['origin'], r['destination'], r['distance_km'], r['travel_time_mins'], json.dumps(r['via_stops'])))

    # Seed Buses
    for b in REAL_BUSES:
        cursor.execute("""
        INSERT OR REPLACE INTO buses (id, bus_number, depot, depot_id, bus_type, capacity, current_status, live_lat, live_lng, speed_kmh, heading, current_platform_id, last_seen, source, notes, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MSRTC_GPS', ?, 1);
        """, (
            b['id'], b['bus_number'], b['depot'], b['depot_id'], b['bus_type'], b['capacity'],
            b['status'], b['lat'], b['lng'], b['speed'], 90.0,
            3 if b['id'] == 'BUS-BLD-103' else None, now_iso, b['notes']
        ))

    # Seed Trips
    real_trips = generate_real_trips()
    for t in real_trips:
        cursor.execute("""
        INSERT OR REPLACE INTO trips (id, trip_number, bus_id, route_id, origin, destination, scheduled_arrival, scheduled_departure, estimated_arrival, estimated_departure, actual_arrival, actual_departure, current_platform_id, status, delay_minutes, passenger_load, source, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            t['id'], t['trip_number'], t['bus_id'], t['route_id'], t['origin'], t['destination'],
            t['scheduled_arrival'], t['scheduled_departure'], t['estimated_arrival'], t['estimated_departure'],
            t['actual_arrival'], t['actual_departure'], t['current_platform_id'], t['status'],
            t['delay_minutes'], t['passenger_load'], t['source'], now_iso
        ))

    # Set platform 3 as currently occupied by Buldhana bus TRIP-903
    cursor.execute("UPDATE platforms SET status = 'OCCUPIED', assigned_trip_id = 'TRIP-903' WHERE id = 3;")

    # Initial Assignment for TRIP-903
    t3_dep = [t['scheduled_departure'] for t in real_trips if t['id'] == 'TRIP-903'][0]
    cursor.execute("""
    INSERT INTO platform_assignments (id, platform_id, trip_id, bus_id, assigned_at, departure_expected, status, allocation_mode, allocation_reason, assigned_by)
    VALUES ('ASSIGN-001', 3, 'TRIP-903', 'BUS-103', ?, ?, 'ACTIVE', 'AUTOMATIC', 'Platform 3 matches Buldhana regional corridor with zero conflict', 'ENGINE');
    """, (now_iso, t3_dep))

    # Initial Announcement for Buldhana departure
    mr_text = "लक्ष द्या! मलकापूर येथून बुलढाणा जाणारी बस क्रमांक MH-28-BQ-4310 फलाट क्रमांक ३ वर उभी आहे. प्रवाशांनी कृपया चढण्याची नोंद घ्यावी."
    en_text = "May I have your attention please. Bus number MH-28-BQ-4310 for Buldhana Central is currently stationed at Platform 3."
    cursor.execute("""
    INSERT INTO announcements (id, announcement_type, trip_id, platform_id, bus_id, language, announcement_text, phonetics_text, priority, status, play_count, created_at)
    VALUES ('ANN-001', 'BOARDING', 'TRIP-903', 3, 'BUS-103', 'mr-IN', ?, ?, 'NORMAL', 'COMPLETED', 1, ?);
    """, (mr_text, mr_text, now_iso))

    # Audit log
    cursor.execute("""
    INSERT INTO audit_logs (action, entity_type, entity_id, actor, details_json, created_at)
    VALUES ('INITIALIZE_STATION', 'SYSTEM', 'MKR-MS', 'SYSTEM_BOOTSTRAP', ?, ?);
    """, (json.dumps({'message': 'Malkapur Station authentic real operational timetable initialized with 12 depots, 12 routes, 12 buses and 10 trips'}), now_iso))

    conn.commit()
