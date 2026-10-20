import React, { useEffect, useState, useRef } from 'react';
import {
  Compass,
  Navigation,
  Radio,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Volume2,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { Bus, Trip, Platform } from '../types';
import { SourceBadge } from '../components/SourceBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import L from 'leaflet';
import {
  playStBusStandBell,
  speakTransportAnnouncement,
} from '../services/voiceEngine';

const MALKAPUR_COORDS: [number, number] = [20.8871, 76.2014];

// Authentic Road Waypoints into Malkapur Bus Stand
interface CorridorData {
  origin: string;
  dest: string;
  depotType: 'MALKAPUR' | 'OUTSIDE';
  corridorName: string;
  path: [number, number][];
}

const BUS_CORRIDORS: Record<string, CorridorData> = {
  // Malkapur Depot Home Bus (Red) - NH53 West Corridor
  'BUS-101': {
    origin: 'Nagpur',
    dest: 'Pune',
    depotType: 'MALKAPUR',
    corridorName: 'NH53 Westbound Express Corridor',
    path: [
      [20.9080, 76.1200],
      [20.9020, 76.1400],
      [20.8965, 76.1620],
      [20.8920, 76.1800],
      [20.8895, 76.1920], // ~1.0 km (inside 1.2km geofence)
      [20.8880, 76.1985], // ~350 m approach lane
      [20.8871, 76.2014], // Malkapur Bus Stand Bay
    ],
  },
  // Nagpur Ganeshpeth Depot Transit Bus (Blue) - NH53 East Corridor
  'BUS-102': {
    origin: 'Nagpur',
    dest: 'Malkapur',
    depotType: 'OUTSIDE',
    corridorName: 'NH53 Eastbound Superfast Corridor',
    path: [
      [20.8780, 76.2800],
      [20.8810, 76.2550],
      [20.8840, 76.2300],
      [20.8860, 76.2150],
      [20.8868, 76.2085], // ~750 m (inside geofence)
      [20.8870, 76.2040],
      [20.8871, 76.2014],
    ],
  },
  // Jalgaon Depot Transit Bus (Blue) - Bodwad/Bhusawal Highway
  'BUS-104': {
    origin: 'Jalgaon',
    dest: 'Malkapur',
    depotType: 'OUTSIDE',
    corridorName: 'Jalgaon-Bodwad Transit Highway',
    path: [
      [20.9250, 76.1350],
      [20.9120, 76.1580],
      [20.9010, 76.1750],
      [20.8930, 76.1890],
      [20.8890, 76.1950], // ~800 m (inside geofence)
      [20.8878, 76.1990],
      [20.8871, 76.2014],
    ],
  },
  // Shegaon Gajanan Mandir Shuttle Bus (Blue) - Shegaon-Nandura Highway
  'BUS-105': {
    origin: 'Shegaon',
    dest: 'Malkapur',
    depotType: 'OUTSIDE',
    corridorName: 'Shegaon Pilgrim Feeder Route',
    path: [
      [20.9350, 76.2400],
      [20.9180, 76.2280],
      [20.9050, 76.2180],
      [20.8940, 76.2100],
      [20.8890, 76.2050], // ~450 m (inside geofence)
      [20.8878, 76.2025],
      [20.8871, 76.2014],
    ],
  },
  // Nashik CBS Depot Transit Bus (Blue) - South/West Highway
  'BUS-106': {
    origin: 'Nashik',
    dest: 'Malkapur',
    depotType: 'OUTSIDE',
    corridorName: 'Nashik CBS Long-Haul Route',
    path: [
      [20.8500, 76.1150],
      [20.8640, 76.1400],
      [20.8750, 76.1650],
      [20.8830, 76.1850],
      [20.8860, 76.1940], // ~850 m (inside geofence)
      [20.8868, 76.1985],
      [20.8871, 76.2014],
    ],
  },
};

// Real SVG Bus Symbols
function createBusSvg(color: string, borderColor: string, windowColor: string): string {
  return `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; flex-shrink:0;">
      <!-- Bus Body with Aerodynamic Profile -->
      <path d="M4 16C4 17.1 4.9 18 6 18H7C7 19.1 7.9 20 9 20C10.1 20 11 19.1 11 18H13C13 19.1 13.9 20 15 20C16.1 20 17 19.1 17 18H18C19.1 18 20 17.1 20 16V6C20 4.34 18.66 3 17 3H7C5.34 3 4 4.34 4 6V16Z" fill="${color}" stroke="${borderColor}" stroke-width="1.5"/>
      <!-- Windshield -->
      <path d="M6 6H18V10H6V6Z" fill="${windowColor}"/>
      <!-- Headlights -->
      <circle cx="8" cy="14" r="1.5" fill="${borderColor}"/>
      <circle cx="16" cy="14" r="1.5" fill="${borderColor}"/>
      <!-- Grill / Number Plate Slot -->
      <rect x="9.5" y="13" width="5" height="2" rx="0.5" fill="${windowColor}"/>
    </svg>
  `;
}

// Haversine distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const GpsTrackingPage: React.FC = () => {
  const { t, language, depotT, destT, busTypeT } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [useOfflineFallback, setUseOfflineFallback] = useState<boolean>(false);
  const [mapError, setMapError] = useState<boolean>(false);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState<number>(1200);

  // Continuous realistic positions along corridor
  const [simSteps, setSimSteps] = useState<Record<string, number>>({
    'BUS-101': 1,
    'BUS-102': 0,
    'BUS-104': 1,
    'BUS-105': 0,
    'BUS-106': 0,
  });

  // Station Dispatch Prompt for buses entering 1.2km radius
  const [dispatchAlert, setDispatchAlert] = useState<{
    bus: Bus;
    trip?: Trip;
    recommendedPlatform: number;
    reason: string;
    distanceMeters: number;
    isMalkapurDepot: boolean;
  } | null>(null);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geofenceCircleRef = useRef<L.Circle | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const accuracyCirclesRef = useRef<{ [key: string]: L.Circle }>({});
  const corridorLinesRef = useRef<{ [key: string]: L.Polyline }>({});

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const fetchData = async () => {
    try {
      const [busData, tripData, platData, settingsData] = await Promise.all([
        api.getBuses(),
        api.getTrips(),
        api.getPlatforms(),
        api.getSettings(),
      ]);
      setBuses(busData);
      setTrips(tripData);
      setPlatforms(platData);
      if (settingsData.geofence_arrival_radius_meters) {
        setGeofenceRadiusMeters(parseFloat(settingsData.geofence_arrival_radius_meters));
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (useOfflineFallback || !mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: MALKAPUR_COORDS,
          zoom: 13,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors | MSRTC Live Control',
          maxZoom: 18,
        }).addTo(map);

        // Malkapur Bus Stand Central Hub Marker
        const stationIcon = L.divIcon({
          className: 'custom-station-icon',
          html: `<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f8fafc; border-radius: 10px; padding: 5px 12px; font-weight: 800; font-size: 11px; border: 2px solid #0d9488; box-shadow: 0 4px 14px rgba(0,0,0,0.45); white-space: nowrap; display: flex; align-items: center; gap: 6px;">
            <span style="color: #38bdf8; font-size: 13px;">🏢</span>
            <span>मलकापूर मध्यवर्ती बस स्थानक · ४ फलाट (4 Bays)</span>
          </div>`,
          iconSize: [230, 32],
          iconAnchor: [115, 16],
        });
        L.marker(MALKAPUR_COORDS, { icon: stationIcon }).addTo(map);

        // 1.2km Malkapur Geofence Arrival Radius Circle
        const geofenceCircle = L.circle(MALKAPUR_COORDS, {
          radius: geofenceRadiusMeters,
          color: '#0d9488',
          fillColor: '#0d9488',
          fillOpacity: 0.12,
          weight: 2.5,
          dashArray: '6, 6',
        }).addTo(map);
        geofenceCircleRef.current = geofenceCircle;

        // 5km Outer Radar Approach Boundary
        L.circle(MALKAPUR_COORDS, {
          radius: 5000,
          color: '#64748b',
          fillColor: '#64748b',
          fillOpacity: 0.03,
          weight: 1.5,
          dashArray: '4, 4',
        }).addTo(map);

        mapInstanceRef.current = map;
      }
    } catch (e) {
      console.error('Leaflet initialization error:', e);
      setMapError(true);
      setUseOfflineFallback(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
        accuracyCirclesRef.current = {};
        corridorLinesRef.current = {};
        geofenceCircleRef.current = null;
      }
    };
  }, [useOfflineFallback]);

  // Update Geofence Radius smoothly
  useEffect(() => {
    if (geofenceCircleRef.current) {
      geofenceCircleRef.current.setRadius(geofenceRadiusMeters);
    }
  }, [geofenceRadiusMeters]);

  // Draw Highway Corridors on Map
  useEffect(() => {
    if (!mapInstanceRef.current || useOfflineFallback) return;
    const map = mapInstanceRef.current;

    Object.entries(BUS_CORRIDORS).forEach(([busId, info]) => {
      if (!corridorLinesRef.current[busId]) {
        const polyline = L.polyline(info.path, {
          color: info.depotType === 'MALKAPUR' ? '#ef4444' : '#3b82f6',
          weight: 2.5,
          opacity: 0.35,
          dashArray: '4, 6',
        }).addTo(map);
        corridorLinesRef.current[busId] = polyline;
      }
    });
  }, [useOfflineFallback]);

  // Continuous Real-Time Bus Movement Along Highway Paths
  useEffect(() => {
    const movementTimer = setInterval(() => {
      setSimSteps((prev) => {
        const next: Record<string, number> = { ...prev };
        let detectedAlertBusId: string | null = null;

        Object.entries(BUS_CORRIDORS).forEach(([bId, corr]) => {
          const curStep = prev[bId] ?? 0;
          const maxStep = corr.path.length - 1;

          // If not already parked at stand, advance forward smoothly
          if (curStep < maxStep) {
            const nextStep = curStep + 1;
            next[bId] = nextStep;

            const [pLat, pLng] = corr.path[nextStep];
            const dist = getDistanceMeters(pLat, pLng, MALKAPUR_COORDS[0], MALKAPUR_COORDS[1]);

            // When crossing into the 1.2km geofence naturally
            if (dist <= geofenceRadiusMeters && dist > 120 && !detectedAlertBusId) {
              detectedAlertBusId = bId;
            }
          }
        });

        // Trigger dispatch prompt for newly detected inbound bus
        if (detectedAlertBusId) {
          const busObj = buses.find((b) => b.id === detectedAlertBusId);
          const activeTrip = trips.find((t) => t.bus_id === detectedAlertBusId);
          if (busObj && busObj.current_status !== 'AT_PLATFORM' && !dispatchAlert) {
            const dest = activeTrip?.destination?.toLowerCase() || '';
            let recBay = 2;
            let recReason = 'Platform 2 matches Eastbound Express corridor (Nagpur/Amravati)';

            if (dest.includes('pune') || dest.includes('nashik') || dest.includes('mumbai')) {
              recBay = 1;
              recReason = 'Platform 1 matches Westbound Express corridor (Pune/Nashik/Mumbai)';
            } else if (dest.includes('buldhana') || dest.includes('khamgaon') || dest.includes('jalgaon')) {
              recBay = 3;
              recReason = 'Platform 3 matches Regional corridor (Buldhana/Jalgaon)';
            } else if (dest.includes('shegaon') || dest.includes('nandura')) {
              recBay = 4;
              recReason = 'Platform 4 matches Pilgrim & Rural Feeder (Shegaon)';
            }

            const corr = BUS_CORRIDORS[detectedAlertBusId];
            const coord = corr.path[next[detectedAlertBusId]];
            const dist = getDistanceMeters(coord[0], coord[1], MALKAPUR_COORDS[0], MALKAPUR_COORDS[1]);

            setDispatchAlert({
              bus: busObj,
              trip: activeTrip,
              recommendedPlatform: recBay,
              reason: recReason,
              distanceMeters: Math.round(dist),
              isMalkapurDepot: corr.depotType === 'MALKAPUR',
            });

            // Authentic 2-tone ST Ding-Dong Chime on entry
            playStBusStandBell(0.85);
          }
        }

        return next;
      });
    }, 4000);

    return () => clearInterval(movementTimer);
  }, [buses, trips, geofenceRadiusMeters, dispatchAlert]);

  // Update Markers with Differentiated Colors & Real Bus SVGs
  useEffect(() => {
    if (!mapInstanceRef.current || useOfflineFallback) return;
    const map = mapInstanceRef.current;

    buses.forEach((bus) => {
      let lat = bus.live_lat || MALKAPUR_COORDS[0];
      let lng = bus.live_lng || MALKAPUR_COORDS[1];
      let currentSpeed = bus.speed_kmh;

      const isMalkapurHomeDepot =
        bus.depot?.toLowerCase().includes('malkapur') || bus.depot_id === 'DEPOT-MKR';

      if (BUS_CORRIDORS[bus.id]) {
        const pIdx = simSteps[bus.id] ?? 0;
        const coords = BUS_CORRIDORS[bus.id].path[pIdx] || BUS_CORRIDORS[bus.id].path[0];
        lat = coords[0];
        lng = coords[1];

        if (pIdx === BUS_CORRIDORS[bus.id].path.length - 1) {
          currentSpeed = 0;
        } else {
          currentSpeed = Math.max(28, Math.round(bus.speed_kmh || 42));
        }
      }

      const activeTrip = trips.find((t) => t.bus_id === bus.id);
      const isPhoneGps = bus.source === 'PHONE_GPS';
      const isDocked = bus.current_status === 'AT_PLATFORM' || bus.id === 'BUS-103';
      const distToStation = Math.round(getDistanceMeters(lat, lng, MALKAPUR_COORDS[0], MALKAPUR_COORDS[1]));
      const isInsideGeofence = distToStation <= geofenceRadiusMeters;

      // Localized route label
      const destName = activeTrip?.destination ? destT(activeTrip.destination) : '';
      const routeText = destName ? (language === 'mr-IN' ? `मलकापूर ➔ ${destName}` : `Malkapur ➔ ${destName}`) : '';

      // COLOR CODING AS REQUESTED:
      // 1. Malkapur Depot = Signature Crimson Red & Gold (#b91c1c & #facc15)
      // 2. Outside Passing Depots = Deep Royal Cobalt Blue & Silver (#1d4ed8 & #93c5fd)
      // 3. Docked at Platform = Deep Forest Teal & Emerald (#0f766e & #34d399)
      let busBgColor = '#1d4ed8'; // Outside Depot default
      let busBorderColor = '#93c5fd';
      let busWindowColor = '#dbeafe';
      let depotBadgeLabel = language === 'mr-IN' ? `मार्गस्थ (${depotT(bus.depot)})` : `Transit (${bus.depot || 'Passing'})`;
      let depotBadgeStyle = 'background: #1e3a8a; color: #93c5fd; border: 1px solid #3b82f6;';

      if (isDocked) {
        busBgColor = '#0f766e';
        busBorderColor = '#34d399';
        busWindowColor = '#a7f3d0';
        depotBadgeLabel = language === 'mr-IN' ? `स्थानक फलाटावर उभी` : `Docked at Platform`;
        depotBadgeStyle = 'background: #064e3b; color: #a7f3d0; border: 1px solid #10b981;';
      } else if (isMalkapurHomeDepot) {
        busBgColor = '#b91c1c'; // Malkapur Signature Crimson
        busBorderColor = '#facc15'; // Malkapur Gold
        busWindowColor = '#fef08a';
        depotBadgeLabel = language === 'mr-IN' ? `🏢 स्थानिक मलकापूर आगार` : `🏢 Malkapur Home Depot`;
        depotBadgeStyle = 'background: #7f1d1d; color: #fef08a; border: 1px solid #f59e0b;';
      }

      const busSvgHtml = createBusSvg(busBgColor, busBorderColor, busWindowColor);
      const pulseIndicator = isInsideGeofence && !isDocked
        ? `<span style="display:inline-block; width:6px; height:6px; background:#facc15; border-radius:50%; box-shadow:0 0 6px #facc15;"></span>`
        : '';

      const markerHtml = `
        <div style="background: linear-gradient(135deg, ${busBgColor} 0%, rgba(15,23,42,0.95) 100%); color: white; border-radius: 10px; padding: 4px 8px; font-weight: 800; font-size: 11px; border: 2px solid ${isInsideGeofence ? '#facc15' : busBorderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.4); font-family: system-ui, -apple-system, sans-serif; white-space: nowrap; cursor: pointer; display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${busSvgHtml}
            <span style="font-family: monospace; font-size: 11.5px; letter-spacing: 0.5px;">${bus.bus_number}</span>
            ${pulseIndicator}
            <span style="background: rgba(0,0,0,0.4); padding: 1px 4px; border-radius: 4px; font-size: 9.5px; font-family: monospace; color: #f8fafc;">${Math.round(currentSpeed)} km/h</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; font-size: 9px; margin-top: 1px;">
            <span style="${depotBadgeStyle} padding: 1px 4px; border-radius: 3px; font-weight: 700;">${depotBadgeLabel}</span>
            ${routeText ? `<span style="color: #fef08a; font-weight: 700;">${routeText}</span>` : ''}
          </div>
        </div>
      `;

      const busIcon = L.divIcon({
        className: 'custom-real-bus-marker',
        html: markerHtml,
        iconSize: [180, 42],
        iconAnchor: [90, 21],
      });

      if (markersRef.current[bus.id]) {
        markersRef.current[bus.id].setLatLng([lat, lng]);
        markersRef.current[bus.id].setIcon(busIcon);
      } else {
        const marker = L.marker([lat, lng], { icon: busIcon }).addTo(map);
        marker.on('click', () => setSelectedBus(bus));
        markersRef.current[bus.id] = marker;
      }

      // Add Accuracy Circle if PHONE_GPS
      if (isPhoneGps) {
        if (accuracyCirclesRef.current[bus.id]) {
          accuracyCirclesRef.current[bus.id].setLatLng([lat, lng]);
        } else {
          const circle = L.circle([lat, lng], {
            radius: 35,
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.18,
            weight: 1.5,
          }).addTo(map);
          accuracyCirclesRef.current[bus.id] = circle;
        }
      }
    });
  }, [buses, trips, simSteps, useOfflineFallback, geofenceRadiusMeters, language]);

  // Handle Platform Allocation for arriving bus
  const handleAllocatePlatform = async (platformNumber: number) => {
    if (!dispatchAlert) return;
    const { bus, trip } = dispatchAlert;

    try {
      if (trip) {
        await api.overridePlatform(
          trip.id,
          platformNumber,
          `Real-time arrival bay allocation for ${bus.bus_number} at Malkapur Stand`,
          'STATION_MASTER'
        );
      }

      // Move simulated bus to the Malkapur Stand platform bay coordinate
      if (BUS_CORRIDORS[bus.id]) {
        const finalIdx = BUS_CORRIDORS[bus.id].path.length - 1;
        setSimSteps((prev) => ({
          ...prev,
          [bus.id]: finalIdx,
        }));
      }

      // Authentic MSRTC Public Announcement
      const destName = trip?.destination ? destT(trip.destination) : 'गंतव्य स्थान';
      const origName = trip?.origin ? destT(trip.origin) : 'मलकापूर';
      const spokenPlate = bus.bus_number.replace(/-/g, ' ');

      const announcementText =
        language === 'en-IN'
          ? `Attention please! Bus number ${bus.bus_number} from ${trip?.origin || 'Malkapur'} to ${trip?.destination || 'Destination'} is arriving at Platform ${platformNumber}. Passengers please note.`
          : language === 'hi-IN'
          ? `कृपया ध्यान दीजिए! ${origName} से ${destName} जाने वाली बस क्रमांक ${spokenPlate} प्लेटफॉर्म नंबर ${platformNumber} पर आ रही है। यात्रीगण कृपया ध्यान दें।`
          : `कृपया लक्ष द्या... ${origName} येथून ${destName} जाणारी गाडी क्रमांक ${spokenPlate}... फलाट क्रमांक ${platformNumber} वर लागत आहे. प्रवाशांनी कृपया नोंद घ्यावी.`;

      // Trigger PA announcement with authentic ST Ding-Dong Bell
      await speakTransportAnnouncement(announcementText, language, {
        rate: 0.86,
        pitch: 0.98,
        volume: 0.95,
        chime: 'ST_BELL',
      });

      showNotification(
        `✅ गाडी क्रमांक ${bus.bus_number} फलाट क्रमांक ${platformNumber} वर यशस्वीरीत्या लावली गेली!`
      );

      setDispatchAlert(null);
      fetchData();
    } catch (err: any) {
      showNotification(`त्रुटी: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-3 font-sans select-none">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg border border-teal-500/50 flex items-center justify-between text-xs font-semibold animate-fade-in z-30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header: Clean, Professional Transport Terminal Context */}
      <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-teal-400 shadow-inner">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                {t('radar.title', 'GPS & Geofence Live Radar')}
              </h2>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 border border-emerald-300 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                <span>थेट सॅटेलाइट GPS सक्रिय</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              मलकापूर मध्यवर्ती बस स्थानक · NH 53 कॉरिडॉर व आगमन हद्द (१,२०० मीटर)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Bus Count Badge */}
          <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-700 border border-slate-200">
            {buses.length} बसेस ऑन-रडार
          </div>

          <button
            onClick={() => setUseOfflineFallback(!useOfflineFallback)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            {useOfflineFallback ? '🗺 नकाशा पहा' : '📋 तक्ता पहा'}
          </button>
        </div>
      </div>

      {/* Main Grid: Full Immersion Map (Left) + Selected Bus Details (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map / Radar View (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs relative min-h-[580px] flex flex-col">
          {mapError && (
            <div className="bg-amber-50 p-3 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Map tiles fallback active. Real-time tabular radar displayed.</span>
            </div>
          )}

          {!useOfflineFallback ? (
            <div ref={mapContainerRef} className="w-full flex-1 min-h-[580px] z-10" />
          ) : (
            <div className="p-4 overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">नोंदणी क्रमांक</th>
                    <th className="py-2.5 px-3">आगार प्रकार</th>
                    <th className="py-2.5 px-3">मार्ग / गंतव्य</th>
                    <th className="py-2.5 px-3">वेग</th>
                    <th className="py-2.5 px-3">मलकापूरपासून अंतर</th>
                    <th className="py-2.5 px-3">स्थिती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {buses.map((bus) => {
                    const activeTrip = trips.find((t) => t.bus_id === bus.id);
                    const lat = bus.live_lat || MALKAPUR_COORDS[0];
                    const lng = bus.live_lng || MALKAPUR_COORDS[1];
                    const dist = Math.round(getDistanceMeters(lat, lng, MALKAPUR_COORDS[0], MALKAPUR_COORDS[1]));
                    const isMalkapur = bus.depot?.toLowerCase().includes('malkapur') || bus.depot_id === 'DEPOT-MKR';
                    return (
                      <tr
                        key={bus.id}
                        onClick={() => setSelectedBus(bus)}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{bus.bus_number}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isMalkapur ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isMalkapur ? 'स्थानिक मलकापूर आगार' : `मार्गस्थ (${depotT(bus.depot)})`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-teal-800">
                          {activeTrip ? destT(activeTrip.destination) : 'मलकापूर लोकल'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 font-bold">{Math.round(bus.speed_kmh)} km/h</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{dist} m</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={bus.current_status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Floating On-Map Color Legend */}
          <div className="absolute top-3 right-3 bg-slate-950/90 text-white backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] font-semibold shadow-xl z-20 space-y-1.5 pointer-events-auto">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-800">
              बस संकेत व आगार वर्गीकरण
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-amber-400" />
              <span>स्थानिक मलकापूर आगार बसेस (Red & Gold)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-300" />
              <span>मार्गस्थ / बाहेरील आगार बसेस (Blue & Cyan)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-600 ring-2 ring-emerald-300" />
              <span>स्थानक फलाटावर उभी (Green Docked)</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-teal-400 font-mono text-[10px]">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span>मलकापूर आगमन कक्षा: १,२०० मीटर</span>
            </div>
          </div>
        </div>

        {/* Selected Bus Telemetry & Live Platform Dispatch (1 Col) */}
        <div className="space-y-4">
          {/* Station Dispatch Card (When bus enters 1.2km) */}
          {dispatchAlert && (
            <div className="bg-linear-to-b from-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-xl border-2 border-amber-400 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-xs text-amber-300 uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>बस स्थानक आगमन हद्दीत दाखल!</span>
                </div>
                <button
                  onClick={() => setDispatchAlert(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    dispatchAlert.isMalkapurDepot
                      ? 'bg-red-600 text-white border border-amber-300'
                      : 'bg-blue-600 text-white border border-blue-300'
                  }`}>
                    {dispatchAlert.isMalkapurDepot ? 'स्थानिक मलकापूर आगार' : 'मार्गस्थ बाहेरील आगार'}
                  </span>
                </div>
                <div className="text-xl font-black font-mono tracking-wide mt-1">
                  {dispatchAlert.bus.bus_number}
                </div>
                <div className="text-xs text-amber-200 font-bold mt-0.5">
                  {dispatchAlert.trip
                    ? `${destT(dispatchAlert.trip.origin)} ➔ ${destT(dispatchAlert.trip.destination)}`
                    : 'मलकापूर प्रवासी सेवा'}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 font-mono">
                  अंतर: {dispatchAlert.distanceMeters} मीटर · वेग: {Math.round(dispatchAlert.bus.speed_kmh)} km/h
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                <div className="text-[11px] font-bold text-amber-300">
                  सुचवलेला फलाट (Platform Suggestion):
                </div>
                <div className="text-2xl font-black text-white font-mono flex items-center gap-2">
                  <span>फलाट क्र. {dispatchAlert.recommendedPlatform}</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    कॉरिडॉर नियम निश्चित
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  {dispatchAlert.reason}
                </p>
              </div>

              {/* Allocate Button */}
              <button
                onClick={() => handleAllocatePlatform(dispatchAlert.recommendedPlatform)}
                className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>स्वीकारा आणि फलाट {dispatchAlert.recommendedPlatform} वाटप करा</span>
              </button>

              {/* Alternative Platform Buttons */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1.5">
                  किंवा अन्य फलाट निवडा:
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((bayNum) => (
                    <button
                      key={bayNum}
                      onClick={() => handleAllocatePlatform(bayNum)}
                      className="py-1.5 bg-slate-800 hover:bg-white hover:text-slate-950 text-white rounded-lg text-xs font-black font-mono border border-slate-700 transition-colors"
                    >
                      फलाट {bayNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Bus Telemetry Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>बस थेट टेलिमेट्री तपशील</span>
              {selectedBus && <StatusBadge status={selectedBus.current_status} size="sm" />}
            </h3>

            {selectedBus ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">{t('fleet.busNumber', 'Registration Number')}</div>
                  <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                    {selectedBus.bus_number}
                  </div>
                  <div className="text-xs text-amber-700 font-bold mt-0.5">
                    {busTypeT(selectedBus.bus_type)}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">आगार वर्गीकरण</div>
                  <div className="mt-1">
                    {selectedBus.depot?.toLowerCase().includes('malkapur') || selectedBus.depot_id === 'DEPOT-MKR' ? (
                      <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 font-extrabold rounded-lg text-xs inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        <span>स्थानिक मलकापूर आगार बस (Home Depot)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 border border-blue-300 font-extrabold rounded-lg text-xs inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>मार्गस्थ बस ({depotT(selectedBus.depot)})</span>
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">{t('fleet.destination', 'Route / Destination')}</div>
                  <div className="font-extrabold text-teal-800 text-sm mt-0.5">
                    {(() => {
                      const tObj = trips.find((tr) => tr.bus_id === selectedBus.id);
                      return tObj ? `${destT(tObj.origin)} ➔ ${destT(tObj.destination)}` : 'मलकापूर शटल सेवा';
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">{t('gps.speed', 'Current Speed')}</div>
                    <div className="text-base font-black text-amber-600 font-mono mt-0.5">
                      {Math.round(selectedBus.speed_kmh)} km/h
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold">{t('gps.distanceToStation', 'Distance')}</div>
                    <div className="text-base font-black text-teal-700 font-mono mt-0.5">
                      {Math.round(getDistanceMeters(
                        selectedBus.live_lat || MALKAPUR_COORDS[0],
                        selectedBus.live_lng || MALKAPUR_COORDS[1],
                        MALKAPUR_COORDS[0],
                        MALKAPUR_COORDS[1]
                      ))} m
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">{t('fleet.source', 'Data Telemetry Source')}</div>
                  <div className="mt-1">
                    <SourceBadge source={selectedBus.source} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <Compass className="w-8 h-8 mx-auto text-slate-300" />
                <p>नकाशावरील कोणत्याही बस चिन्हावर क्लिक करून थेट मार्ग व माहिती पहा.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
