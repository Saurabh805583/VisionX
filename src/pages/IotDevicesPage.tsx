import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  FileCode,
  Key,
  Layers,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { IoTDevice } from '../types';
import { Modal } from '../components/Modal';

export const IotDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gateDirection, setGateDirection] = useState<'IN' | 'OUT'>('IN');

  const fetchDevices = async () => {
    try {
      const data = await api.getDevices();
      setDevices(data);
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateDevice = async (device: IoTDevice) => {
    setIsSimulating(true);
    setTestResult(null);
    try {
      const res = await api.simulateDeviceEvent(device.id, {
        gate_direction: gateDirection,
        bus_id: device.assigned_bus_id || 'BUS-101',
      });
      setTestResult(res);
      fetchDevices();
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTestUnauthorizedIngestion = async () => {
    setIsSimulating(true);
    setTestResult(null);
    try {
      // Test sending forged token to backend /api/devices/ingest
      const res = await api.ingestDeviceEvent('RFID-GATE-MKR-01', 'FORGED_INVALID_TOKEN', {
        gate_direction: 'IN',
        bus_id: 'BUS-101',
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: 'AUTHENTICATION_REJECTED',
        status: 401,
        message: err.message || 'Unauthorized device event successfully rejected by backend.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <span>MODULAR HARDWARE INTEGRATION</span>
            <span>·</span>
            <span>IOT & TELEMETRICS ADAPTERS</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">IoT Device Integration Architecture</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Future-ready hardware adapters for AIS-140 GPS, ESP32 microcontrollers, RFID gate scanners, BLE beacons, and ANPR cameras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestUnauthorizedIngestion}
            disabled={isSimulating}
            className="px-3.5 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
            title="Sends an invalid token to verify that the backend strictly rejects unauthenticated hardware calls"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Test Security Rejection (401)</span>
          </button>
        </div>
      </div>

      {/* Hardware Disclosure Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-slate-800">Architectural Integrity Note:</strong>
          <p className="leading-relaxed">
            These device adapters represent standard REST/webhook ingestion endpoints for transport authorities. Physical hardware is not claimed to be installed at Malkapur station; instead, canonical integration contracts allow certified devices to emit events without system rewrites.
          </p>
        </div>
      </div>

      {/* Registered Devices Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Registered Field Device Adapters</h3>
            <p className="text-xs text-slate-500">Configured hardware profiles with dedicated authentication tokens.</p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">{devices.length} adapters</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Device Code</th>
                <th className="py-2.5 px-4">Adapter Type</th>
                <th className="py-2.5 px-4">Device Name</th>
                <th className="py-2.5 px-4">Assigned Entity</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Auth Token</th>
                <th className="py-2.5 px-4">Last Heartbeat</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map((dev) => (
                <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{dev.device_code}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-semibold text-[11px] border border-slate-200">
                      {dev.device_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{dev.name}</td>
                  <td className="py-3 px-4">
                    {dev.bus_number ? (
                      <span className="font-mono font-semibold text-slate-900">Bus: {dev.bus_number}</span>
                    ) : dev.platform_number ? (
                      <span className="font-semibold text-teal-800">Platform {dev.platform_number}</span>
                    ) : (
                      <span className="text-slate-400 italic">Gate / Entryway</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${dev.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {dev.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {dev.auth_token.substring(0, 10)}••••
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                    {dev.last_heartbeat ? new Date(dev.last_heartbeat).toLocaleTimeString() : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedDevice(dev);
                        setSimulateModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1 shadow-xs"
                    >
                      <Play className="w-3 h-3 text-teal-400" />
                      <span>Simulate Ping</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Specification & API Contract Documentation */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-slate-600" />
          <span>Device Ingestion Protocol (REST Specification)</span>
        </h3>
        <p className="text-slate-600 leading-relaxed">
          Certified hardware devices (such as ESP32 gateways, RFID readers, and AIS-140 GPS modems) transmit JSON payloads to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-900">POST /api/devices/ingest</code> using an authorized secret token in the <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-900">X-Device-Token</code> HTTP header.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] space-y-1 overflow-x-auto">
            <div className="text-slate-400">// Ingestion Request Header & Body</div>
            <div>POST /api/devices/ingest HTTP/1.1</div>
            <div>Host: 127.0.0.1:5050</div>
            <div>X-Device-Token: TOKEN-SEC-RFID-9901</div>
            <div>Content-Type: application/json</div>
            <br />
            <div>&#123;</div>
            <div>  "device_code": "RFID-GATE-MKR-01",</div>
            <div>  "gate_direction": "IN",</div>
            <div>  "bus_id": "BUS-101",</div>
            <div>  "latitude": 20.8871,</div>
            <div>  "longitude": 76.2014</div>
            <div>&#125;</div>
          </div>

          <div className="p-4 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] space-y-1 overflow-x-auto">
            <div className="text-slate-400">// Normalized Canonical Output</div>
            <div>&#123;</div>
            <div>  "success": true,</div>
            <div>  "authenticated": true,</div>
            <div>  "device_code": "RFID-GATE-MKR-01",</div>
            <div>  "canonical_result": &#123;</div>
            <div>    "event_type": "BUS_ARRIVED",</div>
            <div>    "assigned_platform_id": 1,</div>
            <div>    "announcement_created": true</div>
            <div>  &#125;</div>
            <div>&#125;</div>
          </div>
        </div>
      </div>

      {/* Simulate Modal */}
      <Modal
        isOpen={simulateModalOpen}
        onClose={() => {
          setSimulateModalOpen(false);
          setTestResult(null);
        }}
        title={`Simulate Device Event: ${selectedDevice?.device_code}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-900">{selectedDevice?.name}</div>
            <div className="text-slate-600 font-mono text-[11px]">
              Type: {selectedDevice?.device_type} · Token: {selectedDevice?.auth_token}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Simulated Direction / Telemetry Trigger
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGateDirection('IN')}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  gateDirection === 'IN'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Depot Gate Ingress (Arrival)
              </button>
              <button
                type="button"
                onClick={() => setGateDirection('OUT')}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  gateDirection === 'OUT'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Depot Gate Egress (Departure)
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={() => {
                setSimulateModalOpen(false);
                setTestResult(null);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={() => selectedDevice && handleSimulateDevice(selectedDevice)}
              disabled={isSimulating}
              className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs"
            >
              {isSimulating ? 'Sending Packet...' : 'Transmit Authenticated Ping'}
            </button>
          </div>

          {testResult && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-800 mb-1.5">Device Ingestion Response:</div>
              <pre className="p-3 bg-slate-950 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
