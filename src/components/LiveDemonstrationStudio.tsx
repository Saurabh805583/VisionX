import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Navigation,
  Radio,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Bell,
  Bus as BusIcon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Send,
  Zap,
  MapPin,
  Info,
  Sliders,
  ChevronRight,
  Tv,
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
  speakTransportAnnouncement,
  DEFAULT_VOICE_SETTINGS,
  playStBusStandBell,
  playTerminalChime,
} from '../services/voiceEngine';

export interface DemoBus {
  id: string;
  busNumber: string;
  platePhonetics: string;
  depot: string;
  depotMr: string;
  origin: string;
  originMr: string;
  destination: string;
  destinationMr: string;
  busType: string;
  busTypeMr: string;
  color: 'red' | 'blue' | 'green';
  corridor: 'WEST_NH53' | 'EAST_NH53' | 'SOUTH_SH176' | 'SOUTHEAST_SHG';
  corridorNameMr: string;
  recommendedPlatform: number;
  allocationReasonMr: string;
  currentDistanceMeters: number;
  currentSpeedKmh: number;
  currentLat: number;
  currentLng: number;
  heading: number;
  status: 'SCHEDULED' | 'APPROACHING' | 'AT_PLATFORM' | 'DEPARTED';
  assignedPlatform: number | null;
  isInGeofence: boolean;
}

