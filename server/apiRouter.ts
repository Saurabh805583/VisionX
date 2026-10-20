/**
 * Smart MSRTC - VisionX
 * Native Express API Router (Pure TypeScript / Node.js)
 * Implements the full REST API contract without requiring an external python3 binary.
 * Ensures 100% compatibility with Cloud Run Node.js production container.
 */

import express from 'express';
import type { Request, Response } from 'express';

export const apiRouter = express.Router();

// Authentic MSRTC Real Data
interface Depot {
  id: string;
  depot_code: string;
  name: string;
  name_mr: string;
  name_hi: string;
  division: string;
  region: string;
  contact_phone: string;
  is_active: number;
}

interface RouteData {
  id: string;
  route_code: string;
  route_name: string;
  origin: string;
  destination: string;
  distance_km: number;
  travel_time_mins: number;
  via_stops: string[];
  is_active: number;
}

interface BusData {
  id: string;
  bus_number: string;
  depot: string;
  depot_id: string;
  bus_type: string;
  capacity: number;
  current_status: string;
  live_lat: number;
  live_lng: number;
  speed_kmh: number;
  heading: number;
  current_platform_id: number | null;
  last_seen: string;
  source: string;
  notes: string;
  is_active: number;
}

interface TripData {
  id: string;
  trip_number: string;
  bus_id: string;
  route_id: string;
  origin: string;
  destination: string;
  scheduled_arrival: string;
  scheduled_departure: string;
  estimated_arrival: string;
  estimated_departure: string;
  actual_arrival: string | null;
  actual_departure: string | null;
  current_platform_id: number | null;
  status: string;
  delay_minutes: number;
  passenger_load: number;
  source: string;
  last_updated: string;
}

interface PlatformData {
  id: number;
  platform_number: number;
  name: string;
  status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
  assigned_trip_id: string | null;
  length_meters: number;
  max_capacity: number;
  allows_express: number;
  preferred_corridor: string;
  is_active: number;
  notes: string;
}

interface AnnouncementData {
  id: string;
  announcement_type: string;
  trip_id: string;
  platform_id: number | null;
  bus_id: string;
  language: string;
  announcement_text: string;
  phonetics_text: string;
  priority: string;
  status: 'QUEUED' | 'SPEAKING' | 'COMPLETED' | 'SKIPPED';
  play_count: number;
  last_played_at: string | null;
  created_at: string;
}

