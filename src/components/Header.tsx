import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlaySquare, RefreshCw, Clock, Menu, BookOpen } from 'lucide-react';
import { VoiceAnnouncer } from './VoiceAnnouncer';
import { useLanguage } from '../context/LanguageContext';
import { MahamandalGuideModal } from './MahamandalGuideModal';

interface HeaderProps {
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  autoAnnounceEnabled: boolean;
  onAutoAnnounceToggle: (val: boolean) => void;
  onMobileMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  onRefresh,
  isRefreshing,
  autoAnnounceEnabled,
  onAutoAnnounceToggle,
  onMobileMenuToggle,
}) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-3 md:px-6 flex items-center justify-between gap-2 md:gap-4 shrink-0 z-20 shadow-xs">
        {/* Zone 1: Mobile toggle & Location Context */}
        <div className="flex items-center gap-2 min-w-0">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-1.5 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 ring-4 ring-emerald-100" title="Control System Active" />
            <span className="text-xs md:text-sm font-extrabold tracking-tight text-slate-900 truncate">
              {t('app.station', 'Malkapur Central Bus Stand')}
            </span>
            <span className="text-slate-300 hidden lg:inline">|</span>
            <span className="text-xs font-semibold text-slate-500 truncate hidden xl:inline">
              {t('app.stationSub', 'Buldhana Division Platform Control Room')}
            </span>
          </div>
        </div>

        {/* Zone 2: Language, SOP Guide, Sync & Audio */}
        <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
          {/* Mahamandal SOP Guide Button */}
          <button
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 rounded-xl text-xs font-extrabold transition-all shadow-xs"
            title="MSRTC Operations & Wiring Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="hidden sm:inline">महामंडळ SOP</span>
            <span className="sm:hidden">SOP</span>
          </button>

          {/* Language selector */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 shadow-inner">
            <button
              type="button"
              onClick={() => setLanguage('mr-IN')}
              className={`px-2 md:px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                language === 'mr-IN'
                  ? 'bg-red-600 text-white shadow-xs ring-1 ring-red-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="मराठी (Marathi)"
            >
              मराठी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi-IN')}
              className={`px-2 md:px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                language === 'hi-IN'
                  ? 'bg-red-600 text-white shadow-xs ring-1 ring-red-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="हिंदी (Hindi)"
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en-IN')}
              className={`px-2 md:px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                language === 'en-IN'
                  ? 'bg-red-600 text-white shadow-xs ring-1 ring-red-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="English"
            >
              EN
            </button>
          </div>

          {/* Audio PA Announcer */}
          <VoiceAnnouncer
            autoAnnounceEnabled={autoAnnounceEnabled}
            onAutoAnnounceToggle={onAutoAnnounceToggle}
            language={language}
          />

          {/* Last update timestamp */}
          <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '--:--:--'}</span>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title={t('app.refresh', 'Refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          {/* Action: Simulator */}
          <button
            onClick={() => navigate('/simulator')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs whitespace-nowrap"
          >
            <PlaySquare className="w-3.5 h-3.5 text-teal-400" />
            <span>{t('app.launchSimulator', 'Simulator')}</span>
          </button>
        </div>
      </header>

      {/* Mahamandal Deployment & Operations Guide Modal */}
      <MahamandalGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
};
