import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MonitorPlay,
  Volume2,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Megaphone,
  ArrowLeft,
  Building2,
  Radio,
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage, Language } from '../context/LanguageContext';
import { VoiceAnnouncer } from '../components/VoiceAnnouncer';

export const PassengerDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t, destT, depotT, busTypeT } = useLanguage();
  const [trips, setTrips] = useState<any[]>([]);
  const [autoAnnounce, setAutoAnnounce] = useState<boolean>(true);
  const [activeAnnouncements, setActiveAnnouncements] = useState<any[]>([]);
  const [stationMeta, setStationMeta] = useState<any>({
    station: 'Malkapur Bus Stand',
    station_mr: 'मल्कापूर बस स्थानक',
    station_hi: 'मलकापुर बस स्टैंड',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [layoutMode, setLayoutMode] = useState<'BOARD' | 'ANNOUNCEMENT'>('BOARD');
  const [showStatusWatermark, setShowStatusWatermark] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const fetchDisplay = async () => {
    try {
      const data = await api.getPassengerDisplay();
      setTrips(data.trips || []);
      setActiveAnnouncements(data.announcements || []);
      setStationMeta({
        station: data.station,
        station_mr: data.station_mr,
        station_hi: data.station_hi,
      });
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchDisplay();
    const interval = setInterval(fetchDisplay, 3000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getHeaders = () => {
    if (language === 'mr-IN') {
      return {
        trip: 'फेरी क्र.',
        bus: 'बस क्र. / आगार',
        dest: 'गंतव्य स्थान (मार्ग)',
        arr: 'वेळ (आगमन)',
        dep: 'वेळ (सुटण्याची)',
        plat: 'फलाट क्र.',
        status: 'सद्यस्थिती',
        missing: 'माहिती उपलब्ध नाही',
        depot: 'कार्यकारी आगार',
      };
    }
    if (language === 'hi-IN') {
      return {
        trip: 'यात्रा क्र.',
        bus: 'बस नं. / डिपो',
        dest: 'गंतव्य स्थल (मार्ग)',
        arr: 'समय (आगमन)',
        dep: 'समय (प्रस्थान)',
        plat: 'प्लेटफॉर्म नं.',
        status: 'स्थिति',
        missing: 'जानकारी उपलब्ध नहीं',
        depot: 'संचालन डिपो',
      };
    }
    return {
      trip: 'Trip No.',
      bus: 'Bus No / Depot',
      dest: 'Destination (Route)',
      arr: 'Sch. Arrival',
      dep: 'Sch. Departure',
      plat: 'Platform Bay',
      status: 'Status',
      missing: 'Information Unavailable',
      depot: 'Operating Depot',
    };
  };

  const h = getHeaders();

  const getStatusLabel = (status: string, delayMins: number) => {
    if (status === 'AT_PLATFORM') {
      return language === 'mr-IN' ? 'फलाटावर उभी आहे' : language === 'hi-IN' ? 'प्लेटफॉर्म पर खड़ी है' : 'AT PLATFORM / BOARDING';
    }
    if (status === 'APPROACHING') {
      return language === 'mr-IN' ? 'स्थानकात येत आहे' : language === 'hi-IN' ? 'आ रही है' : 'APPROACHING';
    }
    if (delayMins > 0) {
      return language === 'mr-IN' ? `विलंब (+${delayMins} मि.)` : language === 'hi-IN' ? `विलंब (+${delayMins} मि.)` : `DELAYED (+${delayMins}m)`;
    }
    if (status === 'DEPARTED') {
      return language === 'mr-IN' ? 'रवाना झाली' : language === 'hi-IN' ? 'रवाना हो चुकी' : 'DEPARTED';
    }
    return language === 'mr-IN' ? 'वेळेवर नियोजित' : language === 'hi-IN' ? 'समय पर' : 'ON TIME';
  };

  const topAnnouncement = activeAnnouncements.length > 0 ? activeAnnouncements[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 md:p-6 font-sans select-none flex flex-col justify-between">
      {/* Top Controls Bar (Projector / Presentation controls) */}
      <div className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 p-2.5 md:p-3 rounded-xl mb-4 gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700"
            title="Return to administrative control center"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('app.backToOps', 'Operations Dashboard')}</span>
          </button>

          <div className="flex items-center gap-2">
            <MonitorPlay className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-white tracking-wide hidden sm:inline">
              Public Passenger Information System · VisionX
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setLayoutMode('BOARD')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                layoutMode === 'BOARD' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('pid.standardBoard', 'Timetable Board')}
            </button>
            <button
              onClick={() => setLayoutMode('ANNOUNCEMENT')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                layoutMode === 'ANNOUNCEMENT' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('pid.announcementFocused', 'Announcement Focus')}
            </button>
          </div>

          {/* Multilingual Selector */}
          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setLanguage('mr-IN')}
              className={`px-2 py-1 rounded-md transition-colors ${
                language === 'mr-IN' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => setLanguage('hi-IN')}
              className={`px-2 py-1 rounded-md transition-colors ${
                language === 'hi-IN' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => setLanguage('en-IN')}
              className={`px-2 py-1 rounded-md transition-colors ${
                language === 'en-IN' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Station Loudspeaker Auto-Announce */}
          <VoiceAnnouncer
            autoAnnounceEnabled={autoAnnounce}
            onAutoAnnounceToggle={setAutoAnnounce}
            language={language}
          />

          {/* Watermark toggle */}
          <button
            onClick={() => setShowStatusWatermark(!showStatusWatermark)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
            title={showStatusWatermark ? 'Hide sync watermark' : 'Show sync watermark'}
          >
            {showStatusWatermark ? <Eye className="w-4 h-4 text-teal-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? t('action.exitFullscreen', 'Exit Fullscreen') : t('action.fullscreen', 'Fullscreen TV Mode')}</span>
          </button>
        </div>
      </div>

      {/* Main 16:9 Display Canvas */}
      <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center font-mono shadow-md">
              MSRTC
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
                {language === 'mr-IN'
                  ? 'महाराष्ट्र राज्य मार्ग परिवहन महामंडळ'
                  : language === 'hi-IN'
                  ? 'महाराष्ट्र राज्य सड़क परिवहन निगम'
                  : 'MAHARASHTRA STATE ROAD TRANSPORT CORPORATION'}
              </h1>
              <div className="text-xs md:text-sm text-amber-400 font-bold tracking-wider uppercase flex items-center gap-2">
                <span>
                  {language === 'mr-IN'
                    ? 'मल्कापूर मध्यवर्ती बस स्थानक · बुलढाणा विभाग'
                    : language === 'hi-IN'
                    ? 'मलकापुर केंद्रीय बस स्टैंड · बुलढाणा मंडल'
                    : 'MALKAPUR CENTRAL BUS STAND · BULDHANA DIVISION'}
                </span>
                <span className="text-slate-500 font-normal">|</span>
                <span className="text-teal-400 text-xs font-mono">{t('station.platforms', '4 Platforms')}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-3xl md:text-4xl font-black text-amber-300 tabular-nums tracking-tight">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Priority Urgent Announcement Banner */}
        {topAnnouncement && (
          <div
            className={`px-6 py-3 border-b flex items-center gap-3 ${
              topAnnouncement.priority === 'URGENT'
                ? 'bg-rose-950/90 border-rose-800 text-rose-100'
                : 'bg-teal-950/90 border-teal-800 text-teal-100'
            }`}
          >
            <Megaphone
              className={`w-6 h-6 shrink-0 ${
                topAnnouncement.priority === 'URGENT' ? 'text-rose-400 animate-bounce' : 'text-teal-400'
              }`}
            />
            <div className="overflow-hidden flex-1">
              <span className="font-bold text-xs uppercase tracking-wider mr-2 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/60">
                {topAnnouncement.priority === 'URGENT'
                  ? (language === 'mr-IN' ? 'तात्काळ सूचना' : language === 'hi-IN' ? 'अति आवश्यक सूचना' : 'URGENT NOTICE')
                  : (language === 'mr-IN' ? 'स्थानक उद्घोषणा' : language === 'hi-IN' ? 'स्टेशन उद्घोषणा' : 'STATION NOTICE')}
              </span>
              <span className="text-sm md:text-base font-bold tracking-wide">
                {topAnnouncement.announcement_text}
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Display Mode */}
        {layoutMode === 'BOARD' ? (
          /* Standard Timetable Board Mode */
          <div className="flex-1 overflow-x-auto p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-5">{h.trip}</th>
                  <th className="py-3 px-5">{h.bus}</th>
                  <th className="py-3 px-5">{h.dest}</th>
                  <th className="py-3 px-5">{h.arr}</th>
                  <th className="py-3 px-5">{h.dep}</th>
                  <th className="py-3 px-5 text-center">{h.plat}</th>
                  <th className="py-3 px-5">{h.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-slate-500 font-medium text-base">
                      {h.missing}
                    </td>
                  </tr>
                ) : (
                  trips.map((trip) => {
                    const isAtPlatform = trip.status === 'AT_PLATFORM';
                    const isApproaching = trip.status === 'APPROACHING';

                    return (
                      <tr
                        key={trip.id}
                        className={`transition-colors ${
                          isAtPlatform
                            ? 'bg-teal-950/40 text-teal-100 font-medium'
                            : isApproaching
                            ? 'bg-amber-950/30 text-amber-100 font-medium'
                            : 'hover:bg-slate-800/40 text-slate-200'
                        }`}
                      >
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-400 text-xs">
                          {trip.trip_number || h.missing}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-mono font-black text-white text-base tracking-wide">
                            {trip.bus_number || h.missing}
                          </div>
                          <div className="text-xs text-amber-300 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{depotT(trip.operating_depot) || h.missing}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">{busTypeT(trip.bus_type) || ''}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="text-base font-bold text-white tracking-wide">
                            {destT(trip.destination) || h.missing}
                          </div>
                          <div className="text-xs text-slate-400">
                            {language === 'mr-IN'
                              ? 'थेट सेवा (एक्सप्रेस)'
                              : language === 'hi-IN'
                              ? 'सीधी सेवा (एक्सप्रेस)'
                              : 'Express Service'}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-base font-semibold text-slate-300 tabular-nums">
                          {trip.scheduled_arrival || '--:--'}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-base font-semibold text-slate-100 tabular-nums">
                          {trip.scheduled_departure || '--:--'}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {trip.platform_number ? (
                            <div className="inline-block px-4 py-1.5 bg-amber-400 text-slate-950 font-black rounded-lg text-lg font-mono shadow-md">
                              {language === 'mr-IN'
                                ? `फलाट ${trip.platform_number}`
                                : language === 'hi-IN'
                                ? `प्लेटफॉर्म ${trip.platform_number}`
                                : `BAY ${trip.platform_number}`}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 font-mono italic">
                              {h.missing}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          {isAtPlatform ? (
                            <span className="px-3.5 py-1.5 bg-teal-500 text-slate-950 font-extrabold rounded-lg text-xs shadow-md animate-pulse">
                              {getStatusLabel(trip.status, trip.delay_minutes)}
                            </span>
                          ) : isApproaching ? (
                            <span className="px-3.5 py-1.5 bg-amber-500 text-slate-950 font-extrabold rounded-lg text-xs shadow-md">
                              {getStatusLabel(trip.status, trip.delay_minutes)}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs font-semibold">
                              {getStatusLabel(trip.status, trip.delay_minutes)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Announcement Focus Mode */
          <div className="flex-1 p-8 md:p-14 flex flex-col justify-center items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto shadow-inner">
              <Megaphone className="w-10 h-10 animate-pulse" />
            </div>

            {topAnnouncement ? (
              <div className="max-w-5xl space-y-5">
                <div className="text-xs md:text-sm font-mono font-bold tracking-widest text-amber-400 uppercase bg-slate-950/80 px-4 py-1 rounded-full inline-block border border-amber-400/30">
                  {topAnnouncement.priority === 'URGENT'
                    ? (language === 'mr-IN' ? 'तात्काळ प्रवासी सूचना' : 'URGENT PASSENGER BROADCAST')
                    : (language === 'mr-IN' ? 'सार्वजनिक ध्वनी उद्घोषणा' : 'PUBLIC AUDIO ANNOUNCEMENT')}
                </div>
                <h2 className="text-3xl md:text-6xl font-black text-white leading-tight tracking-wide font-sans">
                  {topAnnouncement.announcement_text}
                </h2>
                <div className="text-sm md:text-base font-mono text-slate-400 pt-4 flex items-center justify-center gap-4">
                  <span>Broadcast: {new Date(topAnnouncement.created_at).toLocaleTimeString()}</span>
                  <span>·</span>
                  <span className="text-amber-300 font-bold">
                    {topAnnouncement.platform_number ? `Platform ${topAnnouncement.platform_number}` : 'General Bay'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 space-y-3">
                <h3 className="text-2xl md:text-4xl font-bold text-white">
                  {t('pid.noActiveAnnouncements', 'No active announcements in queue.')}
                </h3>
                <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
                  {language === 'mr-IN'
                    ? 'स्थानक कामकाज सुरळीत सुरू आहे. बसेस नियोजित वेळेनुसार सुटत आहेत.'
                    : 'Terminal operations normal. Scheduled departures departing as per timetable.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Ticker / Disclosure */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="font-semibold text-slate-300">
              {language === 'mr-IN'
                ? 'सूचना: फलाट वाटप व आगमन वेळ स्वयंचलित अद्यतनित होते. ध्वनिक्षेपकावरील उद्घोषणेकडे लक्ष द्या.'
                : 'Notice: Platform allocations and arrival timings update automatically. Please listen for PA announcements.'}
            </span>
          </div>

          {showStatusWatermark && (
            <div className="text-[11px] font-mono text-slate-500">
              Malkapur PID Engine · <span className="text-teal-400 font-semibold">SYNCHRONIZED (SQLite Persistent)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