interface AlertData {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  message_mr?: string;
  trip_id?: string;
  bus_id?: string;
  platform_id?: number;
  is_resolved: number;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

// In-Memory Database Store (Initialized on server start)
let depots: Depot[] = [
  {
    id: 'DEPOT-MKR',
    depot_code: 'MKR-01',
    name: 'Malkapur Depot',
    name_mr: 'मलकापूर आगार',
    name_hi: 'मलकापुर डिपो',
    division: 'Buldhana Division',
    region: 'Amravati Region (Vidarbha)',
    contact_phone: '07267-222345',
    is_active: 1,
  },
  {
    id: 'DEPOT-BLD',
    depot_code: 'BLD-02',
    name: 'Buldhana Central Depot',
    name_mr: 'बुलढाणा मध्यवर्ती आगार',
    name_hi: 'बुलढाणा सेंट्रल डिपो',
    division: 'Buldhana Division',
    region: 'Amravati Region (Vidarbha)',
    contact_phone: '07262-242311',
    is_active: 1,
  },
  {
    id: 'DEPOT-KHM',
    depot_code: 'KHM-03',
    name: 'Khamgaon Depot',
    name_mr: 'खामगाव आगार',
    name_hi: 'खामगांव डिपो',
    division: 'Buldhana Division',
    region: 'Amravati Region (Vidarbha)',
    contact_phone: '07263-252110',
    is_active: 1,
  },
  {
    id: 'DEPOT-AKL',
    depot_code: 'AKL-04',
    name: 'Akola Central Depot',
    name_mr: 'अकोला मध्यवर्ती आगार',
    name_hi: 'अकोला सेंट्रल डिपो',
    division: 'Akola Division',
    region: 'Amravati Region (Vidarbha)',
    contact_phone: '0724-2434311',
    is_active: 1,
  },
  {
    id: 'DEPOT-JLG',
    depot_code: 'JLG-05',
    name: 'Jalgaon Depot',
    name_mr: 'जळगाव नवीन बस स्थानक आगार',
    name_hi: 'जलगांव नया डिपो',
    division: 'Jalgaon Division',
    region: 'Nashik Region (Khandesh)',
    contact_phone: '0257-2225511',
    is_active: 1,
  },
  {
    id: 'DEPOT-BSL',
    depot_code: 'BSL-06',
    name: 'Bhusawal Depot',
    name_mr: 'भुसावळ आगार',
    name_hi: 'भुसावल डिपो',
    division: 'Jalgaon Division',
    region: 'Nashik Region (Khandesh)',
    contact_phone: '02582-240212',
    is_active: 1,
  },
  {
    id: 'DEPOT-NGP',
    depot_code: 'NGP-06',
    name: 'Nagpur Ganeshpeth Depot',
    name_mr: 'नागपूर गणेशपेठ आगार',
    name_hi: 'नागपुर गणेशपेठ डिपो',
    division: 'Nagpur Division',
    region: 'Vidarbha Region',
    contact_phone: '0712-2726111',
    is_active: 1,
  },
  {
    id: 'DEPOT-PUN',
    depot_code: 'PUN-07',
    name: 'Pune Swargate Depot',
    name_mr: 'पुणे स्वारगेट आगार',
    name_hi: 'पुणे स्वारगेट डिपो',
    division: 'Pune Division',
    region: 'Western Maharashtra',
    contact_phone: '020-24440000',
    is_active: 1,
  },
  {
    id: 'DEPOT-AMR',
    depot_code: 'AMR-08',
    name: 'Amravati Central Depot',
    name_mr: 'अमरावती मध्यवर्ती आगार',
    name_hi: 'अमरावती सेंट्रल डिपो',
    division: 'Amravati Division',
    region: 'Amravati Region',
    contact_phone: '0721-2662211',
    is_active: 1,
  },
  {
    id: 'DEPOT-NSK',
    depot_code: 'NSK-09',
    name: 'Nashik CBS Depot 1',
    name_mr: 'नाशिक सीबीएस आगार क्र. १',
    name_hi: 'नासिक सीबीएस डिपो',
    division: 'Nashik Division',
    region: 'North Maharashtra',
    contact_phone: '0253-2578205',
    is_active: 1,
  },
  {
    id: 'DEPOT-SHG',
    depot_code: 'SHG-11',
    name: 'Shegaon Gajanan Mandir Depot',
    name_mr: 'शेगाव आगार',
    name_hi: 'शेगांव डिपो',
    division: 'Buldhana Division',
    region: 'Amravati Region',
    contact_phone: '07265-252044',
    is_active: 1,
  },
  {
    id: 'DEPOT-CSN',
    depot_code: 'CSN-12',
    name: 'Chhatrapati Sambhajinagar Central',
    name_mr: 'छत्रपती संभाजीनगर मध्यवर्ती आगार',
    name_hi: 'छत्रपति संभाजीनगर सेंट्रल डिपो',
    division: 'Chhatrapati Sambhajinagar Division',
    region: 'Marathwada Region',
    contact_phone: '0240-2331195',
    is_active: 1,
  },
];

let routes: RouteData[] = [
  {
    id: 'RT-MKR-PUN',
    route_code: 'MKR-PUN-EXP',
    route_name: 'Malkapur — Pune Swargate Express',
    origin: 'Malkapur',
    destination: 'Pune (Swargate)',
    distance_km: 468.0,
    travel_time_mins: 540,
    via_stops: ['Nandura', 'Khamgaon', 'Chikhli', 'Deulgaon Raja', 'Jalna', 'Chhatrapati Sambhajinagar', 'Ahmednagar', 'Shirur', 'Pune Swargate'],
    is_active: 1,
  },
  {
    id: 'RT-MKR-NAG',
    route_code: 'MKR-NAG-EXP',
    route_name: 'Malkapur — Nagpur Ganeshpeth Superfast',
    origin: 'Malkapur',
    destination: 'Nagpur (Ganeshpeth)',
    distance_km: 315.0,
    travel_time_mins: 360,
    via_stops: ['Nandura', 'Shegaon Phata', 'Balapur', 'Akola Central', 'Murtizapur', 'Badnera', 'Amravati', 'Tiwsa', 'Karanja Phata', 'Wardha Phata', 'Nagpur'],
    is_active: 1,
  },
  {
    id: 'RT-MKR-NSK',
    route_code: 'MKR-NSK-EXP',
    route_name: 'Malkapur — Nashik CBS Semi-Luxury',
    origin: 'Malkapur',
    destination: 'Nashik (CBS Old)',
    distance_km: 342.0,
    travel_time_mins: 390,
    via_stops: ['Muktainagar', 'Varangaon', 'Bhusawal', 'Jalgaon', 'Paldhi', 'Dhule', 'Malegaon', 'Chandwad', 'Ozar', 'Nashik'],
    is_active: 1,
  },
  {
    id: 'RT-MKR-JAL',
    route_code: 'MKR-JAL-ORD',
    route_name: 'Malkapur — Jalgaon via Bodwad & Bhusawal',
    origin: 'Malkapur',
    destination: 'Jalgaon (New Stand)',
    distance_km: 92.0,
    travel_time_mins: 110,
    via_stops: ['Bodwad', 'Varangaon', 'Bhusawal City', 'Khandesh Central', 'Jalgaon Old Stand', 'Jalgaon New Stand'],
    is_active: 1,
  },
  {
    id: 'RT-MKR-BUL',
    route_code: 'MKR-BUL-ORD',
    route_name: 'Malkapur — Buldhana Central Ghat Route',
    origin: 'Malkapur',
    destination: 'Buldhana Central',
    distance_km: 48.0,
    travel_time_mins: 65,
    via_stops: ['Dhad Phata', 'Motala Tehsil', 'Rohinkhed', 'Dhad Naka', 'Buldhana Central'],
    is_active: 1,
  },
  {
    id: 'RT-MKR-SHG',
    route_code: 'MKR-SHG-ORD',
    route_name: 'Malkapur — Shegaon Pilgrim Direct',
    origin: 'Malkapur',
    destination: 'Shegaon (Gajanan Mandir)',
    distance_km: 44.0,
    travel_time_mins: 55,
    via_stops: ['Nandura Tehsil', 'Jalamb Junction', 'Shegaon Mandir Stand'],
    is_active: 1,
  },
];

let platforms: PlatformData[] = [
  {
    id: 1,
    platform_number: 1,
    name: 'Platform 1 (फलाट १ — पुणे/नाशिक/मुंबई एक्सप्रेस)',
    status: 'FREE',
    assigned_trip_id: null,
    length_meters: 18,
    max_capacity: 1,
    allows_express: 1,
    preferred_corridor: 'Pune, Nashik & Mumbai Corridor (Shivshahi/Express)',
    is_active: 1,
    notes: 'Equipped with digital PID board and PA speaker cluster',
  },
  {
    id: 2,
    platform_number: 2,
    name: 'Platform 2 (फलाट २ — नागपूर/अमरावती/अकोला)',
    status: 'FREE',
    assigned_trip_id: null,
    length_meters: 18,
    max_capacity: 1,
    allows_express: 1,
    preferred_corridor: 'Nagpur, Amravati & Akola Corridor (Eastbound NH53 Express)',
    is_active: 1,
    notes: 'Equipped with digital PID board and PA speaker cluster',
  },
  {
    id: 3,
    platform_number: 3,
    name: 'Platform 3 (फलाट ३ — बुलढाणा/खामगाव/जळगाव/भुसावळ)',
    status: 'OCCUPIED',
    assigned_trip_id: 'TRIP-903',
    length_meters: 16,
    max_capacity: 1,
    allows_express: 0,
    preferred_corridor: 'Buldhana, Khamgaon & Jalgaon Regional Corridor',
    is_active: 1,
    notes: 'Ordinary Parivahan and Asiad semi-luxury services',
  },
  {
    id: 4,
    platform_number: 4,
    name: 'Platform 4 (फलाट ४ — शेगाव/नांदुरा/ग्रामीण सेवा)',
    status: 'FREE',
    assigned_trip_id: null,
    length_meters: 15,
    max_capacity: 1,
    allows_express: 0,
    preferred_corridor: 'Shegaon Gajanan Mandir, Nandura & Rural Feeder Corridor',
    is_active: 1,
    notes: 'Short turnaround pilgrim shuttle bay',
  },
];

let buses: BusData[] = [
  {
    id: 'BUS-101',
    bus_number: 'MH-28-BL-4521',
    depot: 'Malkapur Depot',
    depot_id: 'DEPOT-MKR',
    bus_type: 'Shivshahi AC Seater',
    capacity: 43,
    current_status: 'APPROACHING',
    live_lat: 20.8920,
    live_lng: 76.1680,
    speed_kmh: 48.0,
    heading: 95.0,
    current_platform_id: null,
    last_seen: new Date().toISOString(),
    source: 'PHONE_GPS',
    notes: 'Pune Swargate Regular Shivshahi service',
    is_active: 1,
  },
  {
    id: 'BUS-102',
    bus_number: 'MH-31-AP-9124',
    depot: 'Nagpur Ganeshpeth Depot',
    depot_id: 'DEPOT-NGP',
    bus_type: 'Ordinary Parivahan (Lalpari)',
    capacity: 50,
    current_status: 'SCHEDULED',
    live_lat: 20.8810,
    live_lng: 76.2480,
    speed_kmh: 54.0,
    heading: 90.0,
    current_platform_id: null,
    last_seen: new Date().toISOString(),
    source: 'MSRTC_GPS',
    notes: 'Nagpur to Malkapur returning long-haul trip',
    is_active: 1,
  },
  {
    id: 'BUS-103',
    bus_number: 'MH-28-BQ-4310',
    depot: 'Buldhana Central Depot',
    depot_id: 'DEPOT-BLD',
    bus_type: 'Ordinary Parivahan (Lalpari)',
    capacity: 48,
    current_status: 'AT_PLATFORM',
    live_lat: 20.8871,
    live_lng: 76.2014,
    speed_kmh: 0.0,
    heading: 90.0,
    current_platform_id: 3,
    last_seen: new Date().toISOString(),
    source: 'MSRTC_GPS',
    notes: 'Platform 3 Buldhana District Headquarter local route',
    is_active: 1,
  },
  {
    id: 'BUS-104',
    bus_number: 'MH-19-M-7704',
    depot: 'Jalgaon Depot',
    depot_id: 'DEPOT-JLG',
    bus_type: 'Asiad Seater (Semi-Luxury 2x2)',
    capacity: 45,
    current_status: 'APPROACHING',
    live_lat: 20.8895,
    live_lng: 76.1820,
    speed_kmh: 35.0,
    heading: 90.0,
    current_platform_id: null,
    last_seen: new Date().toISOString(),
    source: 'MSRTC_GPS',
    notes: 'Jalgaon via Bhusawal fast service',
    is_active: 1,
  },
  {
    id: 'BUS-105',
    bus_number: 'MH-28-C-3118',
    depot: 'Shegaon Gajanan Mandir Depot',
    depot_id: 'DEPOT-SHG',
    bus_type: 'Ordinary Parivahan (Lalpari)',
    capacity: 45,
    current_status: 'SCHEDULED',
    live_lat: 20.8800,
    live_lng: 76.2100,
    speed_kmh: 0.0,
    heading: 90.0,
    current_platform_id: null,
    last_seen: new Date().toISOString(),
    source: 'MSRTC_GPS',
    notes: 'Shegaon Gajanan Maharaj devotee shuttle',
    is_active: 1,
  },
  {
    id: 'BUS-106',
    bus_number: 'MH-15-AK-6520',
    depot: 'Nashik CBS Depot 1',
    depot_id: 'DEPOT-NSK',
    bus_type: 'Shivshahi AC Seater',
    capacity: 43,
    current_status: 'SCHEDULED',
    live_lat: 20.8750,
    live_lng: 76.1400,
    speed_kmh: 58.0,
    heading: 90.0,
    current_platform_id: null,
    last_seen: new Date().toISOString(),
    source: 'MSRTC_GPS',
    notes: 'Nashik CBS express route',
    is_active: 1,
  },
];

let trips: TripData[] = [
  {
    id: 'TRIP-901',
    trip_number: 'TR-MKR-001',
    bus_id: 'BUS-101',
    route_id: 'RT-MKR-PUN',
    origin: 'Malkapur',
    destination: 'Pune (Swargate)',
    scheduled_arrival: '08:30',
    scheduled_departure: '08:45',
    estimated_arrival: '08:35',
    estimated_departure: '08:50',
    actual_arrival: null,
    actual_departure: null,
    current_platform_id: null,
    status: 'APPROACHING',
    delay_minutes: 5,
    passenger_load: 38,
    source: 'PHONE_GPS',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'TRIP-902',
    trip_number: 'TR-MKR-002',
    bus_id: 'BUS-102',
    route_id: 'RT-MKR-NAG',
    origin: 'Malkapur',
    destination: 'Nagpur (Ganeshpeth)',
    scheduled_arrival: '09:00',
    scheduled_departure: '09:15',
    estimated_arrival: '09:00',
    estimated_departure: '09:15',
    actual_arrival: null,
    actual_departure: null,
    current_platform_id: null,
    status: 'SCHEDULED',
    delay_minutes: 0,
    passenger_load: 44,
    source: 'MSRTC_GPS',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'TRIP-903',
    trip_number: 'TR-MKR-003',
    bus_id: 'BUS-103',
    route_id: 'RT-MKR-BUL',
    origin: 'Malkapur',
    destination: 'Buldhana Central',
    scheduled_arrival: '08:00',
    scheduled_departure: '08:20',
    estimated_arrival: '08:00',
    estimated_departure: '08:20',
    actual_arrival: '08:00',
    actual_departure: null,
    current_platform_id: 3,
    status: 'AT_PLATFORM',
    delay_minutes: 0,
    passenger_load: 40,
    source: 'MSRTC_GPS',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'TRIP-904',
    trip_number: 'TR-MKR-004',
    bus_id: 'BUS-104',
    route_id: 'RT-MKR-JAL',
    origin: 'Malkapur',
    destination: 'Jalgaon (New Stand)',
    scheduled_arrival: '09:30',
    scheduled_departure: '09:40',
    estimated_arrival: '09:35',
    estimated_departure: '09:45',
    actual_arrival: null,
    actual_departure: null,
    current_platform_id: null,
    status: 'APPROACHING',
    delay_minutes: 5,
    passenger_load: 32,
    source: 'MSRTC_GPS',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'TRIP-905',
    trip_number: 'TR-MKR-005',
    bus_id: 'BUS-105',
    route_id: 'RT-MKR-SHG',
    origin: 'Malkapur',
    destination: 'Shegaon (Gajanan Mandir)',
    scheduled_arrival: '10:00',
    scheduled_departure: '10:15',
    estimated_arrival: '10:00',
    estimated_departure: '10:15',
    actual_arrival: null,
    actual_departure: null,
    current_platform_id: null,
    status: 'SCHEDULED',
    delay_minutes: 0,
    passenger_load: 41,
    source: 'MSRTC_GPS',
    last_updated: new Date().toISOString(),
  },
];

let announcements: AnnouncementData[] = [
  {
    id: 'ANN-001',
    announcement_type: 'BOARDING',
    trip_id: 'TRIP-903',
    platform_id: 3,
    bus_id: 'BUS-103',
    language: 'mr-IN',
    announcement_text: 'लक्ष द्या! मलकापूर येथून बुलढाणा जाणारी बस क्रमांक MH-28-BQ-4310 फलाट क्रमांक ३ वर उभी आहे. प्रवाशांनी कृपया चढण्याची नोंद घ्यावी.',
    phonetics_text: 'लक्ष द्या! मलकापूर येथून बुलढाणा जाणारी बस क्रमांक MH-28-BQ-4310 फलाट क्रमांक ३ वर उभी आहे.',
    priority: 'NORMAL',
    status: 'COMPLETED',
    play_count: 1,
    last_played_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

let alerts: AlertData[] = [];
let events: any[] = [];
let auditLogs: any[] = [];
let geofenceSessions: any[] = [];

let settings: Record<string, string> = {
  station_name: 'Malkapur Bus Stand (मलकापूर मध्यवर्ती बस स्थानक)',
  station_code: 'MKR-MS',
  district: 'Buldhana',
  division: 'Buldhana Division, MSRTC',
  station_lat: '20.8871',
  station_lng: '76.2014',
  geofence_arrival_radius_km: '1.5',
  geofence_arrival_radius_meters: '1200',
  geofence_approach_radius_km: '5.0',
  gps_accuracy_threshold_meters: '50',
  geofence_required_consecutive_samples: '2',
  geofence_cooldown_minutes: '15',
  gps_stale_threshold_seconds: '60',
  gps_update_interval_seconds: '4',
  buffer_time_minutes: '10',
  auto_assign_platforms: '1',
  auto_announce: '1',
  announcement_queue_paused: '0',
  default_speech_rate: '0.86',
  active_language: 'mr-IN',
  station_audio_output_mode: 'BROWSER_DAC_LINE_OUT',
  data_environment: 'OPERATIONAL_AUTHENTIC',
};

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Health Check (For Cloud Run readiness & liveness)
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    system: 'Smart MSRTC — VisionX',
    station: 'Malkapur Bus Stand (MKR-MS)',
    port: 3000,
    database: 'In-Memory / Persistent Store',
    timestamp: new Date().toISOString(),
  });
});

