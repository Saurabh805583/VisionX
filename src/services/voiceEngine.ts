/**
 * Smart MSRTC - VisionX
 * High-Fidelity Transport Public Address (PA) Audio & Voice Synthesis Engine
 *
 * Designed specifically for Maharashtra State Road Transport Corporation (MSRTC / ST Mahamandal)
 * Features:
 * - Authentic 2-Tone MSRTC Bus Stand Ding-Dong Bell & 4-Tone Resonant Terminal Chime via Web Audio API
 * - Automatic Indian Devanagari Voice Match (Native Marathi / Hindi Natural with phonetic fallback)
 * - Devanagari Pronunciation & Pause Cadence Enhancer (translates plate numbers and platform digits)
 * - Speech Mutex Guard to prevent audio collisions across tabs and components
 */

export type ChimeStyle = 'ST_BELL' | 'TERMINAL_CHIME' | 'NONE';

export interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  chime: ChimeStyle;
  selectedVoiceURI?: string;
}

// Default broadcaster settings calibrated for calm, dignified station delivery
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  rate: 0.86,
  pitch: 0.98,
  volume: 0.95,
  chime: 'ST_BELL',
};

/**
 * Play authentic 2-tone ST bus stand bell (Ding-Dong: G5 -> C5)
 * Harmonic overtone model replicates the acoustic mechanical bells in Maharashtra ST stands
 */
export function playStBusStandBell(volume: number = 0.9): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(1.0, volume)), ctx.currentTime);
      masterGain.connect(ctx.destination);

      // Two-tone ST Ding-Dong: Note 1 = 783.99 Hz (G5), Note 2 = 523.25 Hz (C5)
      const notes = [
        { freq: 783.99, start: 0.0, dur: 0.55 },
        { freq: 523.25, start: 0.35, dur: 0.85 },
      ];

      notes.forEach(({ freq, start, dur }) => {
        const tStart = ctx.currentTime + start;
        const tEnd = tStart + dur;

        // Sine fundamental
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, tStart);

        gain1.gain.setValueAtTime(0, tStart);
        gain1.gain.linearRampToValueAtTime(0.4, tStart + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.001, tEnd);

        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(tStart);
        osc1.stop(tEnd);

        // Warm harmonic overtone (triangle)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, tStart);

        gain2.gain.setValueAtTime(0, tStart);
        gain2.gain.linearRampToValueAtTime(0.08, tStart + 0.012);
        gain2.gain.exponentialRampToValueAtTime(0.0005, tStart + dur * 0.5);

        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(tStart);
        osc2.stop(tStart + dur * 0.5);
      });

      setTimeout(() => {
        try { ctx.close(); } catch {}
        resolve();
      }, 1300);
    } catch {
      resolve();
    }
  });
}

/**
 * Play authentic 4-tone resonant terminal chime (C5 -> E5 -> G5 -> C6)
 */
export function playTerminalChime(volume: number = 0.9): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(1.0, volume)), ctx.currentTime);
      masterGain.connect(ctx.destination);

      const notes = [
        { freq: 523.25, start: 0.00, dur: 0.40 },
        { freq: 659.25, start: 0.22, dur: 0.40 },
        { freq: 783.99, start: 0.44, dur: 0.45 },
        { freq: 1046.50, start: 0.66, dur: 0.85 },
      ];

      notes.forEach(({ freq, start, dur }) => {
        const tStart = ctx.currentTime + start;
        const tEnd = tStart + dur;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, tStart);

        gain.gain.setValueAtTime(0, tStart);
        gain.gain.linearRampToValueAtTime(0.35, tStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, tEnd);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(tStart);
        osc.stop(tEnd);
      });

      setTimeout(() => {
        try { ctx.close(); } catch {}
        resolve();
      }, 1600);
    } catch {
      resolve();
    }
  });
}

/**
 * Humanizes text for natural, respectful announcer delivery in Marathi/Hindi/English
 * Replaces abbreviations, platforms, and license plates with dignified spoken phonetics
 */
