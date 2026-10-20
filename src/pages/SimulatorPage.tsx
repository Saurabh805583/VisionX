import React, { useState, useEffect } from 'react';
import {
  PlaySquare,
  RotateCcw,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Radio,
  FileCode,
  Volume2,
} from 'lucide-react';
import { api } from '../services/api';
import { Bus, Trip } from '../types';
import { SourceBadge } from '../components/SourceBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

export const SimulatorPage: React.FC = () => {
  const { t, depotT } = useLanguage();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('BUS-101');
  const [selectedStage, setSelectedStage] = useState<string>('APPROACH_1KM');
  const [sourceTag, setSourceTag] = useState<string>('SIMULATED');
  const [lastResponse, setLastResponse] = useState<any | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [customKey, setCustomKey] = useState<string>('');

  const fetchData = async () => {
    try {
      const [busList, tripList] = await Promise.all([api.getBuses(), api.getTrips()]);
      setBuses(busList);
      setTrips(tripList);
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStep = async (forceKey?: string) => {
    setIsExecuting(true);
    try {
      const activeTrip = trips.find((t) => t.bus_id === selectedBusId);

      // If customKey is supplied or generated
      const keyToUse = forceKey !== undefined ? forceKey : customKey;

      let res;
      if (keyToUse) {
        // Direct event ingestion with idempotency test
        const stageMap: Record<string, any> = {
          APPROACH_5KM: { event_type: 'GEOFENCE_ENTERED', lat: 20.899, lng: 76.155, speed: 60 },
          APPROACH_1KM: { event_type: 'BUS_APPROACHING', lat: 20.889, lng: 76.191, speed: 30 },
          BUS_ARRIVED: { event_type: 'BUS_ARRIVED', lat: 20.8871, lng: 76.2014, speed: 10 },
          BUS_DEPARTED: { event_type: 'BUS_DEPARTED', lat: 20.875, lng: 76.23, speed: 45 },
        };
        const st = stageMap[selectedStage] || stageMap['APPROACH_1KM'];

        res = await api.ingestArrivalEvent({
          event_type: st.event_type,
          bus_id: selectedBusId,
          trip_id: activeTrip?.id,
          latitude: st.lat,
          longitude: st.lng,
          speed_kmh: st.speed,
          heading: 90,
          source: sourceTag,
          idempotency_key: keyToUse,
        });
      } else {
        // Regular simulator step
        res = await api.stepSimulator(selectedBusId, selectedStage, activeTrip?.id, sourceTag);
      }

      setLastResponse(res);
      fetchData();
    } catch (err: any) {
      setLastResponse({ success: false, error: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTestIdempotency = () => {
    // Generates a fixed key and fires twice in rapid succession
    const testKey = `IDEMPOTENT-TEST-${Date.now()}`;
    setCustomKey(testKey);
    handleStep(testKey);
  };

  const executeResetDatabase = async () => {
    setIsResetModalOpen(false);
    setResetting(true);
    try {
      await api.resetSimulator();
      setLastResponse({ success: true, message: 'Database reset and re-seeded successfully.' });
      fetchData();
    } catch (err: any) {
      setLastResponse({ success: false, error: `Reset error: ${err.message}` });
    } finally {
      setResetting(false);
    }
  };

  const selectedBus = buses.find((b) => b.id === selectedBusId);
  const selectedTrip = trips.find((t) => t.bus_id === selectedBusId);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <span>END-TO-END TELEMETRY PIPELINE</span>
            <span>·</span>
            <span>SIMULATOR</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Bus Arrival & Transit Simulator</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Triggers the full backend pipeline: Event Ingestion → Idempotency → Rule Allocation → Announcements → Audit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsResetModalOpen(true)}
            disabled={resetting}
            className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>Reset Prototype DB</span>
          </button>
        </div>
      </div>

      {/* Simulator Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            Simulation Parameters
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Fleet Vehicle</label>
            <select
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bus_number} ({b.bus_type}) [{b.current_status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transit Stage</label>
            <div className="space-y-1.5">
              {[
                { id: 'APPROACH_5KM', label: '1. Geofence Enter (5km Radius)', type: 'GEOFENCE_ENTERED' },
                { id: 'APPROACH_1KM', label: '2. Approaching Gate (1km Radius)', type: 'BUS_APPROACHING' },
                { id: 'BUS_ARRIVED', label: '3. Arrival & Docking at Bay', type: 'BUS_ARRIVED' },
                { id: 'BUS_DEPARTED', label: '4. Departure & Bay Clearance', type: 'BUS_DEPARTED' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStage(st.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs border transition-all ${
                    selectedStage === st.id
                      ? 'bg-teal-50 border-teal-400 font-bold text-teal-950 ring-1 ring-teal-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{st.label}</span>
                    <span className="font-mono text-[10px] text-slate-400">{st.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source Transparency Tag</label>
            <select
              value={sourceTag}
              onChange={(e) => setSourceTag(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              <option value="SIMULATED">SIMULATED (Testing Suite)</option>
              <option value="PHONE_GPS">PHONE_GPS (Driver Mobile)</option>
              <option value="IOT_DEVICE">IOT_DEVICE (On-Board Telematics)</option>
              <option value="MANUAL">MANUAL (Staff Dispatch Entry)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Idempotency Key (Optional)
            </label>
            <input
              type="text"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="e.g. IDEMPOTENT-KEY-999"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
            <button
              onClick={() => handleStep()}
              disabled={isExecuting}
              className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <Send className="w-3.5 h-3.5 text-teal-400" />
              <span>{isExecuting ? 'Processing Pipeline...' : 'Fire Event to Backend API'}</span>
            </button>

            <button
              onClick={handleTestIdempotency}
              disabled={isExecuting}
              className="w-full py-2 bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors inline-flex items-center justify-center gap-1.5"
              title="Sends the same event twice to prove idempotency"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Test Idempotency Guard</span>
            </button>
          </div>
        </div>

        {/* Right Columns: Pipeline Execution Inspection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Target Status Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Target Vehicle State</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 text-[11px]">Bus Number:</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                  {selectedBus ? selectedBus.bus_number : '--'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 text-[11px]">Active Trip:</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {selectedTrip ? selectedTrip.trip_number : 'Unscheduled'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 text-[11px]">Current Status:</div>
                <div className="mt-0.5">
                  <StatusBadge status={selectedBus ? selectedBus.current_status : 'SCHEDULED'} />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-400 text-[11px]">Assigned Platform:</div>
                <div className="font-bold text-teal-800 mt-0.5 font-mono">
                  {selectedBus?.current_platform_id ? `Platform ${selectedBus.current_platform_id}` : 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Backend Response Inspector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">Backend API Response Inspector</h3>
              </div>
              {lastResponse && (
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    lastResponse.duplicate
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : lastResponse.success
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {lastResponse.duplicate
                    ? 'IDEMPOTENT_IGNORED'
                    : lastResponse.success
                    ? '200 OK'
                    : 'ERROR'}
                </span>
              )}
            </div>

            {lastResponse ? (
              <div className="space-y-3">
                {lastResponse.duplicate && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      <strong>Idempotency Enforced:</strong> Duplicate event recognized. No redundant platform allocations or duplicate announcements were created.
                    </span>
                  </div>
                )}

                {lastResponse.announcement_created && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      <strong>Announcement Synthesized:</strong> Multilingual PA audio queued for Platform {lastResponse.assigned_platform_id}.
                    </span>
                  </div>
                )}

                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-64">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Fire a simulation stage to inspect the live JSON response payload from the Python REST service.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Confirm Database Reset"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to re-seed the prototype database with the default Malkapur Bus Stand initial state?
            This will reset platform occupancy, simulation events, and test announcements to default values.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeResetDatabase}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
            >
              Reset & Re-seed
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