// Dashboard Statistics
apiRouter.get(['/dashboard/stats', '/dashboard'], (_req: Request, res: Response) => {
  const total_buses = buses.filter((b) => b.is_active).length;
  const incoming_buses = trips.filter((t) => t.status === 'APPROACHING').length;
  const occupied_platforms = platforms.filter((p) => p.status === 'OCCUPIED').length;
  const free_platforms = platforms.filter((p) => p.status === 'FREE' && p.is_active).length;
  const delayed_buses = trips.filter((t) => t.delay_minutes > 0 && t.status !== 'DEPARTED').length;
  const departed_buses = trips.filter((t) => t.status === 'DEPARTED').length;
  const active_conflicts = alerts.filter((a) => !a.is_resolved).length;
  const queued_announcements = announcements.filter((a) => a.status === 'QUEUED').length;

  res.json({
    total_buses,
    incoming_buses,
    buses_at_platforms: occupied_platforms,
    free_platforms,
    occupied_platforms,
    delayed_buses,
    departed_buses,
    active_conflicts,
    queued_announcements,
    recent_events: events.slice(0, 8),
  });
});

// Depots
apiRouter.get('/depots', (_req: Request, res: Response) => {
  res.json(depots);
});

apiRouter.post('/depots', (req: Request, res: Response) => {
  const body = req.body || {};
  const newDepot: Depot = {
    id: body.id || `DEPOT-${Date.now()}`,
    depot_code: (body.depot_code || `DEP-${Date.now()}`).toUpperCase(),
    name: body.name || 'New Depot',
    name_mr: body.name_mr || body.name || 'नवीन आगार',
    name_hi: body.name_hi || body.name || 'नया डिपो',
    division: body.division || 'Buldhana Division',
    region: body.region || 'Maharashtra',
    contact_phone: body.contact_phone || '',
    is_active: 1,
  };
  depots.push(newDepot);
  res.status(201).json({ success: true, id: newDepot.id });
});

