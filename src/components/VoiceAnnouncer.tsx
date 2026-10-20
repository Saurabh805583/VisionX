import React, { useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Play, Sliders, Settings2, Bell, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
  DEFAULT_VOICE_SETTINGS,
  VoiceSettings,
  ChimeStyle,
  speakTransportAnnouncement,
  playStBusStandBell,
  playTerminalChime,
} from '../services/voiceEngine';

interface VoiceAnnouncerProps {
  autoAnnounceEnabled: boolean;
  onAutoAnnounceToggle: (val: boolean) => void;
  language: 'mr-IN' | 'hi-IN' | 'en-IN';
}

export const VoiceAnnouncer: React.FC<VoiceAnnouncerProps> = ({
  autoAnnounceEnabled,
  onAutoAnnounceToggle,
  language,
}) => {
  const { t } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Load and persist voice settings
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('smart_msrtc_voice_config');
      if (saved) return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_VOICE_SETTINGS;
  });

  const updateSettings = (partial: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem('smart_msrtc_voice_config', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Populate system voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Central speak runner
  const speakText = useCallback(
    async (text: string, langCode: string = language) => {
      if (!('speechSynthesis' in window)) return;
      setIsSpeaking(true);
      try {
        await speakTransportAnnouncement(text, langCode, settings, availableVoices);
      } finally {
        setIsSpeaking(false);
      }
    },
    [availableVoices, language, settings]
  );

  // Poll for queued announcements if auto-announce is enabled
  useEffect(() => {
    if (!autoAnnounceEnabled) return;

    const timer = setInterval(async () => {
      try {
        const announcements = await api.getAnnouncements();
        const queued = announcements.filter((a) => a.status === 'QUEUED');
        if (queued.length > 0 && !isSpeaking) {
          const item = queued[0];
          await api.markAnnouncementPlayed(item.id);
          // Prefer phonetic Devanagari text for authentic spoken cadence
          const textToSpeak = item.phonetics_text || item.announcement_text;
          speakText(textToSpeak, item.language || language);
        }
      } catch {
        // quiet fallback
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [autoAnnounceEnabled, isSpeaking, language, speakText]);

  // Authentic MSRTC demonstration announcement
  const testAnnouncement = () => {
    const testMsg =
      language === 'mr-IN'
        ? 'कृपया लक्ष द्या... नागपूर कडे जाणारी गाडी, गाडी क्रमांक एम. एच. २८, बी. एल., ४५ २१... फलाट क्रमांक दोन वर लागत आहे... प्रवाशांनी कृपया नोंद घ्यावी.'
        : language === 'hi-IN'
        ? 'कृपया ध्यान दें... नागपुर जाने वाली बस, गाड़ी संख्या एम. एच. २८, बी. एल., ४५ २१... प्लेटफॉर्म क्रमांक दो पर आ रही है... यात्रीगण कृपया ध्यान दें.'
        : 'May I have your attention please... Express bus service bound for Nagpur, bus number M H 28 B L 4521, is arriving on Platform number Two.';
    speakText(testMsg, language);
  };

  return (
    <div className="relative flex items-center gap-1.5 md:gap-2">
      {/* Auto-announce toggle button */}
      <button
        type="button"
        onClick={() => onAutoAnnounceToggle(!autoAnnounceEnabled)}
        className={`inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap shrink-0 shadow-xs ${
          autoAnnounceEnabled
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/20 ring-1 ring-emerald-400/40'
            : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
        }`}
        title="Toggle automated speech synthesis on bus arrival"
      >
        {autoAnnounceEnabled ? (
          <>
            <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="hidden sm:inline">{t('ann.paStatusOn', 'PA: ON')}</span>
            <span className="sm:hidden">PA ON</span>
          </>
        ) : (
          <>
            <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{t('ann.paStatusOff', 'PA: OFF')}</span>
            <span className="sm:hidden">PA OFF</span>
          </>
        )}
      </button>

      {/* Manual Test PA Button */}
      <button
        type="button"
        onClick={testAnnouncement}
        disabled={isSpeaking}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
          isSpeaking
            ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
        }`}
        title="Play authentic ST station chime and MSRTC voice announcement"
      >
        <Play className={`w-3 h-3 ${isSpeaking ? 'text-amber-600 fill-amber-600' : 'text-red-600 fill-red-600'}`} />
        <span className="hidden sm:inline">{isSpeaking ? 'Speaking...' : t('ann.testChime', 'Test Voice')}</span>
        <span className="sm:hidden">Test</span>
      </button>

      {/* PA Tuning & Voice Settings Popover Toggle */}
      <button
        type="button"
        onClick={() => setShowSettings(!showSettings)}
        className={`p-1.5 rounded-xl border text-xs font-medium transition-colors ${
          showSettings
            ? 'bg-slate-900 text-white border-slate-800'
            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 shadow-xs'
        }`}
        title="Configure speaker volume, announcer speed & tone"
      >
        <Settings2 className="w-3.5 h-3.5" />
      </button>

      {/* Settings Dropdown Card */}
      {showSettings && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-xs text-slate-800 space-y-3.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-red-600" />
              <span>{t('ann.voiceSettings', 'PA Voice & Audio Tuning')}</span>
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Chime Bell Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Bell className="w-3 h-3 text-amber-500" />
              <span>स्थानक घंटा प्रकार (Station Chime Style)</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => updateSettings({ chime: 'ST_BELL' })}
                className={`py-1.5 rounded-lg transition-all ${
                  settings.chime === 'ST_BELL'
                    ? 'bg-white text-slate-900 shadow-xs font-black text-red-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔔 २-टोन एसटी
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ chime: 'TERMINAL_CHIME' })}
                className={`py-1.5 rounded-lg transition-all ${
                  settings.chime === 'TERMINAL_CHIME'
                    ? 'bg-white text-slate-900 shadow-xs font-black text-red-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎵 ४-टोन रेझोनंट
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ chime: 'NONE' })}
                className={`py-1.5 rounded-lg transition-all ${
                  settings.chime === 'NONE'
                    ? 'bg-white text-slate-900 shadow-xs font-black text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                शांत (None)
              </button>
            </div>
          </div>

          {/* Speech Rate (Speed) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>{t('ann.speedControl', 'Speech Speed (Rate)')}</span>
              <span className="font-mono text-slate-900 font-bold">{settings.rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.05"
              step="0.02"
              value={settings.rate}
              onChange={(e) => updateSettings({ rate: parseFloat(e.target.value) })}
              className="w-full accent-red-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Calm ST Announcer (0.86x)</span>
              <span>Fast (1.0x)</span>
            </div>
          </div>

          {/* Master Volume */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>{t('ann.volumeControl', 'Master PA Volume')}</span>
              <span className="font-mono text-slate-900 font-bold">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={settings.volume}
              onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Voice Selector */}
          {availableVoices.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-600">
                आवाज निवड (TTS Voice)
              </label>
              <select
                value={settings.selectedVoiceURI || ''}
                onChange={(e) => updateSettings({ selectedVoiceURI: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-red-500"
              >
                <option value="">स्वयंचलित (सर्वोत्तम भारतीय मराठी/हिंदी देवनागरी आवाज)</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chime Audition Buttons */}
          <div className="flex gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => playStBusStandBell(settings.volume)}
              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition-colors"
            >
              🔔 २-टोन घंटा चाचणी
            </button>
            <button
              type="button"
              onClick={() => playTerminalChime(settings.volume)}
              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition-colors"
            >
              🎵 ४-टोन घंटा चाचणी
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