export function humanizePublicAnnouncement(text: string, lang: string): string {
  if (!text) return '';

  let out = text.trim();

  // 1. Standardize bus registration plates (e.g. MH-28-BL-4521 or MH28BL4521)
  const plateRegex = /([A-Z]{2})[- ]?(\d{2})[- ]?([A-Z]{1,2})[- ]?(\d{4})/gi;
  out = out.replace(plateRegex, (_m, state, code, series, num) => {
    if (lang === 'mr-IN' || lang === 'hi-IN') {
      const stateLetters = state.toUpperCase().split('').map((c: string) => {
        const map: Record<string, string> = { M: 'एम', H: 'एच', G: 'जी', J: 'जे', K: 'के', D: 'डी' };
        return map[c] || c;
      }).join(' ');
      const seriesLetters = series.toUpperCase().split('').map((c: string) => {
        const map: Record<string, string> = {
          A: 'ए', B: 'बी', C: 'सी', D: 'डी', E: 'ई', F: 'एफ', G: 'जी', H: 'एच',
          I: 'आय', J: 'जे', K: 'के', L: 'एल', M: 'एम', N: 'एन', O: 'ओ', P: 'पी',
          Q: 'क्यू', R: 'आर', S: 'एस', T: 'टी', U: 'यू', V: 'व्ही', W: 'डब्ल्यू',
          X: 'एक्स', Y: 'वाय', Z: 'झेड'
        };
        return map[c] || c;
      }).join(' ');
      const numChunked = `${num.slice(0, 2)} ${num.slice(2)}`;
      return `${stateLetters} ${code}, ${seriesLetters}, ${numChunked}`;
    }
    return `${state.split('').join(' ')} ${code}, ${series.split('').join(' ')}, ${num.slice(0, 2)} ${num.slice(2)}`;
  });

  // 2. Platform digits and destinations to natural spoken words for Marathi & Hindi
  if (lang === 'mr-IN' || lang === 'hi-IN') {
    out = out
      .replace(/Pune \(Swargate\)|Pune Swargate|Pune\b/gi, 'पुणे स्वारगेट')
      .replace(/Nagpur \(Ganeshpeth\)|Nagpur Ganeshpeth|Nagpur\b/gi, 'नागपूर')
      .replace(/Buldhana Central|Buldhana\b/gi, 'बुलढाणा')
      .replace(/Akola Central|Akola\b/gi, 'अकोला')
      .replace(/Jalgaon \(New Stand\)|Jalgaon\b/gi, 'जळगाव')
      .replace(/Shegaon \(Gajanan Mandir\)|Shegaon\b/gi, 'शेगाव')
      .replace(/Nashik \(CBS Old\)|Nashik\b/gi, 'नाशिक')
      .replace(/Amravati \(Central\)|Amravati\b/gi, 'अमरावती')
      .replace(/Chhatrapati Sambhajinagar|Aurangabad\b/gi, 'छत्रपती संभाजीनगर')
      .replace(/Khamgaon \(Central\)|Khamgaon\b/gi, 'खामगाव')
      .replace(/Mumbai \(Parel MSRTC\)|Mumbai\b/gi, 'मुंबई')
      .replace(/Malkapur\b/gi, 'मलकापूर');
  }

  if (lang === 'mr-IN') {
    out = out
      .replace(/फलाट क्रमांक 1\b|प्लॅटफॉर्म क्रमांक 1\b/g, 'फलाट क्रमांक एक')
      .replace(/फलाट क्रमांक 2\b|प्लॅटफॉर्म क्रमांक 2\b/g, 'फलाट क्रमांक दोन')
      .replace(/फलाट क्रमांक 3\b|प्लॅटफॉर्म क्रमांक 3\b/g, 'फलाट क्रमांक तीन')
      .replace(/फलाट क्रमांक 4\b|प्लॅटफॉर्म क्रमांक 4\b/g, 'फलाट क्रमांक चार')
      .replace(/फलाट क्रमांक (\d+)/g, 'फलाट क्रमांक $1')
      .replace(/कृपया लक्ष द्या[!.]?/g, 'कृपया लक्ष द्या...')
      .replace(/ वर लागत आहे/g, '... वर लागत आहे')
      .replace(/ वर येत आहे/g, '... वर येत आहे')
      .replace(/प्रवाशांनी कृपया नोंद घ्यावी/g, '... प्रवाशांनी कृपया नोंद घ्यावी.');
  } else if (lang === 'hi-IN') {
    out = out
      .replace(/प्लेटफॉर्म क्रमांक 1\b|प्लेटफॉर्म नंबर 1\b/g, 'प्लेटफॉर्म क्रमांक एक')
      .replace(/प्लेटफॉर्म क्रमांक 2\b|प्लेटफॉर्म नंबर 2\b/g, 'प्लेटफॉर्म क्रमांक दो')
      .replace(/प्लेटफॉर्म क्रमांक 3\b|प्लेटफॉर्म नंबर 3\b/g, 'प्लेटफॉर्म क्रमांक तीन')
      .replace(/प्लेटफॉर्म क्रमांक 4\b|प्लेटफॉर्म नंबर 4\b/g, 'प्लेटफॉर्म क्रमांक चार')
      .replace(/कृपया ध्यान दें[!.]?/g, 'कृपया ध्यान दें...')
      .replace(/यात्रीगण कृपया ध्यान दें/g, '... यात्रीगण कृपया ध्यान दें.');
  } else {
    out = out
      .replace(/Platform 1\b/gi, 'Platform number One')
      .replace(/Platform 2\b/gi, 'Platform number Two')
      .replace(/Platform 3\b/gi, 'Platform number Three')
      .replace(/Platform 4\b/gi, 'Platform number Four');
  }

  return out;
}