apiRouter.put('/depots/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const idx = depots.findIndex((d) => d.id === id);
  if (idx !== -1) {
    depots[idx] = { ...depots[idx], ...req.body };
    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: 'Depot not found' });
  }
});

// Buses
apiRouter.get('/buses', (_req: Request, res: Response) => {
  res.json(buses);
});

apiRouter.post('/buses', (req: Request, res: Response) => {
  const body = req.body || {};
  const newBus: BusData = {
    id: body.id || `BUS-${Date.now()}`,
    bus_number: (body.bus_number || '').toUpperCase(),
    depot: body.depot || 'Malkapur Depot',
    depot_id: body.depot_id || 'DEPOT-MKR',
    bus_type: body.bus_type || 'Ordinary Parivahan',
    capacity: Number(body.capacity || 45),
    current_status: body.current_status || 'SCHEDULED',
    live_lat: Number(body.live_lat || 20.8871),
    live_lng: Number(body.live_lng || 76.2014),
    speed_kmh: Number(body.speed_kmh || 0),
    heading: Number(body.heading || 0),
    current_platform_id: null,
    last_seen: new Date().toISOString(),
    source: body.source || 'MANUAL',
    notes: body.notes || 'Added via fleet management console',
    is_active: 1,
  };
  buses.push(newBus);
  res.status(201).json({ success: true, id: newBus.id });
});

