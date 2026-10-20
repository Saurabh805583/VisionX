# Smart MSRTC — VisionX (Malkapur Bus Stand)

**Development Team:** VisionX  
**Demonstration Location:** Malkapur Bus Stand, Buldhana Division, Maharashtra, India  
**System Purpose:** Intelligent Bus Tracking, Multi-Depot Fleet Coordination, Deterministic Platform Bay Allocation, Multilingual Passenger Information Display (PID), and Automated Public Address (PA) Audio Announcements.  

> **Project & Research Disclosure:**  
> This platform is an academic research engineering prototype designed and built by the **VisionX** development team for university evaluation and transport technology review. VisionX is an independent engineering team and is **not** an official division, subsidiary, or government transport authority of MSRTC. Real operations do not fabricate government approval or claim physical PA integration without verified authorization.

---

## 1. System Architecture & Tech Stack

```
                                    +-----------------------------------------+
                                    |     Passenger Information Display       |
                                    |  (Projector / 1080p TV / Dual-Screen)  |
                                    |         Route: /passenger-display       |
                                    +--------------------+--------------------+
                                                         |
+--------------------------------------------------------+---------------------------------------+
|                                    React 19 + TypeScript Frontend                              |
| - Tailwind CSS v4 design system (Deep Navy #0f172a, White/Slate surfaces, Restrained Teal)     |
| - Multilingual Context (Marathi, Hindi, English) with instant reactive switching               |
| - Central REST API Client with 3-second non-overlapping polling & clean navigation teardown     |
| - Leaflet + OpenStreetMap with resilient offline / SVG schematic fallback                      |
| - Web Speech Synthesis + Web Audio API two-tone station chime (587.33 Hz & 440 Hz)             |
+--------------------------------------------------------+---------------------------------------+
                                                         | HTTP REST (port 3000 /api proxy)
+--------------------------------------------------------+---------------------------------------+
|                           Express Dev / Node Bridge (server.ts)                                |
| Spawns and supervises Python REST Backend (port 5050) & mounts Vite SPA middlewares            |
+--------------------------------------------------------+---------------------------------------+
                                                         | Localhost REST proxy
+--------------------------------------------------------+---------------------------------------+
|                       Python 3 + Flask / WSGI REST API Backend (backend/)                      |
| - Deterministic Rule-Based Platform Allocation Engine (Buffer checks, Corridor affinity)       |
| - Idempotency Guard & Event Deduplication (idempotency_key enforcement)                        |
| - GPS Telemetry Validator (freshness, minimum accuracy, multi-sample confirmation, cooldown)   |
| - Authenticated IoT Device Ingestion (RFID, GPS trackers, BLE, ESP32)                          |
+--------------------------------------------------------+---------------------------------------+
                                                         | PRAGMA foreign_keys = ON
+--------------------------------------------------------+---------------------------------------+
|                    Single Shared Persistent SQLite Database (smart_msrtc.db)                   |
| Tables: depots, buses, routes, trips, platforms, platform_assignments, location_records,       |
|         events, alerts, announcements, iot_devices, geofence_tracking_sessions, audit_logs     |
+--------------------------------------------------------+---------------------------------------+
```

---

## 2. Running Locally (Frontend & Flask Backend Together)

### Prerequisites
- Node.js 18+ (tested on Node.js 22+)
- Python 3.10+ with standard library `sqlite3`
- Optional: `pip install -r backend/requirements.txt` (Flask & Flask-CORS)

### Step 1: Install Frontend Dependencies
```bash
npm install
```

### Step 2: Run Full-Stack Development Server
```bash
npm run dev
```
This starts `server.ts` on port 3000, which automatically initializes `backend/smart_msrtc.db`, spawns the Python REST server on internal port 5050, and proxies all `/api/*` calls from the Vite dev server directly to Python.

### Step 3: Run Backend Tests
```bash
npm run test:backend
# or directly:
python3 backend/run_tests.py
```

---

## 3. Database Schema & Non-Destructive Migrations