// 10 Authentic MSRTC Real Buses & Highway Corridors around Malkapur
const INITIAL_DEMO_BUSES: DemoBus[] = [
  {
    id: 'BUS-101',
    busNumber: 'MH-28-BL-4521',
    platePhonetics: 'एम. एच. २८, बी. एल., ४५ २१',
    depot: 'Malkapur Depot',
    depotMr: 'मलकापूर आगार',
    origin: 'Pune Swargate',
    originMr: 'पुणे स्वारगेट',
    destination: 'Nagpur Ganeshpeth',
    destinationMr: 'नागपूर गणेशपेठ',
    busType: 'Shivshahi AC Seater',
    busTypeMr: 'शिवशाही (वातानुकूलित)',
    color: 'blue',
    corridor: 'WEST_NH53',
    corridorNameMr: 'NH 53 पश्चिम (पुणे/नाशिक/जळगाव/भुसावळ कॉरिडोअर)',
    recommendedPlatform: 1,
    allocationReasonMr: 'पुणे/नाशिक एक्सप्रेस कॉरिडोअर जुळणी + लांब पल्ल्याची वातानुकूलित बस',
    currentDistanceMeters: 4200,
    currentSpeedKmh: 58,
    currentLat: 20.9020,
    currentLng: 76.1550,
    heading: 105,
    status: 'SCHEDULED',
    assignedPlatform: null,
    isInGeofence: false,
  },
  {
    id: 'BUS-102',
    busNumber: 'MH-31-AP-9124',
    platePhonetics: 'एम. एच. ३१, ए. पी., ९१ २४',
    depot: 'Nagpur Ganeshpeth Depot',
    depotMr: 'नागपूर गणेशपेठ आगार',
    origin: 'Nagpur Ganeshpeth',
    originMr: 'नागपूर गणेशपेठ',
    destination: 'Malkapur Central',
    destinationMr: 'मलकापूर मध्यवर्ती',
    busType: 'Ordinary Parivahan (Lalpari)',
    busTypeMr: 'परिवर्तन (लालपरी)',
    color: 'red',
    corridor: 'EAST_NH53',
    corridorNameMr: 'NH 53 पूर्व (नागपूर/अमरावती/अकोला/नांदुरा कॉरिडोअर)',
    recommendedPlatform: 2,
    allocationReasonMr: 'विदर्भ पूर्व दिशा NH 53 कॉरिडोअर + फलाट २ मोकळा आहे',
    currentDistanceMeters: 3800,
    currentSpeedKmh: 52,
    currentLat: 20.8800,
    currentLng: 76.2500,
    heading: 265,
    status: 'SCHEDULED',
    assignedPlatform: null,
    isInGeofence: false,
  },
  {
    id: 'BUS-103',
    busNumber: 'MH-28-BQ-4310',
    platePhonetics: 'एम. एच. २८, बी. क्यू., ४३ १०',
    depot: 'Buldhana Central Depot',
    depotMr: 'बुलढाणा मध्यवर्ती आगार',
    origin: 'Buldhana Central',
    originMr: 'बुलढाणा मध्यवर्ती',
    destination: 'Malkapur Central',
    destinationMr: 'मलकापूर मध्यवर्ती',
    busType: 'Ordinary Parivahan (Lalpari)',
    busTypeMr: 'परिवर्तन (लालपरी)',
    color: 'red',
    corridor: 'SOUTH_SH176',
    corridorNameMr: 'राज्य महामार्ग १७६ दक्षिण (बुलढाणा/मोताळा कॉरिडोअर)',
    recommendedPlatform: 3,
    allocationReasonMr: 'बुलढाणा जिल्हा मुख्यालय प्रादेशिक कॉरिडोअर (फलाट ३)',
    currentDistanceMeters: 2900,
    currentSpeedKmh: 46,
    currentLat: 20.8650,
    currentLng: 76.2016,
    heading: 0,
    status: 'SCHEDULED',
    assignedPlatform: null,
    isInGeofence: false,
  },
  {
    id: 'BUS-105',
    busNumber: 'MH-28-C-3118',
    platePhonetics: 'एम. एच. २८, सी., ३१ १८',
    depot: 'Shegaon Gajanan Mandir Depot',
    depotMr: 'शेगाव गजानन मंदिर आगार',
    origin: 'Shegaon Gajanan Mandir',
    originMr: 'शेगाव गजानन महाराज मंदिर',
    destination: 'Malkapur Bus Stand',
    destinationMr: 'मलकापूर बस स्थानक',
    busType: 'Ordinary Parivahan (Lalpari)',
    busTypeMr: 'परिवर्तन (लालपरी)',
    color: 'red',
    corridor: 'SOUTHEAST_SHG',
    corridorNameMr: 'शेगाव तीर्थक्षेत्र कॉरिडोअर (जालंब/नांदुरा)',
    recommendedPlatform: 4,
    allocationReasonMr: 'शेगाव भाविक शटल व ग्रामीण फिडर कॉरिडोअर (फलाट ४)',
    currentDistanceMeters: 3400,
    currentSpeedKmh: 48,
    currentLat: 20.8700,
    currentLng: 76.2200,
    heading: 300,
    status: 'SCHEDULED',
    assignedPlatform: null,
    isInGeofence: false,
  },
  {
    id: 'BUS-104',
    busNumber: 'MH-19-M-7704',
    platePhonetics: 'एम. एच. १९, एम., ७७ ०४',
    depot: 'Jalgaon Depot',
    depotMr: 'जळगाव आगार',
    origin: 'Jalgaon (New Stand)',
    originMr: 'जळगाव नवीन बस स्थानक',
    destination: 'Malkapur Central',
    destinationMr: 'मलकापूर मध्यवर्ती',
    busType: 'Asiad Seater (Semi-Luxury 2x2)',
    busTypeMr: 'आशियाड (निमआराम २x२)',
    color: 'green',
    corridor: 'WEST_NH53',
    corridorNameMr: 'NH 53 पश्चिम (जळगाव/भुसावळ/मुक्ताईनगर)',
    recommendedPlatform: 1,
    allocationReasonMr: 'पश्चिम कॉरिडोअर एक्सप्रेस व निमआराम सेवा',
    currentDistanceMeters: 5100,
    currentSpeedKmh: 60,
    currentLat: 20.9120,
    currentLng: 76.1350,
    heading: 105,
    status: 'SCHEDULED',
    assignedPlatform: null,
    isInGeofence: false,
  },
  {
    id: 'BUS-106',
    busNumber: 'MH-15-AK-6520',
    platePhonetics: 'एम. एच. १५, ए. के., ६५ २०',
    depot: 'Nashik CBS Depot 1',
    depotMr: 'नाशिक सीबीएस आगार',
    origin: 'Nashik CBS Old',
    originMr: 'नाशिक सीबीएस',
    destination: 'Nagpur Ganeshpeth',
    destinationMr: 'नागपूर गणेशपेठ',
    busType: 'Shivshahi AC Seater',
    busTypeMr: 'शिवशाही (वातानुकूलित)',
    color: 'blue',
    corridor: 'WEST_NH53',
    corridorNameMr: 'NH 53 पश्चिम (नाशिक/धुळे/जळगाव कॉरिडोअर)',
    recommendedPlatform: 1,
    allocationReasonMr: 'नाशिक लांब पल्ला वातानुकूलित शिवशाही सेवा',
    currentDistanceMeters: 6200,
    currentSpeedKmh: 64,
    currentLat: 20.9200,
    currentLng: 76.1150,
    heading: 105,
    status: 'SCHEDULED',
    assignedPlatform: null,
    isInGeofence: false,
  },
  {
    id: 'BUS-107',
    busNumber: 'MH-30-BR-2201',
    platePhonetics: 'एम. एच. ३०, बी. आर., २२ ०१',
    depot: 'Akola Central Depot',
    depotMr: 'अकोला मध्यवर्ती आगार',
    origin: 'Akola Central',
    originMr: 'अकोला मध्यवर्ती',
    destination: 'Malkapur Central',
    destinationMr: 'मलकापूर मध्यवर्ती',
    busType: 'Asiad Seater (Semi-Luxury 2x2)',
    busTypeMr: 'आशियाड (निमआराम २x२)',
    color: 'green',
    corridor: 'EAST_NH53',
    corridorNameMr: 'NH 53 पूर्व (अकोला/नांदुरा)',
    recommendedPlatform: 2,
    allocationReasonMr: 'अकोला विभागीय जलद सेवा (फलाट २)',
    currentDistanceMeters: 4500,
    currentSpeedKmh: 50,
    currentLat: 20.8750,
    currentLng: 76.2600,
    heading: 265,
    status: 'SCHEDULED',
    assignedPlatform: null,
    isInGeofence: false,
  },
  {
    id: 'BUS-109',
    busNumber: 'MH-28-AB-8902',
    platePhonetics: 'एम. एच. २८, ए. बी., ८९ ०२',
    depot: 'Khamgaon Depot',
    depotMr: 'खामगाव आगार',
    origin: 'Khamgaon Central',
    originMr: 'खामगाव मध्यवर्ती',
    destination: 'Malkapur Central',
    destinationMr: 'मलकापूर मध्यवर्ती',
    busType: 'Ordinary Parivahan (Lalpari)',
    busTypeMr: 'परिवर्तन (लालपरी)',
    color: 'red',
    corridor: 'EAST_NH53',
    corridorNameMr: 'खामगाव-नांदुरा-मलकापूर कॉरिडोअर',
    recommendedPlatform: 3,
    allocationReasonMr: 'बुलढाणा अंतर्गत खामगाव प्रादेशिक फेरी',
    currentDistanceMeters: 5500,
    currentSpeedKmh: 45,
    currentLat: 20.8700,
    currentLng: 76.2750,
    heading: 265,
    status: 'SCHEDULED',
    assignedPlatform: null,
    isInGeofence: false,
  },
];