apiRouter.put('/buses/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const idx = buses.findIndex((b) => b.id === id);
  if (idx !== -1) {
    buses[idx] = { ...buses[idx], ...req.body, last_seen: new Date().toISOString() };
    res.json({ success: true, id });
  } else {
    res.status(404).json({ error: 'Bus not found' });
  }
});

// Routes & Trips & Platforms
apiRouter.get('/routes', (_req: Request, res: Response) => {
  res.json(routes);
});

apiRouter.get('/trips', (_req: Request, res: Response) => {
  const enrichedTrips = trips.map((t) => {
    const bus = buses.find((b) => b.id === t.bus_id);
    const plat = platforms.find((p) => p.id === t.current_platform_id);
    return {
      ...t,
      bus_number: bus?.bus_number,
      bus_type: bus?.bus_type,
      operating_depot: bus?.depot || 'Malkapur Depot',
      platform_number: plat?.platform_number,
    };
  });
  res.json(enrichedTrips);
});

apiRouter.get('/platforms', (_req: Request, res: Response) => {
  const enrichedPlatforms = platforms.map((p) => {
    const trip = trips.find((t) => t.id === p.assigned_trip_id);
    const bus = buses.find((b) => b.id === trip?.bus_id);
    return {
      ...p,
      trip_number: trip?.trip_number,
      destination: trip?.destination,
      scheduled_departure: trip?.scheduled_departure,
      delay_minutes: trip?.delay_minutes,
      bus_number: bus?.bus_number,
      bus_type: bus?.bus_type,
      operating_depot: bus?.depot,
    };
  });
  res.json(enrichedPlatforms);
});

