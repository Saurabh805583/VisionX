import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Sliders,
  Sparkles,
  Info,
  Building2,
} from 'lucide-react';
import { api } from '../services/api';
import { Announcement, Bus, Trip, Platform } from '../types';
import { Modal } from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';
import {
  speakTransportAnnouncement,
  humanizePublicAnnouncement,
  DEFAULT_VOICE_SETTINGS,
} from '../services/voiceEngine';
export const AnnouncementCenterPage: React.FC = () => {
  const { language: globalLanguage, t, destT, depotT, busTypeT } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  // Queue & Audio Control States
  const [isQueueActive, setIsQueueActive] = useState(false); // Header VoiceAnnouncer handles primary queue
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState<string | null>(null);
  const [lastAnnouncedText, setLastAnnouncedText] = useState<string | null>(null);
  const [lastAnnouncedLang, setLastAnnouncedLang] = useState<string>(globalLanguage);
  const [speechRate, setSpeechRate] = useState<number>(0.86);
  const [selectedLanguage, setSelectedLanguage] = useState<'mr-IN' | 'hi-IN' | 'en-IN'>(globalLanguage);

  // Voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [voiceAvailable, setVoiceAvailable] = useState<boolean>(true);

  // Manual Announcement Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState<string>('ARRIVAL');
  const [manualTripId, setManualTripId] = useState<string>('');
  const [manualPlatformId, setManualPlatformId] = useState<number>(1);
  const [manualPriority, setManualPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL'>('NORMAL');
  const [customTextPreview, setCustomTextPreview] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const [annList, busList, tripList, platList] = await Promise.all([
        api.getAnnouncements(),
        api.getBuses(),
        api.getTrips(),
        api.getPlatforms(),
      ]);
      setAnnouncements(annList);
      setBuses(busList);
      setTrips(tripList);
      setPlatforms(platList);
      if (!manualTripId && tripList.length > 0) {
        setManualTripId(tripList[0].id);
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Voice population
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const populateVoices = () => {
      const vList = window.speechSynthesis.getVoices();
      setVoices(vList);

      // Check Marathi/Hindi/Indian English voices
      const matched = vList.find((v) => v.lang.toLowerCase().startsWith('mr') || v.lang.includes('IN'));
      if (matched && !selectedVoiceURI) {
        setSelectedVoiceURI(matched.voiceURI);
      }
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }, [selectedVoiceURI]);

  // Check voice availability for selected language
  useEffect(() => {
    if (voices.length === 0) return;
    const prefix = selectedLanguage.substring(0, 2).toLowerCase();
    const hasLangVoice = voices.some((v) => v.lang.toLowerCase().startsWith(prefix));
    setVoiceAvailable(hasLangVoice);
  }, [selectedLanguage, voices]);

  // Synthesize Speech Function using unified high-fidelity voiceEngine
  const speakAnnouncement = async (text: string, lang: string = selectedLanguage) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    setIsSpeaking(true);
    setActiveSpeechText(text);
    setLastAnnouncedText(text);
    setLastAnnouncedLang(lang);

    try {
      await speakTransportAnnouncement(
        text,
        lang,
        {
          rate: speechRate,
          pitch: 0.98,
          volume: 0.95,
          chime: 'ST_BELL',
          selectedVoiceURI,
        },
        voices
      );
    } finally {
      setIsSpeaking(false);
      setActiveSpeechText(null);
    }
  };

  // Replay Last Announcement
  const handleReplay = () => {
    if (lastAnnouncedText) {
      speakAnnouncement(lastAnnouncedText, lastAnnouncedLang);
    }
  };

  // Stop Speech
  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setActiveSpeechText(null);
    }
  };

  // Automated Queue Runner
  useEffect(() => {
    if (!isQueueActive || isSpeaking || isMuted) return;

    const queuedItems = announcements.filter((a) => a.status === 'QUEUED');
    if (queuedItems.length === 0) return;

    // Pick top priority item
    const nextItem = queuedItems[0];

    // Mark as played/speaking on backend first
    api.markAnnouncementPlayed(nextItem.id).then(() => {
      speakAnnouncement(nextItem.announcement_text, nextItem.language || selectedLanguage);
      fetchData();
    });
  }, [isQueueActive, isSpeaking, isMuted, announcements, selectedLanguage]);

  // Template Form Generator
  useEffect(() => {
    const trip = trips.find((t) => t.id === manualTripId);
    const dest = trip ? trip.destination : '[Destination]';
    const busNo = trip ? (trip.bus_number || '[Bus ID]') : '[Bus ID]';
    const plat = manualPlatformId;

    let text = '';
    if (selectedLanguage === 'mr-IN') {
      if (templateKey === 'ARRIVAL') {
        text = `कृपया लक्ष द्या. ${dest} कडे जाणारी बस क्रमांक ${busNo} प्लॅटफॉर्म क्रमांक ${plat} वर येत आहे.`;
      } else if (templateKey === 'PLATFORM_CHANGE') {
        text = `महत्त्वाची सूचना. ${dest} कडे जाणाऱ्या बस क्रमांक ${busNo} चा प्लॅटफॉर्म बदलण्यात आला आहे. नवीन प्लॅटफॉर्म क्रमांक ${plat} आहे.`;
      } else if (templateKey === 'DELAY') {
        text = `प्रवाशांसाठी सूचना. ${dest} कडे जाणाऱ्या बस क्रमांक ${busNo} ला विलंब होत आहे. कृपया पुढील सूचनेकडे लक्ष द्या.`;
      } else if (templateKey === 'DEPARTURE') {
        text = `कृपया लक्ष द्या. ${dest} कडे जाणारी बस क्रमांक ${busNo} प्लॅटफॉर्म क्रमांक ${plat} वरून रवाना होत आहे.`;
      }
    } else if (selectedLanguage === 'hi-IN') {
      if (templateKey === 'ARRIVAL') {
        text = `कृपया ध्यान दें. ${dest} जाने वाली बस क्रमांक ${busNo} प्लेटफॉर्म क्रमांक ${plat} पर आ रही है.`;
      } else if (templateKey === 'PLATFORM_CHANGE') {
        text = `महत्वपूर्ण सूचना. ${dest} जाने वाली बस क्रमांक ${busNo} का प्लेटफॉर्म बदल दिया गया है. नया प्लेटफॉर्म क्रमांक ${plat} है.`;
      } else if (templateKey === 'DELAY') {
        text = `यात्रियों के लिए सूचना. ${dest} जाने वाली बस क्रमांक ${busNo} में देरी हो रही है. कृपया अगली सूचना की प्रतीक्षा करें.`;
      } else if (templateKey === 'DEPARTURE') {
        text = `कृपया ध्यान दें. ${dest} जाने वाली बस क्रमांक ${busNo} प्लेटफॉर्म क्रमांक ${plat} से रवाना हो रही है.`;
      }
    } else {
      if (templateKey === 'ARRIVAL') {
        text = `May I have your attention please. Bus number ${busNo} bound for ${dest} is arriving on Platform ${plat}.`;
      } else if (templateKey === 'PLATFORM_CHANGE') {
        text = `Important announcement. Platform for bus number ${busNo} bound for ${dest} has been changed. New platform is Platform ${plat}.`;
      } else if (templateKey === 'DELAY') {
        text = `Passenger advisory. Bus number ${busNo} bound for ${dest} is delayed. Please await further updates.`;
      } else if (templateKey === 'DEPARTURE') {
        text = `May I have your attention please. Bus number ${busNo} bound for ${dest} is departing from Platform ${plat}.`;
      }
    }
    setCustomTextPreview(text);
  }, [templateKey, manualTripId, manualPlatformId, selectedLanguage, trips]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!customTextPreview.trim()) {
      setValidationError('Announcement text is required.');
      return;
    }

    const trip = trips.find((t) => t.id === manualTripId);
    if (!trip && templateKey !== 'GENERAL') {
      setValidationError('Valid service trip must be selected for operational announcements.');
      return;
    }

    try {
      await api.createAnnouncement({
        announcement_type: templateKey,
        trip_id: manualTripId,
        platform_id: manualPlatformId,
        bus_id: trip?.bus_id,
        language: selectedLanguage,
        announcement_text: customTextPreview,
        priority: manualPriority,
      });

      setCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to create announcement');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <span>PUBLIC ADDRESS CONTROL CONSOLE</span>
            <span>·</span>
            <span>SPEECH SYNTHESIS ENGINE</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Central Announcement Control Centre</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Station audio broadcast queue with prioritized Marathi, Hindi, and English phonetics and chime sequencing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Announcement</span>
          </button>
        </div>
      </div>

      {/* Main Control Panel Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQueueActive(!isQueueActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
              isQueueActive
                ? 'bg-teal-50 text-teal-800 border-teal-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {isQueueActive ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>Queue: {isQueueActive ? 'RUNNING' : 'PAUSED'}</span>
          </button>

          <button
            onClick={handleStopSpeech}
            disabled={!isSpeaking}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            title="Immediately stop current audio playback"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop Speech</span>
          </button>

          <button
            onClick={handleReplay}
            disabled={!lastAnnouncedText}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            title="Replay the last broadcast announcement"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Last</span>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
              isMuted
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5 text-slate-600" />}
            <span>{isMuted ? 'Muted' : 'Unmuted'}</span>
          </button>
        </div>

        {/* Language & Voice Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setSelectedLanguage('mr-IN')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedLanguage === 'mr-IN' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              मराठी (mr)
            </button>
            <button
              onClick={() => setSelectedLanguage('hi-IN')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedLanguage === 'hi-IN' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              हिंदी (hi)
            </button>
            <button
              onClick={() => setSelectedLanguage('en-IN')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedLanguage === 'en-IN' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              English
            </button>
          </div>

          {/* Rate control */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Speed:</span>
            <input
              type="range"
              min="0.7"
              max="1.1"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-16 accent-teal-600 cursor-pointer"
            />
            <span className="font-mono tabular-nums text-slate-900 font-bold">{speechRate}x</span>
          </div>
        </div>
      </div>

      {/* Voice Availability Diagnostic Alert */}
      {!voiceAvailable && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Voice Warning:</strong> No native {selectedLanguage} voice found in browser engine. Browser will use closest Indian English or system fallback.
            </span>
          </div>
        </div>
      )}

      {/* Currently Speaking Live Marquee Banner */}
      {isSpeaking && activeSpeechText && (
        <div className="p-4 bg-teal-900 text-white rounded-xl shadow-md border border-teal-700 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-bold flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-teal-300">
                Broadcasting Over Station PA Speaker Output:
              </div>
              <div className="text-sm font-bold tracking-wide mt-0.5">{activeSpeechText}</div>
            </div>
          </div>
          <button
            onClick={handleStopSpeech}
            className="px-3 py-1 bg-teal-800 hover:bg-teal-700 rounded-lg text-xs font-bold border border-teal-600 shrink-0"
          >
            Mute Speech
          </button>
        </div>
      )}

      {/* Announcement Queue Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live PA Queue & Historical Broadcasts</h3>
            <p className="text-xs text-slate-500">
              Sorted by Priority (URGENT platform changes first, followed by arrivals and departures).
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {announcements.length} records in ledger
          </span>
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {announcements.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No announcements in queue. Arrivals and platform changes automatically enqueue speech here.
            </div>
          ) : (
            announcements.map((item) => (
              <div
                key={item.id}
                className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                  item.priority === 'URGENT'
                    ? 'bg-rose-50/50 hover:bg-rose-50'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 text-[11px] px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                      {item.id}
                    </span>

                    {item.priority === 'URGENT' ? (
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded font-mono text-[10px]">
                        URGENT
                      </span>
                    ) : item.priority === 'HIGH' ? (
                      <span className="px-2 py-0.5 bg-amber-500 text-white font-bold rounded font-mono text-[10px]">
                        HIGH
                      </span>
                    ) : null}

                    <span className="font-bold text-teal-800 font-mono">
                      {item.platform_number || item.platform_id ? `Platform ${item.platform_number || item.platform_id}` : 'General Advisory'}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 font-mono font-semibold">{item.bus_number || 'Fleet'}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{item.language}</span>
                  </div>

                  <p className="text-slate-900 font-medium text-xs leading-relaxed max-w-2xl">
                    "{item.announcement_text}"
                  </p>

                  <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                    Status: <strong className="text-slate-700">{item.status}</strong> · Play Count: {item.play_count} · Created: {new Date(item.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => speakAnnouncement(item.announcement_text, item.language || selectedLanguage)}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Play Audio Now</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Station Physical PA Integration Workflow Documentation */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-teal-700" />
          <span>Station Physical PA Amplifier Connection Workflow</span>
        </h3>
        <p className="text-slate-600 leading-relaxed">
          Browser Speech Synthesis outputs audio via the host machine's hardware Digital-to-Analog Converter (DAC). In an authorized bus stand deployment, connect the operator terminal as follows:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-bold block">1. Terminal DAC Output</strong>
            <p className="text-slate-600 text-[11px]">
              Route terminal 3.5mm line-out (or USB Audio Interface) to the station master audio mixer.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-bold block">2. Zone Distribution Amplifier</strong>
            <p className="text-slate-600 text-[11px]">
              Feed output into 100V line amplifier driving horn speaker clusters at Platforms 1, 2, 3, and 4.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-bold block">3. Chime & Audio Ducking</strong>
            <p className="text-slate-600 text-[11px]">
              The Web Audio API automatically generates the pre-announcement 2-tone chime prior to speech playback.
            </p>
          </div>
        </div>
      </div>

      {/* Create Announcement Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Compose Official Station Public Announcement"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {validationError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Standard Template *
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {[
                { id: 'ARRIVAL', label: '1. Arrival at Platform' },
                { id: 'PLATFORM_CHANGE', label: '2. Platform Change (Urgent)' },
                { id: 'DELAY', label: '3. Service Delay Advisory' },
                { id: 'DEPARTURE', label: '4. Departure Notice' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateKey(t.id)}
                  className={`p-2 rounded-lg border text-left transition-colors ${
                    templateKey === t.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Associated Service Trip *
              </label>
              <select
                value={manualTripId}
                onChange={(e) => setManualTripId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.trip_number} — {t.destination} ({t.bus_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Platform Bay *
              </label>
              <select
                value={manualPlatformId}
                onChange={(e) => setManualPlatformId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    Platform {p.platform_number} ({p.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
              {(['NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setManualPriority(p)}
                  className={`p-1.5 rounded-lg border text-center transition-colors ${
                    manualPriority === p
                      ? p === 'URGENT'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Generated Script Preview (Editable) *
            </label>
            <textarea
              rows={3}
              value={customTextPreview}
              onChange={(e) => setCustomTextPreview(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
            >
              Enqueue Announcement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
