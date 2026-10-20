# Smart MSRTC — VisionX (Malkapur Bus Stand)
## Public Transport Coordination, GPS Telemetry, IoT & Passenger Information System

**Team:** VisionX  
**Station:** Malkapur Bus Stand, Buldhana Division, Maharashtra, India  
**System Purpose:** Intelligent Bus Tracking, Platform Coordination, Mobile GPS Geofencing, IoT Device Adapters, Multilingual PA Announcements & High-Contrast Passenger Information Displays.

---

## 1. System Architecture

```
[ Driver Mobile Browser: navigator.geolocation ]       [ IoT Gate Readers / GPS / ANPR ]
                    │                                                │
                    │ PHONE_GPS (±Accuracy, Freshness)              │ X-Device-Token Auth
                    ▼                                                ▼
         ┌──────────────────────────────────────────────────────────────┐
         │             Backend REST API (Python 3 + Flask / WSGI)        │
         └──────────────────────────────┬───────────────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
  [ Geofence Service ]        [ Platform Coordination ]     [ PA Audio Engine ]
  (Haversine Distance,        (Deterministic Corridor Bay,  (Marathi, Hindi, EN,
   Multi-Sample Confirm,       10m Clearance Buffer,         Urgent Overrides,
   Cooldown Hysteresis)        Bottleneck Arbitration)       Station Chimes)
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        ▼
                      [ SQLite Database: smart_msrtc.db ]
                                        ▲
                                        │ Polling ~3s
                      [ Public Station Displays / Web UI ]
                      (PID Screen, Operations Console, Map)
```

---

## 2. Mobile GPS Tracking & Geofence Arrival Detection

### Association Requirement
- The driver or conductor's phone location is **never** used as a bus position unless explicitly associated with an active fleet bus ID (`bus_id`) and scheduled service (`trip_id`).
- Location is captured using the browser `navigator.geolocation.watchPosition` API with `{ enableHighAccuracy: true }`.
- Broadcast is initiated only when the operator clicks **"Start Sharing Location"** and immediately halts when **"Stop Sharing Location"** is pressed.

### Browser Background Limitations Notice
- Standard mobile web browsers (e.g. Android Chrome) restrict or throttle background timer execution and location polling when the screen sleeps or the tab is minimized.
- Drivers are explicitly advised to keep the browser tab active in a vehicle phone mount while on active duty.

### Multi-Sample Geofence Confirmation Logic
1. **Configurable Geofence**: Center (`station_lat`, `station_lng`) and radius (`geofence_arrival_radius_meters`, default `1200m`).
2. **Accuracy Rejection**: Samples with accuracy worse than `gps_accuracy_threshold_meters` (default `50m`) are accepted for telemetry display but **do not trigger geofence arrival increments**.
3. **Stale Data Rejection**: Coordinates older than `gps_stale_threshold_seconds` (default `60s`) are rejected with `STALE_GPS_SAMPLE`.
4. **Candidate vs. Confirmed Arrival**:
   - Sample 1 inside radius: Flagged as `ARRIVAL_CANDIDATE` (does **not** prematurely assign a platform bay or trigger audio announcements).
   - Sample 2 inside radius (consecutive): Confirmed as `BUS_ARRIVED`. Evaluates deterministic rule engine, locks platform bay, and queues multilingual announcement.
5. **Cooldown Hysteresis**:
   - Once confirmed, a `geofence_cooldown_minutes` window (default `15m`) prevents boundary flutter or duplicate arrival triggers.

---

## 3. IoT Device Integration Architecture

Future-ready hardware adapters are supported without claiming nonexistent physical installations:
- **Adapter Types**: `GPS_TRACKER`, `ESP32_TELEMATICS`, `RFID_GATE_READER`, `BLE_BEACON`, `ANPR_CAMERA`.
- **Authentication**: Devices must authenticate using an authorized secret token in the `X-Device-Token` HTTP header.
- **Security Guard**: Unauthenticated calls to `POST /api/devices/ingest` are rejected with `401 Unauthorized`.
- **Testing**: The IoT management console includes authenticated simulator buttons to test gate ingress and bay prober events.

---

## 4. Central Announcement Control Centre

### Audio Playback & Priorities
- **Speech Synthesis**: Browser Web Speech API (`SpeechSynthesisUtterance`) with automatic voice matching for Marathi (`mr-IN`), Hindi (`hi-IN`), and Indian English (`en-IN`).
- **Station Chime**: Synthesized 2-tone pleasant pre-announcement chime (D5: 587Hz $\to$ A4: 440Hz) generated via Web Audio API.
- **Queue Controls**: Start / Pause Queue, Stop Speech, Replay Last Announcement, Mute / Unmute, Speech Rate Slider.
- **Priorities**:
  - `URGENT`: Platform changes and emergency advisories (cannot be preempted by normal arrivals).
  - `HIGH`: Late departures and clearance notices.
  - `NORMAL`: Standard arrival and departure announcements.