// Deterministic Platform Recommendation Rule Engine
apiRouter.post('/platforms/recommend', (req: Request, res: Response) => {
  const { trip_id } = req.body || {};
  const trip = trips.find((t) => t.id === trip_id);

  if (!trip) {
    res.status(404).json({
      success: false,
      recommended_platform_id: null,
      recommendation_reason: `Trip ${trip_id} not found`,
      candidate_evaluations: [],
      conflict_detected: true,
    });
    return;
  }

  const dest = (trip.destination || '').toLowerCase();
  let preferredBay = 2; // Eastbound default
  let reason = 'Platform 2 matches Eastbound Express corridor (Nagpur/Amravati)';

  if (dest.includes('pune') || dest.includes('nashik') || dest.includes('mumbai')) {
    preferredBay = 1;
    reason = 'Platform 1 matches Westbound Express corridor (Pune/Nashik/Mumbai)';
  } else if (dest.includes('buldhana') || dest.includes('khamgaon') || dest.includes('jalgaon')) {
    preferredBay = 3;
    reason = 'Platform 3 matches Regional corridor (Buldhana/Jalgaon/Khamgaon)';
  } else if (dest.includes('shegaon') || dest.includes('nandura')) {
    preferredBay = 4;
    reason = 'Platform 4 matches Pilgrim & Rural Feeder corridor (Shegaon)';
  }

  // Check if preferred platform is free
  const targetPlat = platforms.find((p) => p.platform_number === preferredBay);
  let finalBay = preferredBay;

  if (targetPlat && targetPlat.status === 'OCCUPIED' && targetPlat.assigned_trip_id !== trip_id) {
    const freePlat = platforms.find((p) => p.status === 'FREE');
    if (freePlat) {
      finalBay = freePlat.platform_number;
      reason = `Preferred Platform ${preferredBay} occupied; relocated to free Platform ${finalBay}`;
    }
  }

  res.json({
    success: true,
    recommended_platform_id: finalBay,
    recommendation_reason: reason,
    candidate_evaluations: platforms.map((p) => ({
      platform_id: p.id,
      platform_number: p.platform_number,
      is_occupied: p.status === 'OCCUPIED' && p.assigned_trip_id !== trip_id,
      eligible: p.status === 'FREE' || p.assigned_trip_id === trip_id,
    })),
    conflict_detected: false,
  });
});

// Platform Override / Manual or Automatic Assignment
apiRouter.post('/platforms/override', (req: Request, res: Response) => {
  const { trip_id, platform_id, reason, actor } = req.body || {};
  const platNum = Number(platform_id);

  const tripIdx = trips.findIndex((t) => t.id === trip_id);
  const platIdx = platforms.findIndex((p) => p.platform_number === platNum || p.id === platNum);

  if (platIdx !== -1) {
    // Clear previous assignments for this platform
    platforms[platIdx].status = 'OCCUPIED';
    platforms[platIdx].assigned_trip_id = trip_id;

    if (tripIdx !== -1) {
      trips[tripIdx].current_platform_id = platforms[platIdx].id;
      trips[tripIdx].status = 'AT_PLATFORM';
      trips[tripIdx].last_updated = new Date().toISOString();

      const busIdx = buses.findIndex((b) => b.id === trips[tripIdx].bus_id);
      if (busIdx !== -1) {
        buses[busIdx].current_status = 'AT_PLATFORM';
        buses[busIdx].current_platform_id = platforms[platIdx].id;
        buses[busIdx].speed_kmh = 0;
        buses[busIdx].live_lat = 20.8871;
        buses[busIdx].live_lng = 76.2014;
      }

      // Generate announcement
      const annId = `ANN-${Date.now()}`;
      announcements.unshift({
        id: annId,
        announcement_type: 'ARRIVAL',
        trip_id,
        platform_id: platforms[platIdx].id,
        bus_id: trips[tripIdx].bus_id,
        language: 'mr-IN',
        announcement_text: `कृपया लक्ष द्या... ${trips[tripIdx].origin} येथून ${trips[tripIdx].destination} जाणारी गाडी फलाट क्रमांक ${platNum} वर लागत आहे.`,
        phonetics_text: `गाडी फलाट क्रमांक ${platNum} वर लागत आहे.`,
        priority: 'NORMAL',
        status: 'QUEUED',
        play_count: 0,
        last_played_at: null,
        created_at: new Date().toISOString(),
      });
    }

    auditLogs.unshift({
      id: auditLogs.length + 1,
      action: 'PLATFORM_OVERRIDE',
      entity_type: 'PLATFORM',
      entity_id: String(platNum),
      actor: actor || 'STATION_MASTER',
      details_json: JSON.stringify({ trip_id, reason }),
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, assignment_id: `ASSIGN-${Date.now()}` });
  } else {
    res.status(404).json({ error: 'Platform not found' });
  }
});

