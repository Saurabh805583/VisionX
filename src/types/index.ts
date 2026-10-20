export type DataSource = 'SIMULATED' | 'MANUAL' | 'PHONE_GPS' | 'IOT_DEVICE' | 'OFFICIAL_FEED' | 'UNKNOWN';

export type BusStatus = 'SCHEDULED' | 'APPROACHING' | 'AT_PLATFORM' | 'DEPARTED' | 'MAINTENANCE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'HIGH';

export interface Depot {
  id: string;
  depot_code: string;
  name: string;
  name_mr?: string;
  name_hi?: string;
  division: string;
  region?: string;
  contact_phone?: string;
  is_active: number;
  created_at: string;
}

export interface Bus {
  id: string;
  bus_number: string;
  depot: string;
  depot_id?: string | null;
  depot_name?: string;
  depot_code?: string;
  depot_division?: string;
  depot_name_mr?: string;
  depot_name_hi?: string;
  operating_depot?: string;
  bus_type: string;
  capacity: number;
  current_status: BusStatus;
  live_lat: number | null;
  live_lng: number | null;
  speed_kmh: number;
  heading: number;
  current_platform_id: number | null;
  last_seen: string | null;
  source: DataSource;
  notes: string | null;
  is_active: number;
}

export interface Route {
  id: string;
  route_code: string;
  route_name: string;
  origin: string;
  destination: string;
  distance_km: number;
  travel_time_mins: number;
  via_stops_json: string;
  is_active: number;
}

export interface Trip {
  id: string;
  trip_number: string;
  bus_id: string;
  route_id: string;
  origin: string;
  destination: string;
  scheduled_arrival: string;
  scheduled_departure: string;
  estimated_arrival: string | null;
  estimated_departure: string | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  current_platform_id: number | null;
  status: BusStatus;
  delay_minutes: number;
  passenger_load: number;
  source: DataSource;
  last_updated: string;
  bus_number?: string;
  bus_type?: string;
  operating_depot?: string;
  depot_id?: string | null;
  depot_name?: string;
  depot_name_mr?: string;
  depot_name_hi?: string;
  depot_code?: string;
  route_name?: string;
  route_code?: string;
  platform_number?: number | null;
  live_lat?: number | null;
  live_lng?: number | null;
  speed_kmh?: number;
}

export interface Platform {
  id: number;
  platform_number: number;
  name: string;
  status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
  assigned_trip_id: string | null;
  length_meters: number;
  max_capacity: number;
  allows_express: number;
  preferred_corridor: string | null;
  is_active: number;
  notes: string | null;
  trip_number?: string;
  destination?: string;
  scheduled_departure?: string;
  delay_minutes?: number;
  bus_number?: string;
  bus_type?: string;
}

export interface PlatformAssignment {
  id: string;
  platform_id: number;
  trip_id: string;
  bus_id: string;
  assigned_at: string;
  departure_expected: string | null;
  status: 'ACTIVE' | 'SUPERSEDED' | 'COMPLETED';
  allocation_mode: 'AUTOMATIC' | 'MANUAL_OVERRIDE';
  allocation_reason: string;
  assigned_by: string;
}

export interface SystemEvent {
  id: string;
  event_uuid: string;
  event_type: string;
  bus_id: string;
  trip_id: string | null;
  platform_id: number | null;
  timestamp: string;
  payload_json: string;
  idempotency_key: string | null;
  source: DataSource;
  created_at: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  trip_id: string | null;
  platform_id: number | null;
  is_resolved: number;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  trip_number?: string;
  destination?: string;
  bus_number?: string;
}

export interface Announcement {
  id: string;
  announcement_type: string;
  trip_id: string;
  platform_id?: number | null;
  bus_id: string;
  language: string;
  announcement_text: string;
  phonetics_text: string | null;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL';
  status: 'QUEUED' | 'SPEAKING' | 'COMPLETED' | 'SKIPPED' | 'FAILED' | 'PLAYED';
  play_count: number;
  last_played_at: string | null;
  created_at: string;
  bus_number?: string;
  trip_number?: string;
  destination?: string;
  platform_number?: number;
}

export interface IoTDevice {
  id: string;
  device_code: string;
  device_type: 'GPS_TRACKER' | 'ESP32_TELEMATICS' | 'RFID_GATE_READER' | 'BLE_BEACON' | 'ANPR_CAMERA';
  name: string;
  assigned_bus_id: string | null;
  assigned_platform_id: number | null;
  status: 'ONLINE' | 'STANDBY' | 'OFFLINE' | 'REGISTERED';
  auth_token: string;
  last_heartbeat: string | null;
  config_json: string;
  is_active: number;
  notes: string | null;
  created_at: string;
  bus_number?: string;
  platform_number?: number;
}

export interface GeofenceSession {
  trip_id: string;
  bus_id: string;
  consecutive_inside_samples: number;
  last_sample_lat: number | null;
  last_sample_lng: number | null;
  last_sample_accuracy: number | null;
  last_sample_time: string | null;
  distance_to_station_meters: number;
  status: 'OUTSIDE' | 'ARRIVAL_CANDIDATE' | 'CONFIRMED_ARRIVED' | 'COOLDOWN' | 'LOW_ACCURACY';
  arrival_confirmed_at: string | null;
  cooldown_until: string | null;
  last_diagnostic: string;
  updated_at: string;
  bus_number?: string;
  trip_number?: string;
  destination?: string;
}

export interface DiagnosticsReport {
  status: string;
  timestamp: string;
  checks: {
    api_server: { healthy: boolean; message: string };
    database: { healthy: boolean; engine: string; bus_records: number; platform_records: number };
    geofence: {
      healthy: boolean;
      station_coordinates: string;
      radius_meters: string;
      accuracy_threshold_meters: string;
      required_consecutive_samples: string;
      cooldown_minutes: string;
    };
    announcements: {
      healthy: boolean;
      queued_count: number;
      default_language: string;
      queue_paused?: boolean;
    };
    iot_adapters: {
      healthy: boolean;
      online_devices: number;
      authentication_required: boolean;
    };
  };
}

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  details_json: string;
  created_at: string;
}

export interface DashboardStats {
  total_buses: number;
  incoming_buses: number;
  buses_at_platforms: number;
  free_platforms: number;
  occupied_platforms: number;
  delayed_buses: number;
  departed_buses: number;
  active_conflicts: number;
  queued_announcements: number;
  recent_events: SystemEvent[];
}
