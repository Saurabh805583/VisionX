import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  MapPin,
  Clock,
  AlertTriangle,
  PlaySquare,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Building2,
  CheckCircle2,
  Radio,
  MonitorPlay,
  BookOpen,
  Smartphone,
  Tv,
  Volume2,
  X,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Trip, Platform } from '../types';
import { SourceBadge } from '../components/SourceBadge';
import { StatusBadge } from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { MahamandalGuideModal } from '../components/MahamandalGuideModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, depotT, destT, busTypeT, language } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showOpsGuide, setShowOpsGuide] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, tripsData, platformsData] = await Promise.all([
        api.getDashboardStats(),
        api.getTrips(),
        api.getPlatforms(),
      ]);
      setStats(statsData);
      setTrips(tripsData);
      setPlatforms(platformsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredTrips = trips.filter((tItem) => {
    const matchesSearch =
      tItem.trip_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tItem.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tItem.bus_number && tItem.bus_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tItem.operating_depot && tItem.operating_depot.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = statusFilter === 'ALL' || tItem.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Station Meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl text-white">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 tracking-wider uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>{t('app.stationSub', 'Buldhana Division Platform Control Room')}</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-extrabold">{t('app.division', 'Buldhana Division (4 Platforms)')}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2.5">
            <span>{t('app.station', 'Malkapur Central Bus Stand')}</span>
            <span className="text-slate-500 font-normal text-lg">/</span>
            <span className="text-base md:text-lg font-semibold text-slate-300">
              {t('nav.dashboard', 'Operations Dashboard')}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {t(
              'depot.stationNotice',
              'Malkapur Station services buses originating from multiple operating depots. Operating Depot and Platform Bay are recorded distinctly.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Operations SOP Guide Modal Button */}
          <button
            onClick={() => setShowOpsGuide(true)}
            className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all inline-flex items-center gap-2 shadow-md hover:shadow-red-900/40"
          >
            <BookOpen className="w-4 h-4 text-white" />
            <span>{t('dash.opsGuideButton', 'महामंडळ प्रत्यक्ष कार्यप्रणाली मार्गदर्शक (SOP)')}</span>
          </button>

          <button
            onClick={() => navigate('/passenger-display')}
            className="px-4 py-2.5 bg-linear-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-extrabold hover:from-amber-400 hover:to-amber-500 transition-all inline-flex items-center gap-2 shadow-md hover:shadow-amber-500/20"
          >
            <MonitorPlay className="w-4 h-4 text-slate-950" />
            <span>{t('nav.passengerDisplay', 'Live Passenger PID Display')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => navigate('/mobile-gps')}
            className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-teal-400" />
            <span>{t('nav.mobileGps', 'Mobile Driver GPS')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Connection Warning: {error}</span>
          </div>
          <button onClick={fetchData} className="underline font-semibold hover:text-rose-900">
            {t('app.refresh', 'Retry Sync')}
          </button>
        </div>
      )}

      {/* KPI Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t('dash.kpiFleet', 'Total Fleet')}
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
            {stats ? stats.total_buses : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">Malkapur & Visitors</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-linear-to-b from-amber-50/30 to-white shadow-xs hover:border-amber-300 transition-all">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            {t('dash.kpiIncoming', 'Approaching')}
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono tabular-nums mt-1.5">
            {stats ? stats.incoming_buses : '--'}
          </div>
          <div className="text-[10px] text-amber-600/70 mt-1 font-medium">&lt; 1.2km Geofence</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200/80 bg-linear-to-b from-red-50/30 to-white shadow-xs hover:border-red-300 transition-all">
          <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
            {t('dash.kpiAtPlatforms', 'At Platform')}
          </div>
          <div className="text-2xl font-black text-red-700 font-mono tabular-nums mt-1.5">
            {stats ? stats.buses_at_platforms : '--'}
          </div>
          <div className="text-[10px] text-red-700/70 mt-1 font-medium">Bays 1-4 docked</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-linear-to-b from-emerald-50/30 to-white shadow-xs hover:border-emerald-300 transition-all">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            {t('dash.kpiFreeBays', 'Free Platforms')}
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums mt-1.5">
            {stats ? stats.free_platforms : '--'}
          </div>
          <div className="text-[10px] text-emerald-700/70 mt-1 font-medium">Available bays</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t('dash.kpiDelayed', 'Delayed Buses')}
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono tabular-nums mt-1.5">
            {stats ? stats.delayed_buses : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">&gt; 0 min delay</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t('dash.kpiDeparted', 'Departed')}
          </div>
          <div className="text-2xl font-black text-slate-700 font-mono tabular-nums mt-1.5">
            {stats ? stats.departed_buses : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Today's departures</div>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-xs transition-all ${
            stats && stats.active_conflicts > 0
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div
            className={`text-[11px] font-bold uppercase tracking-wider ${
              stats && stats.active_conflicts > 0 ? 'text-rose-700' : 'text-slate-500'
            }`}
          >
            {t('dash.kpiConflicts', 'Conflicts')}
          </div>
          <div
            className={`text-2xl font-black font-mono tabular-nums mt-1.5 ${
              stats && stats.active_conflicts > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {stats ? stats.active_conflicts : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Platform contention</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t('dash.kpiAnnouncements', 'PA Queue')}
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1.5">
            {stats ? stats.queued_announcements : '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Audio queue</div>
        </div>
      </div>

      {/* Platform Bays Operational Strip (Bays 1-4) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t('dash.platformBaysTitle', 'Malkapur Platform Operations (Bays 1-4)')}
            </h3>
            <p className="text-xs text-slate-500">
              {t(
                'dash.platformBaysSubtitle',
                'Coordinated via live sensor telemetry, driver GPS & automatic rule engine.'
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/platforms')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
          >
            <span>{t('nav.platforms', 'Manage Platform Rules')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {platforms.map((plat) => {
            const isOccupied = plat.status === 'OCCUPIED';
            return (
              <div
                key={plat.id}
                className={`p-4 rounded-2xl border transition-all shadow-xs ${
                  isOccupied
                    ? 'bg-slate-50/90 border-teal-300 ring-1 ring-teal-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center font-mono">
                      P{plat.platform_number}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{plat.name}</div>
                    </div>
                  </div>
                  <StatusBadge status={plat.status} size="sm" />
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1.5">
                  {isOccupied ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('dash.busAssigned', 'Bus Assigned:')}</span>
                        <span className="font-bold text-slate-900 font-mono">{plat.bus_number || 'En-docked'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('dash.operatingDepot', 'Operating Depot:')}</span>
                        <span className="font-semibold text-slate-800">
                          {depotT(
                            plat.bus_number
                              ? trips.find((t) => t.bus_number === plat.bus_number)?.operating_depot
                              : undefined
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('dash.routeDest', 'Route / Destination:')}</span>
                        <span className="font-semibold text-teal-800 truncate max-w-[130px]">
                          {destT(plat.destination) || t('dash.scheduledRoute', 'Scheduled Route')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{t('dash.departureExpected', 'Departure:')}</span>
                        <span className="font-mono tabular-nums text-slate-700 font-medium">
                          {plat.scheduled_departure || '--:--'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-2 text-center text-slate-400 text-xs">
                      <div className="font-medium text-emerald-700 font-semibold">
                        {t('dash.bayAvailable', 'Platform Bay Available')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{plat.preferred_corridor}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timetable: Upcoming Arrivals & Departures */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t('dash.liveTimetable', 'Live Station Timetable — Malkapur Terminal')}
            </h3>
            <p className="text-xs text-slate-500">
              {t(
                'dash.liveTimetableSubtitle',
                'Multi-depot arrivals and departures verified against persistent SQLite records (polled every 3s).'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={t('dash.searchPlaceholder', 'Search bus, depot, or city...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 w-52 font-medium"
            />
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              {['ALL', 'APPROACHING', 'AT_PLATFORM', 'SCHEDULED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                    statusFilter === filter
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter === 'ALL'
                    ? t('dash.filterAll', 'All Trips')
                    : t(`status.${filter}`, filter.replace('_', ' '))}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table view */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-4">{t('fleet.tripNumber', 'Trip No.')}</th>
                <th className="py-2.5 px-4">{t('fleet.busNumber', 'Bus No. / Type')}</th>
                <th className="py-2.5 px-4">{t('depot.operatingDepot', 'Operating Depot')}</th>
                <th className="py-2.5 px-4">{t('fleet.destination', 'Route / Destination')}</th>
                <th className="py-2.5 px-4">{t('fleet.scheduledArrival', 'Arrival')}</th>
                <th className="py-2.5 px-4">{t('fleet.scheduledDeparture', 'Departure')}</th>
                <th className="py-2.5 px-4">{t('dash.colPlatform', 'Malkapur Platform Bay')}</th>
                <th className="py-2.5 px-4">{t('fleet.status', 'Status')}</th>
                <th className="py-2.5 px-4">{t('fleet.source', 'Data Source')}</th>
                <th className="py-2.5 px-4 text-right">{t('action.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                    {t('dash.emptyTrips', 'No scheduled or en-route trips match your filter criteria.')}
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {trip.trip_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 font-mono">{trip.bus_number || t('fleet.unassigned', 'Unassigned')}</div>
                      <div className="text-[11px] text-slate-500">{busTypeT(trip.bus_type)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {depotT(trip.operating_depot)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{destT(trip.destination)}</div>
                      <div className="text-[11px] text-slate-500">{trip.route_name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 font-semibold">
                      {trip.scheduled_arrival}
                      {trip.delay_minutes > 0 && (
                        <span className="ml-1 text-[10px] text-amber-600 font-bold">
                          (+{trip.delay_minutes}m)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 font-semibold">
                      {trip.scheduled_departure}
                    </td>
                    <td className="py-3 px-4">
                      {trip.platform_number ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-300 text-amber-950 font-black rounded-lg font-mono">
                          P{trip.platform_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={trip.status} />
                    </td>
                    <td className="py-3 px-4">
                      <SourceBadge source={trip.source} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate('/platforms')}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Platform coordinator"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-World Mahamandal Deployment SOP Modal */}
      <MahamandalGuideModal isOpen={showOpsGuide} onClose={() => setShowOpsGuide(false)} />
    </div>
  );
};