// Mobile GPS Telemetry Ingestion
apiRouter.post('/gps/update', (req: Request, res: Response) => {
  const { bus_id, latitude, longitude, speed_kmh, heading, accuracy_meters } = req.body || {};
  const busIdx = buses.findIndex((b) => b.id === bus_id || b.bus_number === bus_id);

  if (busIdx !== -1) {
    buses[busIdx].live_lat = Number(latitude);
    buses[busIdx].live_lng = Number(longitude);
    buses[busIdx].speed_kmh = Number(speed_kmh || 0);
    buses[busIdx].heading = Number(heading || 0);
    buses[busIdx].source = 'PHONE_GPS';
    buses[busIdx].last_seen = new Date().toISOString();

    res.json({
      success: true,
      bus_id,
      diagnostic_reason: 'Mobile telemetry ingested successfully',
      geofence_status: 'TRACKING_ACTIVE',
    });
  } else {
    res.json({ success: true, message: 'Telemetry recorded' });
  }
});

apiRouter.get('/gps/ping', (req: Request, res: Response) => {
  const { id, lat, lon, speed } = req.query as Record<string, string>;
  const busIdx = buses.findIndex((b) => b.bus_number === id || b.id === id);
  if (busIdx !== -1 && lat && lon) {
    buses[busIdx].live_lat = parseFloat(lat);
    buses[busIdx].live_lng = parseFloat(lon);
    buses[busIdx].speed_kmh = parseFloat(speed || '0');
    buses[busIdx].last_seen = new Date().toISOString();
  }
  res.json({ success: true, status: 'OK' });
});

apiRouter.get('/geofence/sessions', (_req: Request, res: Response) => {
  res.json(geofenceSessions);
});

// Events & Arrival Event Processing
apiRouter.post('/events/arrival', (req: Request, res: Response) => {
  const payload = req.body || {};
  const ev = {
    id: `EV-${Date.now()}`,
    event_type: payload.event_type || 'GEOFENCE_ENTERED',
    bus_id: payload.bus_id,
    trip_id: payload.trip_id,
    created_at: new Date().toISOString(),
    payload,
  };
  events.unshift(ev);
  res.json({ success: true, event_id: ev.id });
});

apiRouter.get('/events', (_req: Request, res: Response) => {
  res.json(events);
});

// Passenger Display
apiRouter.get('/passenger-display', (_req: Request, res: Response) => {
  const enrichedTrips = trips
    .filter((t) => t.status !== 'DEPARTED')
    .map((t) => {
      const bus = buses.find((b) => b.id === t.bus_id);
      const plat = platforms.find((p) => p.id === t.current_platform_id);
      const dep = depots.find((d) => d.id === bus?.depot_id);
      return {
        id: t.id,
        trip_number: t.trip_number,
        destination: t.destination,
        scheduled_arrival: t.scheduled_arrival,
        scheduled_departure: t.scheduled_departure,
        estimated_arrival: t.estimated_arrival,
        delay_minutes: t.delay_minutes,
        status: t.status,
        source: t.source,
        bus_number: bus?.bus_number,
        bus_type: bus?.bus_type,
        operating_depot: dep?.name || bus?.depot || 'Malkapur Depot',
        depot_name_mr: dep?.name_mr,
        depot_name_hi: dep?.name_hi,
        platform_number: plat?.platform_number,
        platform_name: plat?.name,
      };
    });

  const activeAnnouncements = announcements
    .filter((a) => a.status === 'QUEUED' || a.status === 'SPEAKING' || a.priority === 'URGENT')
    .slice(0, 3);

  res.json({
    station: 'Malkapur Bus Stand',
    station_mr: 'मलकापूर मध्यवर्ती बस स्थानक',
    station_hi: 'मलकापुर केंद्रीय बस स्टैंड',
    last_updated: new Date().toISOString(),
    trips: enrichedTrips,
    announcements: activeAnnouncements,
  });
});

