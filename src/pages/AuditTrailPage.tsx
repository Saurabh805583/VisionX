import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Search, Filter, Terminal, FileJson } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog, SystemEvent } from '../types';
import { SourceBadge } from '../components/SourceBadge';
import { Modal } from '../components/Modal';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'EVENTS'>('AUDIT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJson, setSelectedJson] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      const [logList, eventList] = await Promise.all([api.getAuditLogs(), api.getEvents()]);
      setLogs(logList);
      setEvents(eventList);
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = events.filter(
    (e) =>
      e.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.bus_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.event_uuid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <span>IMMUTABLE LEDGER</span>
            <span>·</span>
            <span>SYSTEM AUDIT TRAIL</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Event History & Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident log of platform assignments, dispatch overrides, and telemetry ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'AUDIT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Staff & System Actions ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('EVENTS')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'EVENTS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Ingested Events ({events.length})
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, actor, UUID, bus ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main Table */}
      {activeTab === 'AUDIT' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Log ID</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity Type</th>
                  <th className="py-2.5 px-4">Entity ID</th>
                  <th className="py-2.5 px-4">Actor / Signature</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">{l.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 font-mono">{l.action}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.entity_type}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{l.entity_id}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-semibold font-mono text-[11px]">
                        {l.actor}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedJson(JSON.parse(l.details_json || '{}'))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-mono transition-colors inline-flex items-center gap-1"
                      >
                        <FileJson className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Event UUID</th>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Bus ID</th>
                  <th className="py-2.5 px-4">Trip ID</th>
                  <th className="py-2.5 px-4">Platform</th>
                  <th className="py-2.5 px-4">Source</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.event_uuid}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{e.event_type}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{e.bus_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{e.trip_id || '—'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {e.platform_id ? `Platform ${e.platform_id}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <SourceBadge source={e.source} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedJson(JSON.parse(e.payload_json || '{}'))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-mono transition-colors inline-flex items-center gap-1"
                      >
                        <FileJson className="w-3 h-3" />
                        <span>Payload</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON Inspection Modal */}
      <Modal
        isOpen={Boolean(selectedJson)}
        onClose={() => setSelectedJson(null)}
        title="Event / Audit Details JSON"
        maxWidth="lg"
      >
        <pre className="p-4 bg-slate-950 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-96">
          {JSON.stringify(selectedJson, null, 2)}
        </pre>
      </Modal>
    </div>
  );
};