interface PlatformBayState {
  bayNumber: number;
  title: string;
  titleMr: string;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED';
  dockedBusNumber: string | null;
  dockedDestinationMr: string | null;
  dockedBusTypeMr: string | null;
}

export const LiveDemonstrationStudio: React.FC = () => {
  const { t, language } = useLanguage();
  const [buses, setBuses] = useState<DemoBus[]>(INITIAL_DEMO_BUSES);
  const [selectedBusId, setSelectedBusId] = useState<string>('BUS-101');
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [autoAllocateMode, setAutoAllocateMode] = useState<boolean>(true);
  const [latestEventMessage, setLatestEventMessage] = useState<string | null>(
    'सज्ज: चालकाच्या मोबाईलचे थेट GPS सिग्नल व मलकापूर १.२ किमी जिओफेन्स रडार सक्रिय आहे.'
  );
  const [showOfficerGuide, setShowOfficerGuide] = useState(false);
  const [lastAnnouncementText, setLastAnnouncementText] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Station Platform Bays 1 to 4 State
  const [platformBays, setPlatformBays] = useState<PlatformBayState[]>([
    {
      bayNumber: 1,
      title: 'Platform 1 (Pune/Nashik/Mumbai Corridor)',
      titleMr: 'फलाट १ — पुणे/नाशिक/मुंबई कॉरिडोअर',
      status: 'FREE',
      dockedBusNumber: null,
      dockedDestinationMr: null,
      dockedBusTypeMr: null,
    },
    {
      bayNumber: 2,
      title: 'Platform 2 (Nagpur/Amravati/Akola Corridor)',
      titleMr: 'फलाट २ — नागपूर/अमरावती/अकोला कॉरिडोअर',
      status: 'FREE',
      dockedBusNumber: null,
      dockedDestinationMr: null,
      dockedBusTypeMr: null,
    },
    {
      bayNumber: 3,
      title: 'Platform 3 (Buldhana/Khamgaon Regional Corridor)',
      titleMr: 'फलाट ३ — बुलढाणा/खामगाव प्रादेशिक कॉरिडोअर',
      status: 'OCCUPIED',
      dockedBusNumber: 'MH-28-BQ-4310',
      dockedDestinationMr: 'बुलढाणा मध्यवर्ती',
      dockedBusTypeMr: 'परिवर्तन (लालपरी)',
    },
    {
      bayNumber: 4,
      title: 'Platform 4 (Shegaon/Nandura Pilgrim Shuttle)',
      titleMr: 'फलाट ४ — शेगाव तीर्थक्षेत्र व ग्रामीण शटल',
      status: 'FREE',
      dockedBusNumber: null,
      dockedDestinationMr: null,
      dockedBusTypeMr: null,
    },
  ]);

  const activeBus = buses.find((b) => b.id === selectedBusId) || buses[0];
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Play announcement helper
  const triggerVoiceAnnouncement = async (bus: DemoBus, platformNum: number) => {
    setIsSpeaking(true);
    const spokenText = `कृपया लक्ष द्या... ${bus.destinationMr} कडे जाणारी गाडी, गाडी क्रमांक ${bus.platePhonetics}... फलाट क्रमांक ${
      platformNum === 1 ? 'एक' : platformNum === 2 ? 'दोन' : platformNum === 3 ? 'तीन' : platformNum === 4 ? 'चार' : platformNum
    } वर लागत आहे... प्रवाशांनी कृपया नोंद घ्यावी.`;
    setLastAnnouncementText(spokenText);

    try {
      await speakTransportAnnouncement(
        spokenText,
        'mr-IN',
        {
          rate: 0.86,
          pitch: 0.98,
          volume: 0.95,
          chime: 'ST_BELL',
        },
        window.speechSynthesis ? window.speechSynthesis.getVoices() : []
      );
    } finally {
      setIsSpeaking(false);
    }
  };

  // Dock bus into platform bay
  const confirmPlatformAllocation = async (busId: string, targetPlatform: number) => {
    const bus = buses.find((b) => b.id === busId);
    if (!bus) return;

    // 1. Update Platform Bays State
    setPlatformBays((prev) =>
      prev.map((bay) => {
        if (bay.bayNumber === targetPlatform) {
          return {
            ...bay,
            status: 'OCCUPIED',
            dockedBusNumber: bus.busNumber,
            dockedDestinationMr: bus.destinationMr,
            dockedBusTypeMr: bus.busTypeMr,
          };
        }
        return bay;
      })
    );

    // 2. Update Bus State: Docked at Stand (Distance = 0)
    setBuses((prev) =>
      prev.map((b) => {
        if (b.id === busId) {
          return {
            ...b,
            currentDistanceMeters: 0,
            currentSpeedKmh: 0,
            status: 'AT_PLATFORM',
            assignedPlatform: targetPlatform,
            isInGeofence: true,
          };
        }
        return b;
      })
    );

    const msg = `✅ फलाट मंजूर! गाडी ${bus.busNumber} (${bus.destinationMr}) फलाट क्रमांक ${targetPlatform} वर यशस्वीरीत्या लागली आहे!`;
    setLatestEventMessage(msg);

    // 3. Play Authentic 2-Tone ST Bell + Voice Announcement
    triggerVoiceAnnouncement(bus, targetPlatform);

    // 4. Send real API events to backend SQLite so Passenger Display & Dashboard sync in real time!
    try {
      await api.updateMobileGps({
        bus_id: bus.busNumber,
        latitude: 20.8871,
        longitude: 76.2014,
        speed_kmh: 0,
        accuracy_meters: 8.0,
        source: 'PHONE_GPS',
        timestamp: new Date().toISOString(),
      });
      await api.overridePlatform('TRIP-901', targetPlatform, 'Demo allocated by station supervisor', 'STAFF_DISPATCH');
    } catch {}
  };

  // Depart Bus from platform
  const departBus = (bayNumber: number) => {
    const bay = platformBays.find((b) => b.bayNumber === bayNumber);
    if (!bay || !bay.dockedBusNumber) return;

    const departedPlate = bay.dockedBusNumber;

    setPlatformBays((prev) =>
      prev.map((b) => {
        if (b.bayNumber === bayNumber) {
          return {
            ...b,
            status: 'FREE',
            dockedBusNumber: null,
            dockedDestinationMr: null,
            dockedBusTypeMr: null,
          };
        }
        return b;
      })
    );

    setBuses((prev) =>
      prev.map((b) => {
        if (b.busNumber === departedPlate) {
          return {
            ...b,
            status: 'DEPARTED',
            assignedPlatform: null,
            currentDistanceMeters: 3000,
            currentSpeedKmh: 45,
            isInGeofence: false,
          };
        }
        return b;
      })
    );

    setLatestEventMessage(`🚌 गाडी ${departedPlate} फलाट क्रमांक ${bayNumber} वरून पुढील प्रवासासाठी रवाना झाली. फलाट आता उपलब्ध आहे.`);
  };

  // Real-time approach simulation step
  const stepApproach = () => {
    setBuses((prev) =>
      prev.map((bus) => {
        if (bus.id !== selectedBusId) return bus;
        if (bus.status === 'AT_PLATFORM' || bus.status === 'DEPARTED') return bus;

        // Reduce distance smoothly
        const stepMeters = Math.round(180 * simSpeed);
        const newDistance = Math.max(1050, bus.currentDistanceMeters - stepMeters);
        const insideGeofence = newDistance <= 1200;

        // Speed reduces as bus enters city
        const newSpeed = insideGeofence ? Math.max(20, Math.round(bus.currentSpeedKmh * 0.92)) : bus.currentSpeedKmh;

        return {
          ...bus,
          currentDistanceMeters: newDistance,
          currentSpeedKmh: newSpeed,
          status: insideGeofence ? 'APPROACHING' : 'SCHEDULED',
          isInGeofence: insideGeofence,
        };
      })
    );
  };

  // Simulation timer loop
  useEffect(() => {
    if (isRunningSim) {
      simTimerRef.current = setInterval(() => {
        stepApproach();
      }, 1000);
    } else if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isRunningSim, simSpeed, selectedBusId]);

  // When active bus crosses into 1.2km geofence
  useEffect(() => {
    if (activeBus.isInGeofence && activeBus.status !== 'AT_PLATFORM') {
      const msg = `🚨 बस जिओफेन्स कक्षेत आली! अंतर: ${activeBus.currentDistanceMeters} मी · वेग: ${activeBus.currentSpeedKmh} किमी/तास. प्रणाली शिफारस: फलाट क्र. ${activeBus.recommendedPlatform}`;
      setLatestEventMessage(msg);

      // If auto-allocate is turned ON, allocate automatically after 1.5 seconds!
      if (autoAllocateMode && isRunningSim) {
        setIsRunningSim(false);
        setTimeout(() => {
          confirmPlatformAllocation(activeBus.id, activeBus.recommendedPlatform);
        }, 1200);
      }
    }
  }, [activeBus.currentDistanceMeters, activeBus.isInGeofence, autoAllocateMode]);

  // Jump to 1.1km geofence boundary immediately (Fast demonstration for officers)
  const jumpToGeofence = (busId: string) => {
    setBuses((prev) =>
      prev.map((b) => {
        if (b.id === busId) {
          return {
            ...b,
            currentDistanceMeters: 1150,
            currentSpeedKmh: 35,
            status: 'APPROACHING',
            isInGeofence: true,
          };
        }
        return b;
      })
    );
    setIsRunningSim(false);
  };

  // Reset demo
  const resetDemo = () => {
    setIsRunningSim(false);
    setBuses(INITIAL_DEMO_BUSES);
    setLatestEventMessage('डेमॉ रीसेट केला: सर्व बसेस आपापल्या कॉरिडोअरवर पूर्ववत ठेवल्या आहेत.');
    setLastAnnouncementText(null);
  };

  // Map coordinates projection onto 600x400 Radar Visual Box
  const getRadarCoordinates = (bus: DemoBus) => {
    // Center at [300, 200]
    const cx = 300;
    const cy = 200;
    const maxRadiusMeters = 6000;
    const maxPixelRadius = 175;

    const r = Math.min(maxPixelRadius, (bus.currentDistanceMeters / maxRadiusMeters) * maxPixelRadius);

    let angleRad = 0;
    if (bus.corridor === 'WEST_NH53') angleRad = Math.PI; // 180 deg (Left)
    else if (bus.corridor === 'EAST_NH53') angleRad = 0; // 0 deg (Right)
    else if (bus.corridor === 'SOUTH_SH176') angleRad = Math.PI / 2; // 90 deg (Bottom)
    else if (bus.corridor === 'SOUTHEAST_SHG') angleRad = Math.PI / 4; // 45 deg (Bottom-Right)

    const x = cx + r * Math.cos(angleRad);
    const y = cy + r * Math.sin(angleRad);

    return { x, y };
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden font-sans space-y-0">
      {/* Top Banner: Presenter Title & Quick Controls */}
      <div className="bg-linear-to-r from-slate-900 via-slate-900 to-slate-950 text-white p-5 md:p-6 border-b border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="px-2.5 py-0.5 bg-red-600/30 text-red-300 border border-red-500/40 text-[10px] font-black rounded-full uppercase tracking-wider">
                MSRTC LIVE DEMO STUDIO · महामंडळ सादरीकरण मॉडेल
              </span>
            </div>
            <h2 className="text-lg md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>थेट बस संचलन व स्वयंचलित फलाट वाटप रडार</span>
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              मलकापूर १.२ किमी जिओफेन्स कक्षा, थेट धावणाऱ्या बसेस, ऑडिओ उद्घोषणा व फलाट १ ते ४ वाटप मॉडेल.
            </p>
          </div>

          {/* Quick Presenter Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowOfficerGuide(!showOfficerGuide)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>अधिकाऱ्यांना कसे समजावून सांगायचे?</span>
            </button>

            <button
              onClick={resetDemo}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
              title="रीसेट करा"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Officer Explanation Accordion */}
        {showOfficerGuide && (
          <div className="mt-4 p-4 bg-slate-800/90 rounded-2xl border border-amber-400/30 text-xs text-slate-200 space-y-2 animate-in fade-in">
            <div className="font-extrabold text-amber-300 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>महामंडळाच्या अधिकाऱ्यांसमोर ३० सेकंदात डेमॉ दाखवण्याची पद्धत:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 font-medium leading-relaxed">
              <li>
                <strong className="text-white">पायरी १:</strong> खालील यादीतून कोणतीही बस निवडा (उदा. <em>पुणे शिवशाही MH-28-BL-4521</em>).
              </li>
              <li>
                <strong className="text-white">पायरी २:</strong> <strong>"⏩ १.२ किमी जिओफेन्सवर आणा"</strong> बटण दाबा. बस लगेच मलकापूरच्या १.२ किमी कक्षेत येईल.
              </li>
              <li>
                <strong className="text-white">पायरी ३:</strong> स्क्रीनवर <em>"फलाट क्र. १ शिफारस"</em> अशी सूचना येईल. <strong>"✅ फलाट मंजूर करा"</strong> वर क्लिक करा.
              </li>
              <li>
                <strong className="text-white">पायरी ४:</strong> बस थेट फलाट १ वर लागेल, <strong>२-टोन एसटी घंटा वाजेल</strong> आणि मराठीत अस्सल <strong>उद्घोषणा लाउडस्पीकरवर सुरू होईल</strong>!
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0 divide-y xl:divide-y-0 xl:divide-x divide-slate-200">
        {/* Left Column: Interactive Visual Radar Canvas (7 cols) */}
        <div className="xl:col-span-7 p-4 md:p-6 bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Top Live Ticker */}
          <div className="flex items-center justify-between mb-2 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">
                MALKAPUR GEOFENCE RADAR (1.2 KM)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Station Coords: 20.8871° N, 76.2014° E
            </span>
          </div>

          {/* SVG Visual Radar Screen */}
          <div className="relative w-full aspect-16/10 bg-radial from-slate-900 to-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden my-2">
            <svg viewBox="0 0 600 400" className="w-full h-full select-none">
              <defs>
                {/* Radar Grid Lines */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                </pattern>
                {/* Glowing Geofence Ring */}
                <radialGradient id="geofenceGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.05" />
                  <stop offset="90%" stopColor="#0d9488" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.6" />
                </radialGradient>
              </defs>

              {/* Background Grid */}
              <rect width="600" height="400" fill="url(#grid)" />

              {/* Highway Corridors Paths */}
              {/* NH 53 West from Jalgaon / Bhusawal */}
              <line x1="20" y1="200" x2="300" y2="200" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
              <line x1="20" y1="200" x2="300" y2="200" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4" />
              <text x="35" y="190" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                NH 53 (पुणे/नाशिक/जळगाव/भुसावळ)
              </text>

              {/* NH 53 East from Akola / Nagpur */}
              <line x1="300" y1="200" x2="580" y2="200" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
              <line x1="300" y1="200" x2="580" y2="200" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4" />
              <text x="440" y="190" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                NH 53 (अकोला/अमरावती/नागपूर)
              </text>

              {/* SH 176 South from Buldhana / Motala */}
              <line x1="300" y1="200" x2="300" y2="380" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
              <line x1="300" y1="200" x2="300" y2="380" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4" />
              <text x="310" y="360" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                SH 176 (बुलढाणा/मोताळा)
              </text>

              {/* Shegaon Pilgrim Corridor (Southeast diagonal) */}
              <line x1="300" y1="200" x2="480" y2="380" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
              <text x="430" y="340" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">
                शेगाव तीर्थक्षेत्र मार्ग
              </text>

              {/* Outer 5.0 km Radar Circle */}
              <circle cx="300" cy="200" r="160" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" />
              <text x="255" y="48" fill="#64748b" fontSize="8" fontFamily="monospace">
                ५.० किमी बाह्य रडार (5.0 km Radar)
              </text>

              {/* Middle 2.5 km Circle */}
              <circle cx="300" cy="200" r="100" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3,3" />
              <text x="250" y="108" fill="#64748b" fontSize="8" fontFamily="monospace">
                २.५ किमी पूर्व-सूचना (2.5 km Outer)
              </text>

              {/* Mandatory 1.2 km Station Geofence Circle (GLOWING TEAL) */}
              <circle cx="300" cy="200" r="50" fill="url(#geofenceGlow)" stroke="#14b8a6" strokeWidth="2.5" />
              <circle cx="300" cy="200" r="50" fill="none" stroke="#5eead4" strokeWidth="1" className="animate-ping" style={{ transformOrigin: '300px 200px', animationDuration: '3s' }} />
              <text x="245" y="145" fill="#2dd4bf" fontSize="9" fontWeight="900" fontFamily="sans-serif">
                १.२ किमी जिओफेन्स (1.2 km Geofence)
              </text>

              {/* Center Hub: Malkapur Bus Stand Building Icon */}
              <g transform="translate(282, 182)">
                <rect width="36" height="36" rx="8" fill="#dc2626" stroke="#ffffff" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))" />
                <text x="18" y="22" fill="#ffffff" fontSize="16" textAnchor="middle">🏢</text>
              </g>
              <text x="300" y="230" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">
                मलकापूर बस स्थानक
              </text>

              {/* Render All 10 Live Moving Buses with Authentic Bus Symbols */}
              {buses.map((bus) => {
                const { x, y } = getRadarCoordinates(bus);
                const isSelected = bus.id === selectedBusId;
                const isDocked = bus.status === 'AT_PLATFORM';

                // Bus Marker Color
                const bgColor = bus.color === 'blue' ? '#2563eb' : bus.color === 'green' ? '#16a34a' : '#dc2626';

                return (
                  <g
                    key={bus.id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer transition-all duration-700 ease-out"
                    onClick={() => setSelectedBusId(bus.id)}
                  >
                    {/* Pulsing ring if selected or inside geofence */}
                    {(isSelected || bus.isInGeofence) && (
                      <circle cx="0" cy="0" r="16" fill="none" stroke={bus.isInGeofence ? '#14b8a6' : '#f59e0b'} strokeWidth="2" className="animate-ping" style={{ animationDuration: '1.5s' }} />
                    )}

                    {/* Bus Icon Shape */}
                    <circle cx="0" cy="0" r="10" fill={bgColor} stroke="#ffffff" strokeWidth="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))" />
                    <text x="0" y="3.5" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                      🚌
                    </text>

                    {/* Label Badge */}
                    <g transform="translate(0, -14)">
                      <rect
                        x="-45"
                        y="-12"
                        width="90"
                        height="14"
                        rx="4"
                        fill={isDocked ? '#059669' : isSelected ? '#b91c1c' : '#0f172a'}
                        stroke={isSelected ? '#fde047' : '#334155'}
                        strokeWidth={isSelected ? '1.5' : '1'}
                      />
                      <text x="0" y="-2" fill="#ffffff" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        {bus.busNumber} {isDocked ? '(फलाट ' + bus.assignedPlatform + ')' : Math.round(bus.currentSpeedKmh) + 'km/h'}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Telemetry Ticker */}
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
              <span className="text-slate-300 font-semibold truncate">{latestEventMessage}</span>
            </div>
            {isSpeaking && (
              <span className="px-2 py-0.5 bg-red-600 text-white rounded-md text-[10px] font-bold animate-pulse shrink-0 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                <span>उद्घोषणा चालू</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Intelligent Dispatch & Platform Bay Allocation (5 cols) */}
        <div className="xl:col-span-5 p-5 md:p-6 bg-slate-50 flex flex-col justify-between space-y-5">
          {/* Active Selected Bus Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  निवडलेली बस (Selected Vehicle)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-base font-black text-slate-900 font-mono">
                    {activeBus.busNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    activeBus.color === 'blue'
                      ? 'bg-blue-100 text-blue-900'
                      : activeBus.color === 'green'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-red-100 text-red-900'
                  }`}>
                    {activeBus.busTypeMr}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-xs ${
                  activeBus.status === 'AT_PLATFORM'
                    ? 'bg-emerald-600 text-white'
                    : activeBus.isInGeofence
                    ? 'bg-amber-500 text-slate-950 animate-pulse'
                    : 'bg-slate-800 text-white'
                }`}>
                  {activeBus.status === 'AT_PLATFORM'
                    ? 'फलाटावर उभी आहे'
                    : activeBus.isInGeofence
                    ? 'जिओफेन्समध्ये आली'
                    : 'मार्गावर (En Route)'}
                </span>
              </div>
            </div>

            {/* Route Details */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-500 text-[11px]">मूळ आगार व मार्ग:</span>
                <div className="font-bold text-slate-900 truncate">{activeBus.depotMr}</div>
                <div className="text-slate-600 text-[11px] truncate">{activeBus.originMr} ➔ {activeBus.destinationMr}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">अंतर व वेग:</span>
                <div className="font-black text-teal-800 font-mono">
                  {activeBus.currentDistanceMeters === 0 ? 'स्थानकात पोहोचली' : (activeBus.currentDistanceMeters / 1000).toFixed(2) + ' km'}
                </div>
                <div className="text-slate-600 text-[11px] font-mono">{activeBus.currentSpeedKmh} km/h (Live GPS)</div>
              </div>
            </div>

            {/* Quick Bus Selector Dropdown */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                दुसरी गाडी निवडा (Switch Bus):
              </label>
              <select
                value={selectedBusId}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.busNumber} — {b.destinationMr} ({b.busTypeMr})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Simulation Controls Bar */}
          <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-red-600" />
                <span>लाइव्ह आगमन सिम्युलेटर कंट्रोल्स</span>
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                <span>स्पीड:</span>
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-2 py-0.5 rounded-md ${
                      simSpeed === spd ? 'bg-red-600 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsRunningSim(!isRunningSim)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                  isRunningSim
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isRunningSim ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isRunningSim ? 'सिम्युलेशन थांबवा' : '▶️ बस चालवून आणा'}</span>
              </button>

              <button
                onClick={() => jumpToGeofence(selectedBusId)}
                className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                title="अधिकारी सादरीकरणासाठी एका सेकंदात बस जिओफेन्सवर आणा"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⏩ १.२ किमी वर आणा</span>
              </button>
            </div>
          </div>

          {/* Geofence Ingress Allocation Alert Card */}
          {activeBus.isInGeofence && activeBus.status !== 'AT_PLATFORM' && (
            <div className="p-4 bg-linear-to-r from-teal-50 to-emerald-50 border-2 border-teal-500 rounded-2xl shadow-lg space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-teal-900 font-black text-xs">
                  <span className="w-3 h-3 rounded-full bg-teal-500 animate-ping" />
                  <span>🚨 जिओफेन्स प्रवेश! फलाट वाटप करा</span>
                </div>
                <span className="text-[11px] font-mono text-teal-800 font-extrabold">
                  अंतर: {activeBus.currentDistanceMeters}m
                </span>
              </div>

              <div className="p-2.5 bg-white/90 rounded-xl border border-teal-200 text-xs">
                <div className="text-slate-600 font-semibold text-[11px]">
                  प्रणाली शिफारस (Deterministic Rule Engine):
                </div>
                <div className="text-sm font-black text-teal-900 mt-0.5">
                  फलाट क्रमांक {activeBus.recommendedPlatform} (Platform {activeBus.recommendedPlatform})
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  कारण: {activeBus.allocationReasonMr}
                </div>
              </div>

              {/* Confirm / Choose Platform Buttons */}
              <div className="space-y-1.5">
                <button
                  onClick={() => confirmPlatformAllocation(activeBus.id, activeBus.recommendedPlatform)}
                  className="w-full py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>✅ सुचवलेला फलाट {activeBus.recommendedPlatform} मंजूर करा व उद्घोषणा द्या</span>
                </button>

                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500 font-bold">किंवा मॅन्युअल फलाट:</span>
                  {[1, 2, 3, 4].map((bayNum) => (
                    <button
                      key={bayNum}
                      onClick={() => confirmPlatformAllocation(activeBus.id, bayNum)}
                      className={`flex-1 py-1 rounded-lg font-bold border transition-all text-xs ${
                        bayNum === activeBus.recommendedPlatform
                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      फलाट {bayNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Platform Bays 1-4 Real-time Status Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">
                मलकापूर बस स्थानक — फलाट १ ते ४ सद्यस्थिती (Platform Bays)
              </span>
              <span className="text-[10px] font-bold text-slate-400">लाइव्ह डॉकिंग</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {platformBays.map((bay) => {
                const isOccupied = bay.status === 'OCCUPIED';

                return (
                  <div
                    key={bay.bayNumber}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      isOccupied
                        ? 'bg-red-50/80 border-red-300 ring-1 ring-red-200'
                        : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        फलाट {bay.bayNumber}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono ${
                          isOccupied
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isOccupied ? 'व्यापलेला' : 'मोकळा'}
                      </span>
                    </div>

                    {isOccupied ? (
                      <div className="mt-1.5 space-y-0.5">
                        <div className="font-black text-slate-900 font-mono text-[11px] truncate">
                          {bay.dockedBusNumber}
                        </div>
                        <div className="text-[10px] text-slate-600 truncate">
                          {bay.dockedDestinationMr}
                        </div>
                        <button
                          onClick={() => departBus(bay.bayNumber)}
                          className="mt-1 w-full py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold"
                        >
                          🚌 रवाना करा
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-800 font-medium mt-1 truncate">
                        नवीन बससाठी उपलब्ध
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last Spoken Announcement Card & Replay Button */}
          {lastAnnouncementText && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1 text-amber-900">
                  <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>स्थानक उद्घोषणा (Broadcasted Audio):</span>
                </span>
                <button
                  onClick={() => triggerVoiceAnnouncement(activeBus, activeBus.assignedPlatform || 1)}
                  disabled={isSpeaking}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[10px] flex items-center gap-1 transition-colors"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>पुन्हा ऐका</span>
                </button>
              </div>
              <p className="font-serif italic text-amber-950 text-[11px] leading-relaxed">
                "{lastAnnouncementText}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