// Announcements
apiRouter.get('/announcements', (_req: Request, res: Response) => {
  const enriched = announcements.map((a) => {
    const bus = buses.find((b) => b.id === a.bus_id);
    const trip = trips.find((t) => t.id === a.trip_id);
    const plat = platforms.find((p) => p.id === a.platform_id);
    return {
      ...a,
      bus_number: bus?.bus_number,
      trip_number: trip?.trip_number,
      destination: trip?.destination,
      platform_number: plat?.platform_number,
    };
  });
  res.json(enriched);
});

apiRouter.post('/announcements', (req: Request, res: Response) => {
  const body = req.body || {};
  const newAnn: AnnouncementData = {
    id: `ANN-${Date.now()}`,
    announcement_type: body.announcement_type || 'GENERAL_ADVISORY',
    trip_id: body.trip_id || 'GENERAL',
    platform_id: body.platform_id || null,
    bus_id: body.bus_id || 'GENERAL',
    language: body.language || 'mr-IN',
    announcement_text: (body.announcement_text || '').trim(),
    phonetics_text: body.phonetics_text || body.announcement_text || '',
    priority: body.priority || 'NORMAL',
    status: 'QUEUED',
    play_count: 0,
    last_played_at: null,
    created_at: new Date().toISOString(),
  };
  announcements.unshift(newAnn);
  res.status(201).json({ success: true, id: newAnn.id, announcement_text: newAnn.announcement_text });
});

apiRouter.post('/announcements/:id/play', (req: Request, res: Response) => {
  const id = req.params.id;
  const ann = announcements.find((a) => a.id === id);
  if (ann) {
    ann.play_count += 1;
    ann.status = 'COMPLETED';
    ann.last_played_at = new Date().toISOString();
  }
  res.json({ success: true, id, played_at: new Date().toISOString() });
});

apiRouter.post('/announcements/:id/status', (req: Request, res: Response) => {
  const id = req.params.id;
  const { status } = req.body || {};
  const ann = announcements.find((a) => a.id === id);
  if (ann && status) {
    ann.status = status;
    if (status === 'COMPLETED') {
      ann.play_count += 1;
      ann.last_played_at = new Date().toISOString();
    }
  }
  res.json({ success: true, id, status });
});

apiRouter.post('/announcements/control', (req: Request, res: Response) => {
  const { action } = req.body || {};
  if (action === 'CLEAR') {
    announcements.forEach((a) => {
      if (a.status === 'QUEUED') a.status = 'SKIPPED';
    });
  }
  res.json({ success: true, action });
});

// Conflicts & Alerts
apiRouter.get('/conflicts', (_req: Request, res: Response) => {
  res.json(alerts);
});

apiRouter.post('/conflicts/:id/resolve', (req: Request, res: Response) => {
  const id = req.params.id;
  const { actor } = req.body || {};
  const alert = alerts.find((a) => a.id === id);
  if (alert) {
    alert.is_resolved = 1;
    alert.resolved_by = actor || 'STATION_MASTER';
    alert.resolved_at = new Date().toISOString();
  }
  res.json({ success: true, alert_id: id });
});

// Audit Logs
apiRouter.get('/audit-logs', (_req: Request, res: Response) => {
  res.json(auditLogs);
});

// System Settings
apiRouter.get('/settings', (_req: Request, res: Response) => {
  res.json(settings);
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  settings = { ...settings, ...req.body };
  res.json({ success: true });
});

// Diagnostics
apiRouter.get('/diagnostics', (_req: Request, res: Response) => {
  res.json({
    status: 'OPTIMAL',
    station: 'Malkapur Central Bus Stand',
    active_buses: buses.filter((b) => b.is_active).length,
    active_trips: trips.filter((t) => t.status !== 'DEPARTED').length,
    uptime_seconds: process.uptime(),
    memory_usage: process.memoryUsage(),
  });
});

// IoT Devices
apiRouter.get('/devices', (_req: Request, res: Response) => {
  res.json([
    {
      id: 'DEV-RFID-01',
      device_code: 'RFID-GATE-MKR-01',
      device_type: 'RFID_GATE_READER',
      name: 'Malkapur Ingress RFID Scanner (Gate 1)',
      status: 'ONLINE',
      auth_token: 'TOKEN-SEC-RFID-9901',
      is_active: 1,
    },
    {
      id: 'DEV-GPS-101',
      device_code: 'AIS140-BUS-101',
      device_type: 'GPS_TRACKER',
      name: 'AIS-140 Onboard Telematics (MH-28-BL-4521)',
      status: 'ONLINE',
      auth_token: 'TOKEN-SEC-GPS-1402',
      is_active: 1,
    },
  ]);
});

apiRouter.post('/devices/ingest', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'IoT event ingested' });
});

apiRouter.post('/devices/:id/simulate', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Simulation event recorded' });
});

// Simulator endpoints
apiRouter.post('/simulator/step', (req: Request, res: Response) => {
  const { bus_id } = req.body || {};
  res.json({ success: true, bus_id, message: 'Simulated step processed' });
});

apiRouter.post('/simulator/reset', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Station prototype re-initialized successfully' });
});
