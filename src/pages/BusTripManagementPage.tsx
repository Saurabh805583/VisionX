import React, { useState, useEffect } from 'react';
import {
  Bus,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  Edit2,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { Bus as BusType, Trip, Depot } from '../types';
import { SourceBadge } from '../components/SourceBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

export const BusTripManagementPage: React.FC = () => {
  const { t, depotT } = useLanguage();
  const [buses, setBuses] = useState<BusType[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BUSES' | 'TRIPS' | 'DEPOTS'>('BUSES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepotFilter, setSelectedDepotFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Bus Registration/Edit Modal
  const [isBusModalOpen, setIsBusModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<BusType | null>(null);
  const [busFormData, setBusFormData] = useState<{
    bus_number: string;
    depot_id: string;
    depot: string;
    bus_type: string;
    capacity: number;
    current_status: string;
    source: 'MANUAL' | 'SIMULATED';
    notes: string;
  }>({
    bus_number: '',
    depot_id: 'DEPOT-MKR',
    depot: 'Malkapur Depot',
    bus_type: 'Ordinary Parivahan (Lalpari)',
    capacity: 45,
    current_status: 'SCHEDULED',
    source: 'MANUAL',
    notes: '',
  });
  const [busFormError, setBusFormError] = useState<string | null>(null);

  // Depot Registration Modal
  const [isDepotModalOpen, setIsDepotModalOpen] = useState(false);
  const [depotFormData, setDepotFormData] = useState<{
    depot_code: string;
    name: string;
    name_mr: string;
    name_hi: string;
    division: string;
    region: string;
    contact_phone: string;
  }>({
    depot_code: '',
    name: '',
    name_mr: '',
    name_hi: '',
    division: 'Buldhana Division',
    region: 'Amravati Region',
    contact_phone: '',
  });
  const [depotFormError, setDepotFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [busList, tripList, depotList] = await Promise.all([
        api.getBuses(),
        api.getTrips(),
        api.getDepots(),
      ]);
      setBuses(busList);
      setTrips(tripList);
      setDepots(depotList);
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const openAddBusModal = () => {
    setEditingBus(null);
    setBusFormData({
      bus_number: '',
      depot_id: 'DEPOT-MKR',
      depot: 'Malkapur Depot',
      bus_type: 'Ordinary Parivahan (Lalpari)',
      capacity: 45,
      current_status: 'SCHEDULED',
      source: 'MANUAL',
      notes: '',
    });
    setBusFormError(null);
    setIsBusModalOpen(true);
  };

  const openEditBusModal = (b: BusType) => {
    setEditingBus(b);
    setBusFormData({
      bus_number: b.bus_number,
      depot_id: b.depot_id || 'UNRECORDED',
      depot: b.operating_depot || b.depot || 'Depot not recorded',
      bus_type: b.bus_type,
      capacity: b.capacity,
      current_status: b.current_status,
      source: (b.source === 'PHONE_GPS' ? 'MANUAL' : b.source) as any,
      notes: b.notes || '',
    });
    setBusFormError(null);
    setIsBusModalOpen(true);
  };

  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busFormData.bus_number.trim()) {
      setBusFormError('Bus registration number (e.g. MH-20-BL-1402) is required.');
      return;
    }

    try {
      const depotName =
        busFormData.depot_id === 'UNRECORDED'
          ? 'Depot not recorded'
          : depots.find((d) => d.id === busFormData.depot_id)?.name || busFormData.depot;

      const payload = {
        bus_number: busFormData.bus_number.trim().toUpperCase(),
        depot: depotName,
        depot_id: busFormData.depot_id === 'UNRECORDED' ? null : busFormData.depot_id,
        bus_type: busFormData.bus_type,
        capacity: Number(busFormData.capacity),
        current_status: busFormData.current_status as any,
        source: busFormData.source,
        notes: busFormData.notes,
      };

      if (editingBus) {
        await api.updateBus(editingBus.id, payload);
      } else {
        await api.createBus(payload);
      }

      setIsBusModalOpen(false);
      setBusFormError(null);
      fetchData();
    } catch (err: any) {
      setBusFormError(err.message || 'Failed to save bus record');
    }
  };

  const handleCreateDepot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depotFormData.name.trim()) {
      setDepotFormError('Depot name is required.');
      return;
    }

    try {
      await api.createDepot({
        depot_code: depotFormData.depot_code.trim().toUpperCase() || `DEP-${Date.now()}`,
        name: depotFormData.name.trim(),
        name_mr: depotFormData.name_mr.trim() || depotFormData.name.trim(),
        name_hi: depotFormData.name_hi.trim() || depotFormData.name.trim(),
        division: depotFormData.division.trim(),
        region: depotFormData.region.trim(),
        contact_phone: depotFormData.contact_phone.trim(),
      });

      setIsDepotModalOpen(false);
      setDepotFormData({
        depot_code: '',
        name: '',
        name_mr: '',
        name_hi: '',
        division: 'Buldhana Division',
        region: 'Amravati Region',
        contact_phone: '',
      });
      setDepotFormError(null);
      fetchData();
    } catch (err: any) {
      setDepotFormError(err.message || 'Failed to register depot');
    }
  };

  // Filtered lists
  const filteredBuses = buses.filter((b) => {
    const matchesSearch =
      b.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.operating_depot || b.depot || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bus_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepot =
      selectedDepotFilter === 'ALL' ||
      (selectedDepotFilter === 'UNRECORDED'
        ? !b.depot_id || b.depot === 'Depot not recorded'
        : b.depot_id === selectedDepotFilter || b.depot.includes(selectedDepotFilter));

    const matchesStatus =
      selectedStatusFilter === 'ALL' || b.current_status === selectedStatusFilter;

    return matchesSearch && matchesDepot && matchesStatus;
  });

  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      t.trip_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.bus_number && t.bus_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.operating_depot && t.operating_depot.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDepot =
      selectedDepotFilter === 'ALL' ||
      (selectedDepotFilter === 'UNRECORDED'
        ? !t.operating_depot || t.operating_depot === 'Depot not recorded'
        : (t.operating_depot || '').includes(selectedDepotFilter) || t.depot_id === selectedDepotFilter);

    const matchesStatus =
      selectedStatusFilter === 'ALL' || t.status === selectedStatusFilter;

    return matchesSearch && matchesDepot && matchesStatus;
  });

  const filteredDepots = depots.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.depot_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.division.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {t('fleet.title', 'Bus Fleet & Multi-Depot Operations')}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {t('depot.stationNotice', 'Malkapur Station services buses originating from multiple operating depots. Operating Depot and Platform Bay are recorded distinctly.')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented view switch */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('BUSES')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'BUSES'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('depot.fleetTab', 'Fleet Inventory')} ({buses.length})
            </button>
            <button
              onClick={() => setActiveTab('TRIPS')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'TRIPS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('depot.tripsTab', 'Trip Schedule')} ({trips.length})
            </button>
            <button
              onClick={() => setActiveTab('DEPOTS')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'DEPOTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('depot.depotsTab', 'Registered Depots')} ({depots.length})
            </button>
          </div>

          {activeTab === 'DEPOTS' ? (
            <button
              onClick={() => setIsDepotModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('depot.registerNew', 'Register Depot')}</span>
            </button>
          ) : (
            <button
              onClick={openAddBusModal}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('fleet.registerBus', 'Register Bus')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              activeTab === 'DEPOTS'
                ? 'Search depot name, code, division...'
                : 'Search registration number, operating depot, destination...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Filters if not on depots tab */}
        {activeTab !== 'DEPOTS' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Depot filter dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDepotFilter}
                onChange={(e) => setSelectedDepotFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="ALL">{t('depot.allDepots', 'All Operating Depots')}</option>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.division})
                  </option>
                ))}
                <option value="UNRECORDED">{t('depot.unrecorded', 'Depot not recorded')}</option>
              </select>
            </div>

            {/* Status filter dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="ALL">{t('action.all', 'All Statuses')}</option>
                <option value="SCHEDULED">{t('status.SCHEDULED', 'Scheduled')}</option>
                <option value="APPROACHING">{t('status.APPROACHING', 'Approaching')}</option>
                <option value="AT_PLATFORM">{t('status.AT_PLATFORM', 'At Platform')}</option>
                <option value="DEPARTED">{t('status.DEPARTED', 'Departed')}</option>
              </select>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-400 font-mono shrink-0">
          {activeTab === 'BUSES'
            ? `${filteredBuses.length} / ${buses.length} buses`
            : activeTab === 'TRIPS'
            ? `${filteredTrips.length} / ${trips.length} trips`
            : `${filteredDepots.length} depots`}
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'BUSES' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">{t('fleet.busNumber', 'Registration Number')}</th>
                  <th className="py-2.5 px-4">{t('depot.operatingDepot', 'Operating Depot')}</th>
                  <th className="py-2.5 px-4">{t('fleet.busType', 'Class / Bus Type')}</th>
                  <th className="py-2.5 px-4">{t('fleet.capacity', 'Capacity')}</th>
                  <th className="py-2.5 px-4">{t('fleet.status', 'Current Status')}</th>
                  <th className="py-2.5 px-4">Platform at Malkapur</th>
                  <th className="py-2.5 px-4">{t('fleet.source', 'Data Source')}</th>
                  <th className="py-2.5 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBuses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {t('fleet.noBuses', 'No fleet records found.')}
                    </td>
                  </tr>
                ) : (
                  filteredBuses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                        {b.bus_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {depotT(b.operating_depot || b.depot)}
                        </div>
                        {b.depot_division && (
                          <div className="text-[11px] text-slate-400 font-medium">
                            {b.depot_division}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{b.bus_type}</span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {b.capacity} seats
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={b.current_status} />
                      </td>
                      <td className="py-3 px-4">
                        {b.current_platform_id ? (
                          <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 font-mono font-bold rounded border border-teal-200">
                            Bay {b.current_platform_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <SourceBadge source={b.source} />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => openEditBusModal(b)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                          title="Edit bus depot or details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'TRIPS' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">{t('fleet.tripNumber', 'Trip Number')}</th>
                  <th className="py-2.5 px-4">{t('fleet.busNumber', 'Bus Assigned')}</th>
                  <th className="py-2.5 px-4">{t('depot.operatingDepot', 'Operating Depot')}</th>
                  <th className="py-2.5 px-4">{t('fleet.destination', 'Route / Destination')}</th>
                  <th className="py-2.5 px-4">{t('fleet.scheduledArrival', 'Arrival')}</th>
                  <th className="py-2.5 px-4">{t('fleet.scheduledDeparture', 'Departure')}</th>
                  <th className="py-2.5 px-4">Platform at Malkapur</th>
                  <th className="py-2.5 px-4">{t('fleet.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {t('fleet.noTrips', 'No scheduled trips found.')}
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((tItem) => (
                    <tr key={tItem.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {tItem.trip_number}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {tItem.bus_number || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {depotT(tItem.operating_depot)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tItem.destination}</div>
                        <div className="text-[11px] text-slate-400">{tItem.route_name || tItem.origin}</div>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {tItem.scheduled_arrival}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {tItem.scheduled_departure}
                      </td>
                      <td className="py-3 px-4">
                        {tItem.platform_number ? (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-mono font-bold rounded border border-amber-300">
                            Bay {tItem.platform_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={tItem.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'DEPOTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepots.map((depot) => {
            const count = buses.filter((b) => b.depot_id === depot.id || b.depot === depot.name).length;
            return (
              <div
                key={depot.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-bold border border-slate-200">
                      {depot.depot_code}
                    </span>
                    <span className="text-xs text-teal-600 font-semibold font-mono">
                      {count} {t('depot.associatedBuses', 'Buses')}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{depot.name}</h3>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    {depot.name_mr || depot.name}
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{depot.division} · {depot.region}</span>
                    </div>
                    {depot.contact_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{depot.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>MSRTC Regional Network</span>
                  <span className="text-teal-600 font-medium">Registered Active</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bus Modal (Create or Edit) */}
      <Modal
        isOpen={isBusModalOpen}
        onClose={() => setIsBusModalOpen(false)}
        title={editingBus ? `Edit Bus (${editingBus.bus_number})` : t('fleet.registerBus', 'Register Bus')}
      >
        <form onSubmit={handleSaveBus} className="space-y-4 text-xs">
          {busFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {busFormError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Registration Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. MH-20-BL-1402"
              value={busFormData.bus_number}
              onChange={(e) => setBusFormData({ ...busFormData, bus_number: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Operating Depot <span className="text-slate-400 font-normal">(Separate from current station)</span>
            </label>
            <select
              value={busFormData.depot_id}
              onChange={(e) => setBusFormData({ ...busFormData, depot_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            >
              {depots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.division})
                </option>
              ))}
              <option value="UNRECORDED">{t('depot.unrecorded', 'Depot not recorded')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bus Class / Type</label>
              <select
                value={busFormData.bus_type}
                onChange={(e) => setBusFormData({ ...busFormData, bus_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              >
                <option value="Ordinary Parivahan (Lalpari)">Ordinary Parivahan (Lalpari)</option>
                <option value="Shivshahi AC">Shivshahi AC</option>
                <option value="Hirkani Semi-Luxury">Hirkani Semi-Luxury</option>
                <option value="Asiad Seater 2x2">Asiad Seater 2x2</option>
                <option value="Ordinary Express">Ordinary Express</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Seating Capacity</label>
              <input
                type="number"
                min="20"
                max="65"
                value={busFormData.capacity}
                onChange={(e) => setBusFormData({ ...busFormData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Operational Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Inbound from Akola route, regular maintenance completed."
              value={busFormData.notes}
              onChange={(e) => setBusFormData({ ...busFormData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBusModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100"
            >
              {t('action.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
            >
              {t('action.save', 'Save Bus')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Depot Modal */}
      <Modal
        isOpen={isDepotModalOpen}
        onClose={() => setIsDepotModalOpen(false)}
        title={t('depot.registerNew', 'Register New Operating Depot')}
      >
        <form onSubmit={handleCreateDepot} className="space-y-4 text-xs">
          {depotFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {depotFormError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Depot Name (English) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Khamgaon Depot"
                value={depotFormData.name}
                onChange={(e) => setDepotFormData({ ...depotFormData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Depot Code
              </label>
              <input
                type="text"
                placeholder="e.g. KHM-03"
                value={depotFormData.depot_code}
                onChange={(e) => setDepotFormData({ ...depotFormData, depot_code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Name (मराठी)</label>
              <input
                type="text"
                placeholder="उदा. खामगाव आगार"
                value={depotFormData.name_mr}
                onChange={(e) => setDepotFormData({ ...depotFormData, name_mr: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Name (हिंदी)</label>
              <input
                type="text"
                placeholder="उदा. खामगांव डिपो"
                value={depotFormData.name_hi}
                onChange={(e) => setDepotFormData({ ...depotFormData, name_hi: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Division</label>
              <input
                type="text"
                placeholder="e.g. Buldhana Division"
                value={depotFormData.division}
                onChange={(e) => setDepotFormData({ ...depotFormData, division: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                placeholder="e.g. 07263-252110"
                value={depotFormData.contact_phone}
                onChange={(e) => setDepotFormData({ ...depotFormData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDepotModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100"
            >
              {t('action.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
            >
              {t('action.save', 'Register Depot')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