### Standard Templates
1. **Arrival at Platform**:
   - *Marathi:* "कृपया लक्ष द्या. [Destination] कडे जाणारी बस क्रमांक [Bus ID] प्लॅटफॉर्म क्रमांक [Platform] वर येत आहे."
   - *Hindi:* "कृपया ध्यान दें. [Destination] जाने वाली बस क्रमांक [Bus ID] प्लेटफॉर्म क्रमांक [Platform] पर आ रही है."
   - *English:* "May I have your attention please. Bus number [Bus ID] bound for [Destination] is arriving on Platform [Platform]."
2. **Platform Change (Urgent)**:
   - *Marathi:* "महत्त्वाची सूचना. [Destination] कडे जाणाऱ्या बस क्रमांक [Bus ID] चा प्लॅटफॉर्म बदलण्यात आला आहे. नवीन प्लॅटफॉर्म क्रमांक [Platform] आहे."
3. **Delay Advisory**:
   - *Marathi:* "प्रवाशांसाठी सूचना. [Destination] कडे जाणाऱ्या बस क्रमांक [Bus ID] ला विलंब होत आहे. कृपया पुढील सूचनेकडे लक्ष द्या."
4. **Departure Notice**:
   - *Marathi:* "कृपया लक्ष द्या. [Destination] कडे जाणारी बस क्रमांक [Bus ID] प्लॅटफॉर्म क्रमांक [Platform] वरून रवाना होत आहे."

### Station Physical PA Amplifier Connection Workflow
1. Connect terminal 3.5mm line-out (or USB Audio Interface) to station master line mixer.
2. Route mixer output to 100V line distribution amplifier driving platform horn speaker clusters.
3. Audio engine automatically ducks audio and precedes every speech packet with the station chime.

---

## 5. Passenger Information Display (PID) — Separate Public Screen

Accessible at route `/passenger-display`:
- Full-screen high-contrast display designed for station LED monitors, TVs, or projectors.
- **Layout A**: Standard High-Contrast Timetable (Trip, Bus ID, Destination, Arrival/Departure, Platform Bay, Status).
- **Layout B**: Announcement-Focused Display with prominent large Marathi announcement text.
- Missing values cleanly display "माहिती उपलब्ध नाही".
- Toggleable clean presentation mode (hides developer/status watermark for audience demos).

---

## 6. Automated Unit Tests

All 17 end-to-end tests are passing with 100% success:

```bash
python3 backend/run_tests.py
```

### Verified Test Cases:
1. `test_authenticated_rfid_device_ingestion`: IoT RFID transponder scan routes to canonical arrival.
2. `test_unauthorized_device_rejected`: Unauthenticated hardware requests rejected with 401.
3. `test_idempotent_event_guard`: Duplicate arrival events safely ignored.
4. `test_haversine_distance_calculation`: Geodesic coordinate distance verification.
5. `test_reject_stale_gps_sample`: Rejection of stale GPS updates (>60s).
6. `test_low_accuracy_gps_does_not_trigger_arrival`: Bad accuracy (>50m) halts geofence confirmation.
7. `test_multi_sample_confirmation_candidate_then_confirmed`: Sample 1 records candidate; Sample 2 confirms arrival.
8. `test_geofence_cooldown_prevents_duplicate_arrival`: Cooldown window suppresses redundant arrivals.
9. `test_platform_change_creates_urgent_announcement`: Platform reassignment enqueues URGENT announcement.
10. `test_conflict_does_not_announce_unconfirmed_platform`: Platform bottlenecks suppress false announcements.
11. `test_pune_express_allocates_to_platform_1`: Deterministic Pune corridor matching.
12. `test_nagpur_trip_allocates_to_platform_2`: Deterministic Nagpur corridor matching.
13. `test_occupied_platform_is_skipped`: Occupied bays excluded by rule engine.
14. `test_platform_assignment_atomic_commit`: Atomic platform locking and trip status update.
15. `test_all_platforms_occupied_triggers_conflict_alert`: Full bays trigger supervisor intervention.
16. `test_staff_manual_override_resolves_conflict`: Manual override resolves bottleneck alert.
17. `test_announcement_generation_and_persistence`: Cross-connection SQLite disk persistence.
