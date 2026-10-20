/**
 * Smart MSRTC - VisionX
 * Central REST API Client
 * Connects to the Python/SQLite backend via /api endpoints.
 */

import {
  DashboardStats,
  Bus,
  Depot,
  Trip,
  Route,
  Platform,
  Alert,
  Announcement,
  AuditLog,
  SystemEvent,
} from '../types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `HTTP error ${response.status} on ${endpoint}`);
  }

  return response.json();
}

export const api = {
  // System Health & Stats
  getHealth: () => request<{ status: string; station: string; timestamp: string }>('/health'),
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  // Operating Depots
  getDepots: () => request<Depot[]>('/depots'),
  createDepot: (data: Partial<Depot>) =>
    request<{ success: boolean; id: string }>('/depots', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDepot: (id: string, data: Partial<Depot>) =>
    request<{ success: boolean; id: string }>(`/depots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Fleet & Trips
  getBuses: () => request<Bus[]>('/buses'),
  createBus: (data: Partial<Bus>) => request<{ success: boolean; id: string }>('/buses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateBus: (id: string, data: Partial<Bus>) => request<{ success: boolean; id: string }>(`/buses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getTrips: () => request<Trip[]>('/trips'),
  getRoutes: () => request<Route[]>('/routes'),

  // Platforms & Coordination
  getPlatforms: () => request<Platform[]>('/platforms'),
  recommendPlatform: (tripId: string) =>
    request<{
      success: boolean;
      recommended_platform_id: number | null;
      recommendation_reason: string;
      candidate_evaluations: any[];
      conflict_detected: boolean;
      conflict_details?: any;
    }>('/platforms/recommend', {
      method: 'POST',
      body: JSON.stringify({ trip_id: tripId }),
    }),
  overridePlatform: (tripId: string, platformId: number, reason: string, actor: string) =>
    request<{ success: boolean; assignment_id: string }>('/platforms/override', {
      method: 'POST',
      body: JSON.stringify({ trip_id: tripId, platform_id: platformId, reason, actor }),
    }),

  // Events & Telemetry
  ingestArrivalEvent: (payload: any) =>
    request<any>('/events/arrival', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEvents: () => request<SystemEvent[]>('/events'),

  // Mobile Phone GPS Tracking
  updateMobileGps: (payload: {
    bus_id: string;
    trip_id?: string;
    latitude: number;
    longitude: number;
    accuracy_meters: number;
    speed_kmh?: number;
    heading?: number;
    timestamp?: string;
    source?: string;
  }) =>
    request<any>('/gps/update', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getGeofenceSessions: () => request<any[]>('/geofence/sessions'),

  // IoT Device Integration
  getDevices: () => request<any[]>('/devices'),
  ingestDeviceEvent: (deviceCode: string, authToken: string, payload: any) =>
    request<any>('/devices/ingest', {
      method: 'POST',
      headers: {
        'X-Device-Token': authToken,
      },
      body: JSON.stringify({ ...payload, device_code: deviceCode }),
    }),
  simulateDeviceEvent: (deviceId: string, payload: any) =>
    request<any>(`/devices/${deviceId}/simulate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Simulator
  stepSimulator: (busId: string, stage: string, tripId?: string, source: string = 'SIMULATED') =>
    request<any>('/simulator/step', {
      method: 'POST',
      body: JSON.stringify({ bus_id: busId, stage, trip_id: tripId, source }),
    }),
  resetSimulator: () =>
    request<{ success: boolean; message: string }>('/simulator/reset', {
      method: 'POST',
    }),

  // Passenger Display & Announcements
  getPassengerDisplay: () =>
    request<{ station: string; station_mr: string; station_hi?: string; last_updated: string; trips: any[]; announcements: any[] }>('/passenger-display'),
  getAnnouncements: () => request<Announcement[]>('/announcements'),
  createAnnouncement: (payload: Partial<Announcement>) =>
    request<{ success: boolean; id: string }>('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markAnnouncementPlayed: (id: string) =>
    request<{ success: boolean; id: string }>(`/announcements/${id}/play`, {
      method: 'POST',
    }),
  updateAnnouncementStatus: (id: string, status: string) =>
    request<{ success: boolean; id: string; status: string }>(`/announcements/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  controlAnnouncements: (action: 'PAUSE' | 'RESUME' | 'CLEAR') =>
    request<{ success: boolean; action: string }>('/announcements/control', {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  // Diagnostics & Health
  getDiagnostics: () => request<any>('/diagnostics'),

  // Conflicts & Alerts
  getConflicts: () => request<Alert[]>('/conflicts'),
  resolveConflict: (alertId: string, actor: string) =>
    request<{ success: boolean }> (`/conflicts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ actor }),
    }),

  // Audit Logs & Settings
  getAuditLogs: () => request<AuditLog[]>('/audit-logs'),
  getSettings: () => request<Record<string, string>>('/settings'),
  updateSettings: (data: Record<string, string>) =>
    request<{ success: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
