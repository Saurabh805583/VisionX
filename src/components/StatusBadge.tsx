import React from 'react';
import { BusStatus } from '../types';
import { Clock, Navigation, MapPin, CheckCircle2, Wrench } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  status: BusStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const { statusT } = useLanguage();
  const norm = (status || '').toUpperCase();

  const getConfig = () => {
    switch (norm) {
      case 'SCHEDULED':
        return {
          label: statusT('SCHEDULED'),
          icon: Clock,
          className: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'APPROACHING':
        return {
          label: statusT('APPROACHING'),
          icon: Navigation,
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'AT_PLATFORM':
        return {
          label: statusT('AT_PLATFORM'),
          icon: MapPin,
          className: 'bg-teal-50 text-teal-800 border-teal-200 font-semibold',
        };
      case 'DEPARTED':
        return {
          label: statusT('DEPARTED'),
          icon: CheckCircle2,
          className: 'bg-slate-50 text-slate-500 border-slate-200',
        };
      case 'FREE':
        return {
          label: statusT('FREE'),
          icon: CheckCircle2,
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'OCCUPIED':
        return {
          label: statusT('OCCUPIED'),
          icon: MapPin,
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'MAINTENANCE':
        return {
          label: statusT('MAINTENANCE'),
          icon: Wrench,
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          label: status || '—',
          icon: Clock,
          className: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      } ${config.className}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-4 h-4 shrink-0'} />
      <span>{config.label}</span>
    </span>
  );
};
