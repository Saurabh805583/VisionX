import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Smartphone,
  Navigation,
  Radio,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  RefreshCw,
  Info,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Gauge,
  Wifi,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { Bus, Trip } from '../types';
import { SourceBadge } from '../components/SourceBadge';
import { useLanguage } from '../context/LanguageContext';

export const MobileGpsPage: React.FC = () => {
  const { t, language, setLanguage, destT, depotT, busTypeT } = useLanguage();
  const [searchParams] = useSearchParams();

  const [buses, setBuses] = useState<Bus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('BUS-101');
  const [selectedTripId, setSelectedTripId] = useState<string>('TRIP-901');

  // Tracking State
  const [isTracking, setIsTracking] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    timestamp: number | null;
  }>({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null,
  });

  const [lastServerUpdate, setLastServerUpdate] = useState<string | null>(null);
  const [serverDiagnostic, setServerDiagnostic] = useState<string | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<string>('IDLE');
  const [distanceToStation, setDistanceToStation] = useState<number | null>(null);
  const [consecutiveSamples, setConsecutiveSamples] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'BROWSER_BEACON' | 'TRACCAR_APP'>('BROWSER_BEACON');

  const watchIdRef = useRef<number | null>(null);
  const isTrackingRef = useRef<boolean>(false);
  const wakeLockRef = useRef<any>(null);

  // Load fleet and trips
  useEffect(() => {
    Promise.all([api.getBuses(), api.getTrips()])
      .then(([busList, tripList]) => {
        setBuses(busList);
        setTrips(tripList);

        // Check URL search parameters
        const queryBus = searchParams.get('bus') || searchParams.get('bus_id') || searchParams.get('bus_number');
        const queryTrip = searchParams.get('trip') || searchParams.get('trip_id');

        if (queryBus) {
          const match = busList.find(
            (b) => b.id === queryBus || b.bus_number.toLowerCase() === queryBus.toLowerCase()
          );
          if (match) setSelectedBusId(match.id);
        } else if (busList.length > 0) {
          setSelectedBusId(busList[0].id);
        }

        if (queryTrip) {
          const matchTrip = tripList.find((t) => t.id === queryTrip || t.trip_number === queryTrip);
          if (matchTrip) setSelectedTripId(matchTrip.id);
        } else if (tripList.length > 0) {
          setSelectedTripId(tripList[0].id);
        }
      })
      .catch((err) => setErrorMessage(err.message));

    return () => {
      stopTracking();
    };
  }, [searchParams]);

  // Request Screen Wake Lock so phone doesn't go dark while driving
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch {}
      setWakeLockActive(false);
    }
  };

  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startTestDriveSimulation = () => {
    if (isTracking) stopTracking();
    setIsSimulatingDrive(true);
    setErrorMessage(null);

    // Realistic Malkapur approach waypoints along NH 53 (Highway corridor)
    const waypoints = [
      { lat: 20.9200, lng: 76.1600, speed: 52, label: 'महामार्गावरून स्थानकाकडे (4.5 km)' },
      { lat: 20.9080, lng: 76.1750, speed: 48, label: 'मलकापूर बायपास क्रॉसिंग (2.6 km)' },
      { lat: 20.8950, lng: 76.1900, speed: 38, label: 'मलकापूर शहर प्रवेश (1.4 km)' },
      { lat: 20.8895, lng: 76.1980, speed: 25, label: '१.२ किमी जिओफेन्स कक्षेत प्रवेश!' },
      { lat: 20.8875, lng: 76.2008, speed: 15, label: 'मलकापूर बस स्थानक प्रवेशद्वार' },
      { lat: 20.8871, lng: 76.2014, speed: 0, label: 'फलाटावर यशस्वी आगमन!' },
    ];

    let idx = 0;
    const runStep = () => {
      if (idx >= waypoints.length) {
        setIsSimulatingDrive(false);
        return;
      }
      const pt = waypoints[idx];
      const now = Date.now();
      setCoords({
        latitude: pt.lat,
        longitude: pt.lng,
        accuracy: 8,
        speed: pt.speed,
        heading: 135,
        timestamp: now,
      });
      sendLocationUpdate(pt.lat, pt.lng, 8, pt.speed, 135, now);
      idx++;
      if (idx < waypoints.length) {
        simulationTimerRef.current = setTimeout(runStep, 2500);
      } else {
        setIsSimulatingDrive(false);
      }
    };

    runStep();
  };

  const stopTestDriveSimulation = () => {
    setIsSimulatingDrive(false);
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
  };

  const startTracking = async () => {
    stopTestDriveSimulation();
    setErrorMessage(null);

    if (!('geolocation' in navigator)) {
      setErrorMessage(
        language === 'mr-IN'
          ? 'तुमच्या मोबाईल ब्राउझरमध्ये GPS जिओलोकेशन सुविधा उपलब्ध नाही.'
          : 'Geolocation is not supported by your mobile browser.'
      );
      return;
    }

    if (!selectedBusId || !selectedTripId) {
      setErrorMessage(
        language === 'mr-IN'
          ? 'कृपया लोकेशन पाठवण्यापूर्वी बस क्रमांक व फेरी निवडा.'
          : 'Please select both Bus ID and Active Trip before sharing location.'
      );
      return;
    }

    isTrackingRef.current = true;
    setIsTracking(true);
    setUpdateCount(0);

    // Keep screen awake while driving
    await requestWakeLock();

    // Explicit high-accuracy browser geolocation watch
    try {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          if (!isTrackingRef.current) return;

          const { latitude, longitude, accuracy, speed, heading } = position.coords;
          const captureTime = position.timestamp;
          const speedKmh = speed !== null && speed > 0 ? Math.round(speed * 3.6) : 0;

          setCoords({
            latitude,
            longitude,
            accuracy,
            speed: speedKmh,
            heading,
            timestamp: captureTime,
          });

          // Forward to backend
          sendLocationUpdate(latitude, longitude, accuracy, speedKmh, heading, captureTime);
        },
        (error) => {
          let errText = 'GPS error occurred.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errText =
                language === 'mr-IN'
                  ? 'मोबाईलमध्ये लोकेशन परवानगी नाकारली गेली आहे. कृपया ब्राउझर सेटिंग्जमधून लोकेशन ALLOW करा.'
                  : 'Location permission denied by user. Please enable GPS permissions in browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errText =
                language === 'mr-IN'
                  ? 'GPS सिग्नल सापडत नाही. मोबाईलमधील Location (High Accuracy GPS) चालू करा.'
                  : 'GPS position unavailable. Ensure device High-Accuracy Location is ON.';
              break;
            case error.TIMEOUT:
              errText =
                language === 'mr-IN'
                  ? 'सॅटेलाइट शोधण्यात वेळ लागत आहे. फोन बसच्या काचेजवळ ठेवा.'
                  : 'GPS location request timed out. Retrying satellite lock...';
              break;
          }
          setErrorMessage(errText);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1500,
        }
      );

      watchIdRef.current = id;
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to initialize GPS watcher.');
      stopTracking();
    }
  };

  const stopTracking = () => {
    isTrackingRef.current = false;
    setIsTracking(false);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    releaseWakeLock();
  };

  const sendLocationUpdate = async (
    lat: number,
    lng: number,
    acc: number,
    spd: number,
    hdg: number | null,
    timeMs: number
  ) => {
    try {
      const payload = {
        bus_id: selectedBusId,
        trip_id: selectedTripId,
        latitude: lat,
        longitude: lng,
        accuracy_meters: acc,
        speed_kmh: spd,
        heading: hdg || 0,
        timestamp: new Date(timeMs).toISOString(),
        source: 'PHONE_GPS',
      };

      const res = await api.updateMobileGps(payload);
      if (res.success) {
        setLastServerUpdate(new Date().toLocaleTimeString());
        setServerDiagnostic(res.diagnostic_reason || null);
        setGeofenceStatus(res.geofence_status || 'OUTSIDE');
        setDistanceToStation(res.distance_to_station_meters || null);
        setConsecutiveSamples(res.consecutive_samples || 0);
        setUpdateCount((c) => c + 1);
        setErrorMessage(null);

        // Vibrate phone when confirmed arriving at Malkapur Bus Stand!
        if (res.geofence_status === 'CONFIRMED_ARRIVED') {
          if ('vibrate' in navigator) {
            navigator.vibrate([300, 100, 300]);
          }
        }
      } else if (res.rejected) {
        setServerDiagnostic(`Sample rejected: ${res.message}`);
      } else {
        setErrorMessage(res.message || 'Server rejected GPS update');
      }
    } catch (err: any) {
      setErrorMessage(`Network sync error: ${err.message}. Retrying on next GPS sample...`);
    }
  };

  const selectedBus = buses.find((b) => b.id === selectedBusId);
  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  // Background ping URL for Traccar / OsmAnd GPS app
  const originUrl = window.location.origin;
  const traccarPingUrl = `${originUrl}/api/gps/ping?id=${selectedBus?.bus_number || 'MH-28-BL-4521'}&lat={0}&lon={1}&speed={2}`;

  const copyPingUrl = () => {
    navigator.clipboard.writeText(traccarPingUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-16 font-sans">
      {/* Title & Mobile Header */}
      <div className="bg-linear-to-r from-slate-900 via-slate-900 to-slate-950 text-white p-5 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center font-black shadow-lg shadow-red-900/40">
              <Smartphone className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h1 className="text-base font-extrabold tracking-tight">
                  {t('gps.portalTitle', 'Driver / Crew Mobile GPS Portal')}
                </h1>
              </div>
              <p className="text-xs text-amber-300 font-semibold mt-0.5">
                {t('gps.portalSubtitle', 'MSRTC Onboard Crew Portal · Malkapur Central Bus Stand')}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <SourceBadge source="PHONE_GPS" size="md" />
            {/* Quick in-page language switcher */}
            <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setLanguage('mr-IN')}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  language === 'mr-IN' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                मराठी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi-IN')}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  language === 'hi-IN' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en-IN')}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  language === 'en-IN' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1 rounded-xl mt-4 border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('BROWSER_BEACON')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'BROWSER_BEACON'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 थेट मोबाईल स्क्रीन मोड
          </button>
          <button
            onClick={() => setActiveTab('TRACCAR_APP')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'TRACCAR_APP'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛰️ Traccar / OsmAnd ॲप
          </button>
        </div>
      </div>

      {/* Mandatory Bus Association Advisory Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-1.5 shadow-xs">
        <div className="flex items-center gap-2 font-black text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{t('gps.policyTitle', 'Physical Bus Association Policy')}</span>
        </div>
        <p className="leading-relaxed text-amber-900/90 font-medium">
          {t(
            'gps.policyText',
            'Transmit location only when device is physically mounted on active bus dashboard. Once bus enters within 1.2km of Malkapur, platform bay will allocate automatically.'
          )}
        </p>
      </div>

      {/* Error / Alert Display */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold">GPS Alert:</div>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {activeTab === 'BROWSER_BEACON' ? (
        <>
          {/* Association Selector */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              {t('gps.step1Bus', '1. Select Operating Bus & Trip')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {t('gps.selectBus', 'Select Operating Bus *')}
                </label>
                <select
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  disabled={isTracking}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                >
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.bus_number} — {depotT(bus.depot)} ({busTypeT(bus.bus_type)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {t('gps.selectTrip', 'Select Active Trip *')}
                </label>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  disabled={isTracking}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                >
                  {trips
                    .filter((t) => !selectedBusId || t.bus_id === selectedBusId)
                    .map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.trip_number}: {destT(trip.origin)} ➔ {destT(trip.destination)} ({trip.scheduled_arrival})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {selectedBus && selectedTrip && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900">{selectedBus.bus_number}</div>
                  <div className="text-slate-500 text-[11px]">
                    {selectedTrip.origin} ➔ {selectedTrip.destination}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-teal-700 font-mono">
                    आगमन: {selectedTrip.scheduled_arrival}
                  </div>
                  <div className="text-[11px] text-slate-500">आगार: {selectedBus.depot}</div>
                </div>
              </div>
            )}
          </div>

          {/* Big Action Button & Screen WakeLock Status */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              {t('gps.step2Live', '2. Live Satellite Telemetry')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!isTracking ? (
                <button
                  type="button"
                  onClick={startTracking}
                  className="py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-extrabold tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-700/30 transition-all active:scale-[0.98]"
                >
                  <Radio className="w-5 h-5 animate-pulse text-white shrink-0" />
                  <span>{t('gps.startTransmit', '🔴 थेट GPS सुरू करा')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopTracking}
                  className="py-4 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-extrabold tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-rose-700/30 transition-all active:scale-[0.98]"
                >
                  <Square className="w-5 h-5 fill-white shrink-0" />
                  <span>{t('gps.stopTransmit', 'GPS बंद करा')}</span>
                </button>
              )}

              {!isSimulatingDrive ? (
                <button
                  type="button"
                  onClick={startTestDriveSimulation}
                  disabled={isTracking}
                  className="py-4 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.98]"
                  title="Simulate driving along highway towards Malkapur to test geofence without a physical bus"
                >
                  <Navigation className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>🚗 चाचणी ड्रायव्हिंग सिम्युलेशन</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopTestDriveSimulation}
                  className="py-4 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-[0.98] animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white shrink-0" />
                  <span>सिम्युलेशन थांबवा</span>
                </button>
              )}
            </div>

            {/* Wake Lock & Telemetry Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${isTracking ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}
                />
                <span>
                  {isTracking
                    ? t('gps.statusTransmitting', 'Active: Transmitting real-time GPS')
                    : t('gps.statusIdle', 'Idle: GPS transmission is stopped')}
                </span>
              </div>
              {wakeLockActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px]">
                  <Check className="w-3 h-3 text-teal-600" />
                  <span>{t('gps.wakeLock', 'Screen WakeLock Active')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Real-time Telemetry Dashboard (Speedometer & Distance HUD) */}
          <div className="bg-slate-950 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span>Onboard Instrument Telemetry</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {t('gps.packetsSent', 'Packets')}: {updateCount}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Speedometer */}
              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-center">
                <div className="text-[11px] font-semibold text-slate-400">{t('gps.speed', 'Current Speed')}</div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                  {coords.speed !== null ? `${coords.speed}` : '--'}
                  <span className="text-xs text-slate-400 font-normal ml-1">km/h</span>
                </div>
              </div>

              {/* GPS Accuracy */}
              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-center">
                <div className="text-[11px] font-semibold text-slate-400">{t('gps.accuracy', 'GPS Accuracy')}</div>
                <div
                  className={`text-2xl font-black font-mono mt-1 ${
                    coords.accuracy !== null && coords.accuracy <= 25
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {coords.accuracy !== null ? `±${Math.round(coords.accuracy)}m` : '--'}
                </div>
              </div>

              {/* Distance to Malkapur Bus Stand */}
              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                <div className="text-[11px] font-semibold text-slate-400">
                  {t('gps.distanceToStation', 'Distance to Malkapur')}
                </div>
                <div className="text-2xl font-black text-teal-400 font-mono mt-1">
                  {distanceToStation !== null
                    ? `${(distanceToStation / 1000).toFixed(1)}`
                    : '--'}
                  <span className="text-xs text-slate-400 font-normal ml-1">km</span>
                </div>
              </div>
            </div>

            {/* Geofence Status Ribbon */}
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                geofenceStatus === 'CONFIRMED_ARRIVED'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : geofenceStatus === 'ARRIVAL_CANDIDATE'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 shrink-0" />
                <span className="font-bold">{t('gps.geofenceState', 'Geofence Status')}:</span>
                <span className="font-mono uppercase font-black">{geofenceStatus}</span>
              </div>
              {consecutiveSamples > 0 && (
                <span className="text-[11px] font-bold text-amber-400 font-mono">
                  {consecutiveSamples}/2 Samples
                </span>
              )}
            </div>

            {serverDiagnostic && (
              <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                {serverDiagnostic}
              </p>
            )}

            {lastServerUpdate && (
              <div className="text-[10px] text-slate-500 text-right font-mono">
                अंतिम समक्रमण (Last Sync): {lastServerUpdate}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Alternative Background Traccar / OsmAnd App Integration */
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Radio className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                {t('gps.backgroundAppTitle', 'Background GPS Tracking (Traccar / OsmAnd)')}
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  'gps.backgroundAppDesc',
                  'To send live coordinates 24/7 with phone screen locked, install free Traccar Client or OsmAnd from Play Store and set this Server URL:'
                )}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Traccar Client / OsmAnd Server URL (HTTP GET):
            </label>
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 break-all select-all flex items-center justify-between gap-2">
              <span>{traccarPingUrl}</span>
              <button
                type="button"
                onClick={copyPingUrl}
                className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 shadow-xs shrink-0 transition-colors"
                title="Copy URL"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copiedUrl && (
              <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{t('gps.urlCopied', 'URL Copied!')}</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs text-slate-700">
            <div className="font-extrabold text-slate-900">📲 ३-सोप्या पायऱ्या (Traccar Client Setup):</div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>गुगल प्ले स्टोअरवरून मोफत <strong>Traccar Client</strong> किंवा <strong>OsmAnd</strong> डाऊनलोड करा.</li>
              <li>ॲपमधील <strong>Server URL</strong> च्या जागी वरील कॉपी केलेली URL पेस्ट करा.</li>
              <li><strong>Service status: ON</strong> करा. आता फोन खिशात किंवा डॅशबोर्डवर असला तरी बॅकग्राउंडमध्ये दर ३० सेकंदांनी थेट लोकेशन पाठवले जाईल!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