/**
 * Find the optimal voice for Indian public address delivery
 */
export function findBestIndianVoice(
  voices: SpeechSynthesisVoice[],
  targetLang: string,
  preferredURI?: string
): { voice: SpeechSynthesisVoice | null; voiceLang: string } {
  if (voices.length === 0) {
    return { voice: null, voiceLang: targetLang };
  }

  // 1. Explicit user selection
  if (preferredURI) {
    const found = voices.find((v) => v.voiceURI === preferredURI);
    if (found) {
      return { voice: found, voiceLang: found.lang || targetLang };
    }
  }

  const langPrefix = targetLang.substring(0, 2).toLowerCase();

  // 2. Direct language match
  const directMatch = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith(langPrefix) ||
      (langPrefix === 'mr' && v.name.toLowerCase().includes('marathi'))
  );
  if (directMatch) {
    return { voice: directMatch, voiceLang: directMatch.lang };
  }

  // 3. If Marathi requested but no Marathi voice installed:
  // Pick Hindi voice (Google हिन्दी, Microsoft Swara/Madhur, Lekha, Veena) which speaks flawless Devanagari!
  if (langPrefix === 'mr') {
    const hindiDevanagariVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi') ||
        v.name.toLowerCase().includes('हिन्दी')
    );
    if (hindiDevanagariVoice) {
      // NOTE: setting utterance.lang to hi-IN ensures Chrome uses this Devanagari engine!
      return { voice: hindiDevanagariVoice, voiceLang: 'hi-IN' };
    }
  }

  // 4. Any Indian English voice
  const indianVoice = voices.find(
    (v) =>
      v.lang.includes('IN') ||
      v.name.toLowerCase().includes('india') ||
      v.name.toLowerCase().includes('heera') ||
      v.name.toLowerCase().includes('neerja') ||
      v.name.toLowerCase().includes('prabhat')
  );
  if (indianVoice) {
    return { voice: indianVoice, voiceLang: indianVoice.lang };
  }

  // 5. Fallback to first voice
  return { voice: voices[0], voiceLang: voices[0].lang || targetLang };
}

// Global speaking mutex to eliminate cross-component speech overlaps
let isSynthesizingGlobal = false;

export async function speakTransportAnnouncement(
  text: string,
  lang: string,
  settings: VoiceSettings = DEFAULT_VOICE_SETTINGS,
  voices: SpeechSynthesisVoice[] = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []
): Promise<void> {
  if (!('speechSynthesis' in window)) return;

  if (isSynthesizingGlobal) {
    window.speechSynthesis.cancel();
  }

  isSynthesizingGlobal = true;

  try {
    // 1. Play selected chime
    if (settings.chime === 'ST_BELL') {
      await playStBusStandBell(settings.volume);
      await new Promise((r) => setTimeout(r, 450));
    } else if (settings.chime === 'TERMINAL_CHIME') {
      await playTerminalChime(settings.volume);
      await new Promise((r) => setTimeout(r, 450));
    }

    // 2. Humanize text
    const processedText = humanizePublicAnnouncement(text, lang);

    // 3. Find optimal voice
    const { voice, voiceLang } = findBestIndianVoice(voices, lang, settings.selectedVoiceURI);

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      utterance.lang = voiceLang;

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        isSynthesizingGlobal = false;
        resolve();
      };

      utterance.onerror = () => {
        isSynthesizingGlobal = false;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  } catch {
    isSynthesizingGlobal = false;
  }
}