All operational data persists in a single shared SQLite database: `backend/smart_msrtc.db`.
The `init_db()` routine in `backend/database.py` includes safe, non-destructive migration checks:
- **`depots` Table:** Manages registered operating depots across Maharashtra (Malkapur, Buldhana, Khamgaon, Akola, Jalgaon, Nagpur, Pune Swargate, Amravati).
- **`buses.depot_id` Column:** Safely migrated via `ALTER TABLE buses ADD COLUMN depot_id TEXT;` without resetting existing records.
- **`announcements.priority` Column:** Safely migrated via `ALTER TABLE announcements ADD COLUMN priority TEXT NOT NULL DEFAULT 'NORMAL';` with automatic fallback.

---

## 4. Multi-Depot Data Model & Bus Management

Malkapur Bus Stand services buses originating from multiple operating depots across Maharashtra. A bus operating at Malkapur is **never** automatically treated as owned by Malkapur Depot.

### Distinct Architectural Fields
1. **Operating / Home Depot (`buses.depot`, `buses.depot_id`):** The registered regional depot that owns and maintains the vehicle.
2. **Route Origin & Destination (`routes.origin`, `routes.destination`):** The operational corridor of the scheduled service.
3. **Current Terminal Station:** Malkapur Bus Stand (`MKR-MS`), Buldhana Division.
4. **Current Platform Assignment (`buses.current_platform_id`):** Physical terminal bay (Bays 1 to 4) currently occupied or reserved.
5. **Operational Source (`source`):** Clearly tagged as `SIMULATED`, `PHONE_GPS`, `MANUAL`, or `IOT_DEVICE`.

### Unrecorded Depot Status
If a vehicle's home depot is not verified in official records, it is explicitly stored as unrecorded and rendered in the UI as **“Depot not recorded”** (मराठी: **“नोंदणीकृत आगार नाही”** / हिंदी: **“दर्ज नहीं”**), preventing unverified assumptions.

---

## 5. Full Multilingual Support (Marathi, Hindi, English)

A global reactive `LanguageProvider` (`src/context/LanguageContext.tsx`) manages language state:
- **Supported Locales:** `mr-IN` (मराठी), `hi-IN` (हिंदी), `en-IN` (English).
- **Instant Reactivity:** Switching languages updates the entire UI immediately without page reload or loss of route/form state.
- **Persistence:** Selected language is stored in `localStorage` (`smart_msrtc_lang`).
- **Comprehensive Coverage:** Covers navigation, dashboard metrics, KPI cards, multi-depot filters, form fields, error banners, audit logs, and passenger display boards.

---

## 6. Large-Screen Projector & TV Passenger Display (`/passenger-display`)

