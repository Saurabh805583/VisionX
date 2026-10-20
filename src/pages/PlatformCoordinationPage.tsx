import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { Platform, Trip } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

export const PlatformCoordinationPage: React.FC = () => {
  const { t, depotT } = useLanguage();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Override Form
  const [overridePlatformId, setOverridePlatformId] = useState<number>(1);
  const [overrideReason, setOverrideReason] = useState<string>('Supervisor traffic redistribution');
  const [overrideActor, setOverrideActor] = useState<string>('STAFF_SUPERVISOR_S_INGLE');
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [platList, tripList] = await Promise.all([api.getPlatforms(), api.getTrips()]);
      setPlatforms(platList);
      setTrips(tripList);
      if (!selectedTripId && tripList.length > 0) {
        setSelectedTripId(tripList[0].id);
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleEvaluate = async () => {
    if (!selectedTripId) return;
    setIsEvaluating(true);
    try {
      const res = await api.recommendPlatform(selectedTripId);
      setEvaluationResult(res);
    } catch (err: any) {
      setEvaluationResult({
        success: false,
        conflict_detected: true,
        recommendation_reason: err.message,
        candidate_evaluations: [],
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApproveRecommendation = async () => {
    if (!evaluationResult || !evaluationResult.recommended_platform_id) return;
    try {
      await api.overridePlatform(
        selectedTripId,
        evaluationResult.recommended_platform_id,
        `Approved rule recommendation: ${evaluationResult.recommendation_reason}`,
        overrideActor
      );
      setEvaluationResult(null);
      setActionError(null);
      fetchData();
    } catch (err: any) {
      setActionError(`Approval failed: ${err.message}`);
    }
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideStatus('Reason is mandatory for manual audit trail.');
      return;
    }
    try {
      await api.overridePlatform(selectedTripId, overridePlatformId, overrideReason, overrideActor);
      setOverrideModalOpen(false);
      setEvaluationResult(null);
      setOverrideStatus(null);
      fetchData();
    } catch (err: any) {
      setOverrideStatus(`Override error: ${err.message}`);
    }
  };

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  return (
    <div className="space-y-6">
      {/* Title & Rules Framework Explanation */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
          <span>DETERMINISTIC ALLOCATION SERVICE</span>
          <span>·</span>
          <span>RULE-BASED ARBITRATION</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mt-1">Platform Coordination Engine</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Automated Bay Management enforcing 10-minute clearance buffers, route corridor priority, and zero silent conflicts.
        </p>
      </div>

      {/* Visual Platform Bays Layout (Bays 1 - 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {platforms.map((plat) => {
          const isOccupied = plat.status === 'OCCUPIED';
          return (
            <div
              key={plat.id}
              className={`p-5 rounded-xl border transition-all ${
                isOccupied
                  ? 'bg-slate-50 border-teal-300 ring-2 ring-teal-100'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-sm flex items-center justify-center font-mono">
                    P{plat.platform_number}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{plat.name}</h3>
                    <div className="text-[10px] text-slate-400 font-mono">Bay Length: {plat.length_meters}m</div>
                  </div>
                </div>
                <StatusBadge status={plat.status} size="sm" />
              </div>

              {/* Bay Details */}
              <div className="mt-3 text-xs space-y-2">
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Corridor Alignment:</span>
                  <p className="text-slate-600 mt-0.5">{plat.preferred_corridor || 'Universal Link'}</p>
                </div>

                {isOccupied ? (
                  <div className="p-3 bg-white rounded-lg border border-teal-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Docked Bus:</span>
                      <span className="font-bold text-slate-900 font-mono">{plat.bus_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Destination:</span>
                      <span className="font-semibold text-teal-800">{plat.destination}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Dep. Slot:</span>
                      <span className="font-mono tabular-nums text-slate-800 font-bold">
                        {plat.scheduled_departure}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 text-center text-xs">
                    <div className="text-emerald-800 font-bold">Platform Bay Clear</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">Ready for arrival assignment</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Platform Allocation Tester & Engine Console */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Deterministic Allocation Evaluator</h3>
            <p className="text-xs text-slate-500">
              Select an upcoming trip to trigger the backend rule evaluation service.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTripId}
              onChange={(e) => {
                setSelectedTripId(e.target.value);
                setEvaluationResult(null);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trip_number} — {t.destination} ({t.bus_number}) [{t.status}]
                </option>
              ))}
            </select>

            <button
              onClick={handleEvaluate}
              disabled={isEvaluating || !selectedTripId}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Evaluate Rules</span>
            </button>

            <button
              onClick={() => setOverrideModalOpen(true)}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Staff Override</span>
            </button>
          </div>
        </div>

        {/* Selected Trip Snapshot */}
        {selectedTrip && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">Active Trip: </span>
              <strong className="text-slate-900 font-mono">{selectedTrip.trip_number}</strong>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-500">Destination: </span>
              <strong className="text-slate-900">{selectedTrip.destination}</strong>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-500">Vehicle: </span>
              <span className="font-mono font-bold text-slate-800">{selectedTrip.bus_number}</span> ({selectedTrip.bus_type})
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Current Bay:</span>
              <span className="font-bold text-slate-900">
                {selectedTrip.platform_number ? `Platform ${selectedTrip.platform_number}` : 'None Assigned'}
              </span>
            </div>
          </div>
        )}

        {/* Evaluation Output Card */}
        {evaluationResult && (
          <div
            className={`p-5 rounded-xl border ${
              evaluationResult.conflict_detected
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-teal-50/60 border-teal-300 text-teal-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-current/20">
              <div className="flex items-center gap-2.5">
                {evaluationResult.conflict_detected ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                )}
                <div>
                  <h4 className="text-sm font-bold">
                    {evaluationResult.conflict_detected
                      ? 'Platform Conflict Alert: Manual Intervention Required'
                      : `Recommended: Platform ${evaluationResult.recommended_platform_id}`}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">{evaluationResult.recommendation_reason}</p>
                </div>
              </div>

              {!evaluationResult.conflict_detected && (
                <button
                  onClick={handleApproveRecommendation}
                  className="px-4 py-2 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900 transition-colors shadow-xs whitespace-nowrap shrink-0"
                >
                  Approve Platform {evaluationResult.recommended_platform_id}
                </button>
              )}
            </div>

            {/* Candidate Breakdown */}
            {evaluationResult.candidate_evaluations && evaluationResult.candidate_evaluations.length > 0 && (
              <div className="mt-4 pt-1">
                <div className="text-xs font-bold uppercase tracking-wide opacity-80 mb-2">
                  Deterministic Bay Scoring Matrix:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {evaluationResult.candidate_evaluations.map((cand: any) => (
                    <div
                      key={cand.platform_id}
                      className={`p-3 rounded-lg border text-xs ${
                        cand.platform_id === evaluationResult.recommended_platform_id
                          ? 'bg-white border-teal-400 font-medium shadow-xs'
                          : 'bg-white/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>Platform {cand.platform_number}</span>
                        <span className="font-mono">Score: {cand.score}</span>
                      </div>
                      <div className="mt-1 text-[11px] opacity-80">
                        {cand.reasons && cand.reasons.length > 0
                          ? cand.reasons.join(' · ')
                          : 'Occupied or excluded by clearance buffer.'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staff Override Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Staff Platform Override / Emergency Allocation"
      >
        <form onSubmit={handleApplyOverride} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Mandatory Audit Requirement:</strong> Manual overrides bypass automated rule arbitration and are logged in the immutable audit trail with your Staff ID and timestamp.
          </div>

          {overrideStatus && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {overrideStatus}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Platform Bay *</label>
            <select
              value={overridePlatformId}
              onChange={(e) => setOverridePlatformId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            >
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  Platform {p.platform_number} ({p.name}) [{p.status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Supervisor / Staff ID *</label>
            <input
              type="text"
              required
              value={overrideActor}
              onChange={(e) => setOverrideActor(e.target.value)}
              placeholder="e.g. STAFF_SUPERVISOR_S_INGLE"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operational Override Justification *
            </label>
            <textarea
              required
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why this bay was manually designated (e.g. VIP express clearance, mechanical breakdown on primary platform)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setOverrideModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800"
            >
              Commit Staff Override
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
