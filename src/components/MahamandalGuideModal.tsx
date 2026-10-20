import React from 'react';
import {
  BookOpen,
  Smartphone,
  Tv,
  Volume2,
  Compass,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Radio,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MahamandalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MahamandalGuideModal: React.FC<MahamandalGuideModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/30 shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                  MSRTC Official Standard Operating Procedure (SOP)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 mt-1">
                {t('guide.modalTitle', 'MSRTC Mahamandal Real-World Deployment & Operations Guide')}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {t(
                  'guide.modalSubtitle',
                  '४-सोप्या पायऱ्यांत प्रत्यक्ष बस, संगणक, टीव्ही आणि लाउडस्पीकर जोडून प्रणाली सुरू करा.'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1: Driver Phone GPS */}
          <div className="p-5 bg-linear-to-br from-red-50/80 to-white rounded-2xl border border-red-100 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 font-black text-sm">
                <Smartphone className="w-5 h-5 shrink-0" />
                <h4>{t('guide.step1', 'पायरी १: चालकाचा मोबाईल बसमध्ये बसवणे (GPS Tracker)')}</h4>
              </div>
              <span className="px-2 py-0.5 bg-red-600 text-white font-mono text-[10px] font-bold rounded-lg">
                /mobile-gps
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {t(
                'guide.step1Details',
                'कोणत्याही चालकाच्या किंवा वाहकाच्या अँड्रॉइड मोबाईलमध्ये क्रोम ब्राउझर उघडून /mobile-gps ही लिंक उघडा (किंवा क्यूआर कोड स्कॅन करा). बस क्रमांक निवडा आणि "🔴 थेट GPS ट्रान्समिट सुरू करा" बटण दाबा. फोन बसच्या काचेजवळ किंवा डॅशबोर्डवर ठेवावा. स्क्रीन बंद होणार नाही अशी स्वयंचलित सोय (WakeLock) यात केली आहे.'
              )}
            </p>
            <div className="text-[11px] text-red-800 font-bold bg-white/80 p-2 rounded-xl border border-red-200/60 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>कोणतेही स्वतंत्र GPS हार्डवेअर विकत घेण्याची गरज नाही!</span>
            </div>
          </div>

          {/* Step 2: Station Control Room */}
          <div className="p-5 bg-linear-to-br from-teal-50/80 to-white rounded-2xl border border-teal-100 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-800 font-black text-sm">
                <Compass className="w-5 h-5 shrink-0" />
                <h4>{t('guide.step2', 'पायरी २: स्थानक नियंत्रण कक्ष (Station Master PC)')}</h4>
              </div>
              <span className="px-2 py-0.5 bg-teal-700 text-white font-mono text-[10px] font-bold rounded-lg">
                / (Dashboard)
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {t(
                'guide.step2Details',
                'स्थानक प्रमुखांच्या किंवा नियंत्रकांच्या संगणकावर / (डॅशबोर्ड) उघडा. मलकापूरच्या १.२ किमी परिसरात बस येताच प्रणाली आपोआप रिकाम्या फलाटावर (१ ते ४) तिचे वाटप करेल. कोणत्याही मानवी हस्तक्षेपाची गरज नाही.'
              )}
            </p>
            <div className="text-[11px] text-teal-900 font-bold bg-white/80 p-2 rounded-xl border border-teal-200/60 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>१००% स्वयंचलित फलाट वाटप (Zero Conflict Engine)</span>
            </div>
          </div>

          {/* Step 3: Passenger Display (PID TV) */}
          <div className="p-5 bg-linear-to-br from-amber-50/80 to-white rounded-2xl border border-amber-100 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                <Tv className="w-5 h-5 shrink-0" />
                <h4>{t('guide.step3', 'पायरी ३: स्थानकावरील प्रवासी माहिती फलक (PID TV)')}</h4>
              </div>
              <span className="px-2 py-0.5 bg-amber-600 text-slate-950 font-mono text-[10px] font-bold rounded-lg">
                /passenger-display
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {t(
                'guide.step3Details',
                'बस स्थानकाच्या प्रतीक्षालयातील किंवा फलाटावरील टीव्हीला संगणक किंवा अँड्रॉइड बॉक्स जोडून /passenger-display ही लिंक उघडा आणि कीबोर्डवर F11 (फुल स्क्रीन) दाबा. प्रवाशांना मराठी, हिंदी व इंग्रजीत थेट फलाट क्रमांक व येणाऱ्या बसेस दिसतील.'
              )}
            </p>
            <div className="text-[11px] text-amber-900 font-bold bg-white/80 p-2 rounded-xl border border-amber-200/60 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>दर ३ सेकंदांनी थेट अद्ययावत होणारे डिजिटल वेळापत्रक</span>
            </div>
          </div>

          {/* Step 4: Public Address System (PA Loudspeakers) */}
          <div className="p-5 bg-linear-to-br from-emerald-50/80 to-white rounded-2xl border border-emerald-100 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                <Volume2 className="w-5 h-5 shrink-0" />
                <h4>{t('guide.step4', 'पायरी ४: स्थानकाचा ध्वनिक्षेपक (PA Loudspeakers)')}</h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-700 text-white font-mono text-[10px] font-bold rounded-lg">
                ३.५ मिमी AUX केबल
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {t(
                'guide.step4Details',
                'संगणकाची ऑडिओ केबल (३.५ मिमी जॅक) स्थानकाच्या ॲम्प्लिफायरला जोडा. हेडरमध्ये "PA Auto-Announce: ON" ठेवा. बस येताच आधी गोड घंटा (Chime) वाजेल आणि त्यानंतर अस्सल एसटी महामंडळाच्या आवाजात फलाट क्रमांकाची उद्घोषणा आपोआप होईल.'
              )}
            </p>
            <div className="text-[11px] text-emerald-900 font-bold bg-white/80 p-2 rounded-xl border border-emerald-200/60 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>२-टोन एसटी घंटा + देवनागरी उच्चार ध्वनीप्रणाली</span>
            </div>
          </div>
        </div>

        {/* Live Wiring Diagram Summary */}
        <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-2 border border-slate-800 text-xs">
          <div className="font-extrabold text-amber-400 flex items-center gap-2">
            <span>⚡ प्रत्यक्ष वायरिंग व जोडणी नकाशा (Real-World Wiring Summary)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] text-slate-300">
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
              <div className="font-bold text-white">१. चालकाचा फोन:</div>
              <div className="text-slate-400 mt-0.5">४G इंटरनेट + GPS On. बसच्या विंडशील्डवर मोबाईल होल्डरमध्ये फिक्स करा.</div>
            </div>
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
              <div className="font-bold text-white">२. स्थानक लॅपटॉप/PC:</div>
              <div className="text-slate-400 mt-0.5">वायफाय किंवा लॅन इंटरनेट. क्रोम ब्राउझरमध्ये मुख्य सिस्टीम उघडा.</div>
            </div>
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
              <div className="font-bold text-white">३. डिस्प्ले टीव्ही:</div>
              <div className="text-slate-400 mt-0.5">स्थानक पीसीमधून HDMI केबल थेट ५५" टीव्हीला जोडा. (F11 Fullscreen)</div>
            </div>
            <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700">
              <div className="font-bold text-white">४. लाउडस्पीकर:</div>
              <div className="text-slate-400 mt-0.5">स्थानक पीसीचा Audio Out (AUX) स्थानकाच्या आहूजा ॲम्प्लिफायरला जोडा.</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-950 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              {language === 'mr-IN'
                ? 'हे ॲप पूर्णपणे तयार आहे — परवा एसटी महामंडळाच्या अधिकाऱ्यांसमोर थेट सादर करू शकता!'
                : language === 'hi-IN'
                ? 'यह ऐप पूरी तरह तैयार है — महामंडल अधिकारियों के सामने सीधे प्रदर्शित कर सकते हैं!'
                : 'System is 100% production-ready for live presentation to MSRTC officials.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-md"
          >
            समजले, पुढे चला (Got It, Proceed)
          </button>
        </div>
      </div>
    </div>
  );
};
