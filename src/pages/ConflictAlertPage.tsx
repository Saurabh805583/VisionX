import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { Alert } from '../types';
import { Modal } from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

export const ConflictAlertPage: React.FC = () => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);
  const [resolverId, setResolverId] = useState('STATION_MASTER_DESK');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const data = await api.getConflicts();
      setAlerts(data);
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setIsSubmitting(true);
    setResolveError(null);
    try {
      await api.resolveConflict(resolvingAlert.id, resolverId);
      setResolvingAlert(null);
      fetchAlerts();
    } catch (err: any) {
      setResolveError(`Resolution error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAlerts = alerts.filter((a) => !a.is_resolved);
  const resolvedAlerts = alerts.filter((a) => a.is_resolved);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
            <span>DISPATCH BOTTLENECK ARBITRATION</span>
            <span>·</span>
            <span>ALERT MANAGEMENT</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Conflict & Alert Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational bottlenecks, platform congestion warnings, and supervisor resolution audit log.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold font-mono">
            {activeAlerts.length} Active Unresolved
          </span>
        </div>
      </div>

      {/* Active Conflicts Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Active Station Conflicts ({activeAlerts.length})</h3>

        {activeAlerts.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <div className="font-bold text-slate-700 text-sm">Station Free of Platform Conflicts</div>
            <p className="text-slate-500 mt-0.5">All 4 platforms are operating within assigned buffer clearances.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 bg-white rounded-xl border border-rose-300 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200">
                      {alert.alert_type}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mt-2">{alert.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.description}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Trip Reference:</span>
                    <span className="font-mono font-bold text-slate-800">{alert.trip_id || 'Global Bay'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => setResolvingAlert(alert)}
                    className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Sign Off & Resolve</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Resolved Alerts */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Resolved Incident Log</h3>
          <span className="text-xs text-slate-400 font-mono">{resolvedAlerts.length} past incidents</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {resolvedAlerts.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No historical conflict records.</div>
          ) : (
            resolvedAlerts.map((ra) => (
              <div key={ra.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500">{ra.id}</span>
                    <span className="font-bold text-slate-800">{ra.title}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{ra.description}</p>
                </div>

                <div className="text-right text-[11px] text-slate-500 font-mono">
                  <div className="font-semibold text-teal-700">Resolved by {ra.resolved_by || 'Supervisor'}</div>
                  <div className="text-slate-400">
                    {ra.resolved_at ? new Date(ra.resolved_at).toLocaleTimeString() : 'Recorded'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={Boolean(resolvingAlert)}
        onClose={() => setResolvingAlert(null)}
        title="Resolve Platform Conflict"
      >
        <form onSubmit={handleResolve} className="space-y-4">
          {resolveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {resolveError}
            </div>
          )}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-900">{resolvingAlert?.title}</div>
            <div className="text-slate-600">{resolvingAlert?.description}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Station Supervisor / Resolver ID *
            </label>
            <input
              type="text"
              required
              value={resolverId}
              onChange={(e) => setResolverId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setResolvingAlert(null)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900"
            >
              Confirm Resolution
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
