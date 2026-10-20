import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Radio, Send, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { api } from '../services/api';
import { Bus, Trip, Platform } from '../types';

export const StaffOperationsPage: React.FC = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [activeStaffUser, setActiveStaffUser] = useState({
    id: 'SM-MKR-041',
    name: 'S. N. Ingle',
    role: 'Station Master / Chief Controller',
    shift: 'Morning Shift (06:00 — 14:00)',
  });

  // Manual Dispatch Form
  const [manualBusId, setManualBusId] = useState('');
  const [manualPlatformId, setManualPlatformId] = useState(1);
  const [manualReason, setManualReason] = useState('Manual physical bay docking by ground supervisor');
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [busList, tripList, platList] = await Promise.all([
        api.getBuses(),
        api.getTrips(),
        api.getPlatforms(),
      ]);
      setBuses(busList);
      setTrips(tripList);
      setPlatforms(platList);
      if (!manualBusId && busList.length > 0) {
        setManualBusId(busList[0].id);
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBusId) return;
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      const activeTrip = trips.find((t) => t.bus_id === manualBusId);

      const res = await api.ingestArrivalEvent({
        event_type: 'BUS_ARRIVED',
        bus_id: manualBusId,
        trip_id: activeTrip?.id,
        requested_platform_id: manualPlatformId,
        source: 'MANUAL',
        override_reason: manualReason,
        operator_id: activeStaffUser.id,
      });

      setSubmitStatus(`Manual arrival committed! Event UUID: ${res.event_uuid} · Platform ${manualPlatformId} locked.`);
      fetchData();
    } catch (err: any) {
      setSubmitStatus(`Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <span>STATION CONTROL DESK</span>
            <span>·</span>
            <span>STAFF ADMINISTRATION</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Admin & Staff Operations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational duty roster, shift management, and manual dispatch console for Malkapur Bus Stand.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-mono">
            Active Shift: Morning (A)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Duty Officer Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            Active Duty Personnel
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 block">Duty Staff ID:</label>
              <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{activeStaffUser.id}</div>
            </div>

            <div>
              <label className="text-slate-500 block">Officer Name:</label>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{activeStaffUser.name}</div>
            </div>

            <div>
              <label className="text-slate-500 block">Designation / Role:</label>
              <div className="font-medium text-teal-800 mt-0.5">{activeStaffUser.role}</div>
            </div>

            <div>
              <label className="text-slate-500 block">Shift Timing:</label>
              <div className="font-mono text-slate-700 mt-0.5">{activeStaffUser.shift}</div>
            </div>
          </div>

          {/* Quick Roster Switcher */}
          <div className="pt-3 border-t border-slate-200">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Switch Station Operator Profile:
            </label>
            <div className="space-y-1">
              {[
                { id: 'SM-MKR-041', name: 'S. N. Ingle', role: 'Station Master / Chief Controller' },
                { id: 'SUP-MKR-102', name: 'R. K. Patil', role: 'Platform Supervisor (Ground Bay)' },
                { id: 'TC-MKR-209', name: 'A. V. Deshmukh', role: 'Traffic Controller (Depot Liaison)' },
              ].map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() =>
                    setActiveStaffUser({
                      id: staff.id,
                      name: staff.name,
                      role: staff.role,
                      shift: activeStaffUser.shift,
                    })
                  }
                  className={`w-full text-left p-2 rounded-lg text-xs border transition-colors ${
                    activeStaffUser.id === staff.id
                      ? 'bg-teal-50 border-teal-300 font-bold text-teal-950'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{staff.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{staff.id}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">{staff.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Manual Dispatch Entry Console */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            Manual Arrival Entry & Bay Allocation Console
          </h3>
          <p className="text-xs text-slate-500">
            Used when automated GPS or sensor telemetry is offline. Ingests a MANUAL source event through the central pipeline.
          </p>

          {submitStatus && (
            <div className={`p-3 rounded-lg text-xs ${submitStatus.startsWith('Manual') ? 'bg-teal-50 text-teal-900 border border-teal-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              {submitStatus}
            </div>
          )}

          <form onSubmit={handleManualDispatch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arriving Fleet Bus *
                </label>
                <select
                  value={manualBusId}
                  onChange={(e) => setManualBusId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                >
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number} — {b.bus_type} [{b.current_status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designate Platform Bay *
                </label>
                <select
                  value={manualPlatformId}
                  onChange={(e) => setManualPlatformId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                >
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      Platform {p.platform_number} ({p.name}) [{p.status}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manual Entry Reason / Notes *
              </label>
              <textarea
                rows={3}
                required
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="e.g. Bus arrived at depot gate without GPS ping; manual platform lock authorized."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Source Tag: <strong>MANUAL</strong> · Operator: <strong>{activeStaffUser.id}</strong>
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2 shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-teal-400" />
                <span>Confirm Manual Dispatch & Bay Docking</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
