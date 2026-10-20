import React, { useState, useEffect } from 'react';
import { GitFork, MapPin, Navigation, Compass, Search } from 'lucide-react';
import { api } from '../services/api';
import { Route } from '../types';

export const RouteManagementPage: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRoutes()
      .then((data) => setRoutes(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredRoutes = routes.filter(
    (r) =>
      r.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.route_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <span>NETWORK TOPOLOGY</span>
            <span>·</span>
            <span>MSRTC MAHARASHTRA CORRIDORS</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Route & Destination Network</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inter-district and regional transit corridors originating from or transiting Malkapur Bus Stand.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search route or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoutes.map((route) => {
          let stops: string[] = [];
          try {
            stops = JSON.parse(route.via_stops_json);
          } catch {
            stops = [];
          }

          return (
            <div
              key={route.id}
              className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {route.route_code}
                  </span>
                  <span className="text-xs font-mono font-semibold text-teal-800">
                    {route.distance_km} km
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{route.route_name}</h3>

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{route.origin}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-semibold text-slate-800">{route.destination}</span>
                </div>

                {/* Via Stops */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Intermediate Via Stops:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {stops.map((stop, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 font-medium"
                      >
                        {stop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Est. Runtime:</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {Math.floor(route.travel_time_mins / 60)}h {route.travel_time_mins % 60}m
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
