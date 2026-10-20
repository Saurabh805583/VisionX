import React from 'react';
import { DataSource } from '../types';
import { Radio, Smartphone, Cpu, ShieldCheck, HelpCircle, Laptop } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  source: DataSource | string;
  size?: 'sm' | 'md';
}

export const SourceBadge: React.FC<Props> = ({ source, size = 'sm' }) => {
  const { sourceT } = useLanguage();
  const normalized = (source || 'UNKNOWN').toUpperCase();

  const getSourceConfig = (s: string) => {
    switch (s) {
      case 'SIMULATED':
        return {
          label: sourceT('SIMULATED'),
          description: 'Synthetic prototype data generator',
          icon: Laptop,
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'MANUAL':
        return {
          label: sourceT('MANUAL'),
          description: 'Entered by station controller',
          icon: Radio,
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'PHONE_GPS':
        return {
          label: sourceT('PHONE_GPS'),
          description: 'Crew driver mobile device telemetry',
          icon: Smartphone,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'IOT_DEVICE':
        return {
          label: sourceT('IOT_DEVICE'),
          description: 'On-board telematics GPS receiver',
          icon: Cpu,
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
        };
      case 'OFFICIAL_FEED':
        return {
          label: sourceT('OFFICIAL_FEED'),
          description: 'MSRTC central enterprise API feed',
          icon: ShieldCheck,
          bg: 'bg-green-50 text-green-700 border-green-200',
        };
      default:
        return {
          label: s,
          description: 'Unverified source',
          icon: HelpCircle,
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
        };
    }
  };

  const config = getSourceConfig(normalized);
  const Icon = config.icon;

  return (
    <span
      title={`Source: ${config.label} — ${config.description}`}
      className={`inline-flex items-center gap-1.5 border font-mono font-medium rounded ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'
      } ${config.bg}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{config.label}</span>
    </span>
  );
};