The public passenger screen is designed as an independent route accessible on TV screens, external monitors, or projectors:
- **Independent Route:** Does not render administrative sidebars or headers.
- **16:9 Aspect Ratio Optimization:** Large typography, high-contrast palette (Deep Slate #020617 background with amber and teal accents), visible from 10+ meters.
- **Display Modes:**
  - **Standard Timetable Board:** Shows Trip Number, Bus Registration, Operating Depot, Destination, Scheduled Arrival & Departure, Platform Bay, and Live Operational Status.
  - **Announcement-Focused Display:** Displays high-priority announcements in massive Devanagari text alongside queue status.
- **Fullscreen Mode:** One-click toggle using browser Fullscreen API with graceful fallback.
- **Missing Information:** Renders **“माहिती उपलब्ध नाही”** / **“जानकारी उपलब्ध नहीं”** rather than fabricated platform assignments.

---

## 7. Mobile GPS Tracking & Browser Limitations

The mobile tracking view (`/mobile-gps`) is tailored for Android phone browsers:
- **Explicit Permission & Binding:** GPS tracking requires explicit user permission and confirmed operator association with a registered Bus ID and active Trip ID.
- **Stopping Telemetry:** Clicking “Stop Sharing Location” immediately halts browser watchers and prevents subsequent updates.
- **Browser Background Limitations:** Mobile browsers suspend background geolocation threads when the screen is locked or tabs are minimized. The interface clearly communicates this browser constraint.
- **Source Labeling:** Telemetry sent from a mobile browser is tagged as `PHONE_GPS` with accuracy in meters and freshness timestamp.

---

## 8. Geofence Arrival Detection & Anti-Conflict Rules

Arrival detection requires successive valid samples within the configured station geofence (default 1200m radius around Malkapur coordinates `20.8871, 76.2014`):
1. **Accuracy Threshold:** Rejects GPS samples with accuracy > 50m.
2. **Freshness Guard:** Discards GPS updates older than 60 seconds.
3. **Multi-Sample Confirmation:** First valid sample enters `ARRIVAL_CANDIDATE` status; arrival is only confirmed after 2 consecutive valid samples inside the geofence.
4. **Cooldown / Hysteresis:** A 15-minute cooldown window prevents duplicate entry/exit events near the geofence boundary.

---

## 9. Audio Announcements & PA Safety

- **Audio Playback:** Synthesized locally using the Web Speech API and Web Audio API two-tone chime.
- **Hardware Boundary:** Browser speech plays through computer/browser audio output. Physical station loudspeakers require authorized hardware wiring into an external amplifier.
- **Safety Rule:** An arrival is **never** announced as having a confirmed platform unless the deterministic platform allocation or supervisor override succeeded. Conflicts never generate false platform announcements.

---

## 10. Automated Tests Executed & Results

All 20 backend unit tests execute via standard library `unittest` in `backend/run_tests.py`:

```
test_authenticated_rfid_device_ingestion (test_device_adapter.TestDeviceAdapter) ... ok
test_unauthorized_device_rejected (test_device_adapter.TestDeviceAdapter) ... ok
test_idempotent_event_guard (test_duplicate_events.TestDuplicateEvents) ... ok
test_geofence_cooldown_prevents_duplicate_arrival (test_geofence_arrival.TestGeofenceArrival) ... ok
test_haversine_distance_calculation (test_geofence_arrival.TestGeofenceArrival) ... ok
test_low_accuracy_gps_does_not_trigger_arrival (test_geofence_arrival.TestGeofenceArrival) ... ok
test_multi_sample_confirmation_candidate_then_confirmed (test_geofence_arrival.TestGeofenceArrival) ... ok
test_reject_stale_gps_sample (test_geofence_arrival.TestGeofenceArrival) ... ok
test_depot_association_update (test_multi_depot.TestMultiDepotOperations) ... ok
test_depots_seeded_correctly (test_multi_depot.TestMultiDepotOperations) ... ok
test_multi_depot_buses_allocate_platforms_at_malkapur (test_multi_depot.TestMultiDepotOperations) ... ok
test_announcement_generation_and_persistence (test_persistence_announcements.TestPersistenceAnnouncements) ... ok
test_nagpur_trip_allocates_to_platform_2 (test_platform_allocation.TestPlatformAllocation) ... ok
test_occupied_platform_is_skipped (test_platform_allocation.TestPlatformAllocation) ... ok
test_platform_assignment_atomic_commit (test_platform_allocation.TestPlatformAllocation) ... ok
test_pune_express_allocates_to_platform_1 (test_platform_allocation.TestPlatformAllocation) ... ok
test_conflict_does_not_announce_unconfirmed_platform (test_platform_change_announcement.TestPlatformChangeAnnouncement) ... ok
test_platform_change_creates_urgent_announcement (test_platform_change_announcement.TestPlatformChangeAnnouncement) ... ok
test_all_platforms_occupied_triggers_conflict_alert (test_platform_conflicts.TestPlatformConflicts) ... ok
test_staff_manual_override_resolves_conflict (test_platform_conflicts.TestPlatformConflicts) ... ok

----------------------------------------------------------------------
Ran 20 tests in 0.257s
OK - All Smart MSRTC backend tests passed successfully!
```

- **Frontend Compilation:** `compile_applet` passed (`npm run build`).
- **Frontend Type Safety:** `lint_applet` passed (`tsc --noEmit` clean with 0 errors).
- **Responsive Layout Verification:** Verified at standard desktop resolutions (1920x1080, 1366x768), tablets (768px, 1024px), and mobile viewports (360px, 390px). Contained scrollbars prevent entire-page horizontal overflow.
