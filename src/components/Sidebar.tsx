import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  GitFork,
  MapPin,
  Compass,
  PlaySquare,
  MonitorPlay,
  Volume2,
  AlertTriangle,
  History,
  ShieldCheck,
  Settings,
  Building2,
  Smartphone,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  conflictCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conflictCount = 0,
  collapsed = false,
  onToggleCollapse,
  onItemClick,
}) => {
  const { t } = useLanguage();

  const navItems = [
    { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: '/mobile-gps', labelKey: 'nav.mobileGps', icon: Smartphone, highlight: true },
    { to: '/gps-tracking', labelKey: 'nav.gpsRadar', icon: Compass },
    { to: '/iot-devices', labelKey: 'nav.iotDevices', icon: Cpu },
    { to: '/platforms', labelKey: 'nav.platforms', icon: MapPin },
    { to: '/simulator', labelKey: 'nav.simulator', icon: PlaySquare },
    { to: '/passenger-display', labelKey: 'nav.passengerDisplay', icon: MonitorPlay },
    { to: '/announcements', labelKey: 'nav.announcements', icon: Volume2 },
    { to: '/buses-trips', labelKey: 'nav.busesTrips', icon: Bus },
    { to: '/routes', labelKey: 'nav.routes', icon: GitFork },
    {
      to: '/conflicts',
      labelKey: 'nav.conflicts',
      icon: AlertTriangle,
      badge: conflictCount > 0 ? conflictCount : undefined,
    },
    { to: '/audit-trail', labelKey: 'nav.auditTrail', icon: History },
    { to: '/staff-operations', labelKey: 'nav.staffOps', icon: ShieldCheck },
    { to: '/settings', labelKey: 'nav.settings', icon: Settings },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-18' : 'w-64'
      } transition-all duration-300 shrink-0 bg-slate-950 border-r border-slate-800 text-slate-100 flex flex-col h-screen sticky top-0 z-30 select-none shadow-xl`}
    >
      {/* Brand & Division Header */}
      <div className="p-3.5 border-b border-slate-800/80 relative bg-linear-to-b from-slate-900/90 to-slate-950">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black text-sm tracking-wider shrink-0 shadow-md ring-1 ring-white/10">
            VX
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-extrabold tracking-tight text-white whitespace-nowrap">
                  Smart MSRTC
                </h1>
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold rounded uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide whitespace-nowrap">
                {t('app.subtitle', 'VisionX Transit Engine')}
              </p>
            </div>
          )}
        </div>

        {/* Station Badge */}
        {!collapsed && (
          <div className="mt-3 p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300 shadow-inner">
            <div className="w-7 h-7 rounded-lg bg-red-950/60 border border-red-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="overflow-hidden leading-tight min-w-0">
              <div className="font-bold text-white text-xs truncate">
                {t('app.station', 'Malkapur Central Bus Stand')}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                {t('app.division', 'Buldhana Division · 4 Platforms')}
              </div>
            </div>
          </div>
        )}

        {/* Collapse toggle button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="absolute -right-3 top-5 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 shadow-md transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-xs font-medium">
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = t(item.labelKey);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-xl transition-all whitespace-nowrap text-xs font-semibold ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/40 ring-1 ring-red-400/30'
                    : 'text-slate-300 hover:bg-slate-900/90 hover:text-white'
                } ${item.highlight ? 'border border-amber-500/30 bg-amber-950/20 text-amber-200' : ''}`
              }
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </div>
              {!collapsed && item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white font-mono">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Team Disclosure & Footer */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
        {!collapsed ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">
                {t('app.attribution', 'Developed by VisionX')}
              </span>
              <span className="inline-block px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-teal-400 font-mono">
                {t('app.syncOk', 'SYNC OK')}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate" title="Academic research prototype">
                {t('app.disclaimer', 'Academic Prototype · Malkapur')}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-400" title="SYNC OK" />
          </div>
        )}
      </div>
    </aside>
  );
};
