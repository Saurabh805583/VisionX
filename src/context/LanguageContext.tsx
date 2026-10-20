import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'mr-IN' | 'hi-IN' | 'en-IN';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  statusT: (status: string) => string;
  sourceT: (source: string) => string;
  depotT: (depotName?: string | null) => string;
  destT: (destination?: string | null) => string;
  busTypeT: (busType?: string | null) => string;
}

const translations: Record<Language, Record<string, string>> = {
  'mr-IN': {
    // Brand & Header
    'app.title': 'Smart MSRTC',
    'app.subtitle': 'VisionX ट्रान्सपोर्ट इंजिन',
    'app.attribution': 'VisionX विकास चमू',
    'app.station': 'मल्कापूर मध्यवर्ती बस स्थानक',
    'app.stationSub': 'बुलढाणा विभाग · फलाट नियंत्रण कक्ष',
    'app.division': 'बुलढाणा विभाग (४ फलाट)',
    'app.disclaimer': 'विद्यापीठ संशोधन प्रात्यक्षिक · अधिकृत सरकारी प्रणाली नाही',
    'app.syncOk': 'समक्रमित OK',
    'app.launchSimulator': 'सिम्युलेटर उघडा',
    'app.refresh': 'ताजे करा',
    'app.backToOps': 'नियंत्रण कक्षाकडे परत',

    // Navigation
    'nav.dashboard': 'कार्यप्रणाली डॅशबोर्ड',
    'nav.mobileGps': 'मोबाईल ड्रायव्हर GPS',
    'nav.gpsRadar': 'GPS व जिओफेन्स रडार',
    'nav.iotDevices': 'IoT उपकरण ॲडॉप्टर्स',
    'nav.platforms': 'फलाट व्यवस्थापन',
    'nav.simulator': 'बस आगमन सिम्युलेटर',
    'nav.passengerDisplay': 'प्रवासी माहिती फलक (PID)',
    'nav.announcements': 'ध्वनिक्षेपक उद्घोषणा केंद्र',
    'nav.busesTrips': 'बस ताफा व फेरी नियोजन',
    'nav.routes': 'मार्ग व गंतव्य स्थाने',
    'nav.conflicts': 'संघर्ष व अलर्ट व्यवस्थापन',
    'nav.auditTrail': 'घटना इतिहास व ऑडिट नोंद',
    'nav.staffOps': 'प्रशासक व कर्मचारी कक्ष',
    'nav.settings': 'प्रणाली सेटिंग्ज व निदान',

    // Common Actions
    'action.search': 'शोधा...',
    'action.filter': 'गाळणी',
    'action.all': 'सर्व',
    'action.register': 'नोंदणी करा',
    'action.save': 'जतन करा',
    'action.cancel': 'रद्द करा',
    'action.edit': 'संपादित करा',
    'action.delete': 'हटवा',
    'action.close': 'बंद करा',
    'action.resolve': 'निवारण करा',
    'action.override': 'मॅन्युअल ओव्हरराइड',
    'action.play': 'प्ले करा',
    'action.pause': 'थांबवा',
    'action.resume': 'पुन्हा सुरू करा',
    'action.clear': 'रिकामे करा',
    'action.fullscreen': 'पूर्ण स्क्रीन',
    'action.exitFullscreen': 'स्क्रीन पूर्ववत',

    // Multi-Depot Operations
    'depot.operatingDepot': 'कार्यकारी आगार',
    'depot.homeDepot': 'नोंदणीकृत आगार',
    'depot.allDepots': 'सर्व आगारे',
    'depot.unrecorded': 'नोंदणीकृत आगार नाही',
    'depot.depotsTab': 'नोंदणीकृत आगारे',
    'depot.fleetTab': 'बस ताफा यादी',
    'depot.tripsTab': 'फेरी वेळापत्रक',
    'depot.division': 'विभाग',
    'depot.region': 'परिक्षेत्र',
    'depot.contact': 'संपर्क दूरध्वनी',
    'depot.code': 'आगार कोड',
    'depot.name': 'आगाराचे नाव',
    'depot.registerNew': 'नवीन आगार नोंदवा',
    'depot.associatedBuses': 'संबंधित बसेस',
    'depot.stationNotice': 'मल्कापूर स्थानकावर विविध आगारांच्या बसेस सेवा पुरवतात. आगार व फलाट वेगवेगळे नोंदवले जातात.',

    // Fleet & Trips
    'fleet.title': 'बस ताफा व फेरी नियोजन',
    'fleet.subtitle': 'मल्कापूर स्थानकावरून धावणाऱ्या विविध आगारांच्या बसेस व वेळापत्रक व्यवस्थापन.',
    'fleet.busNumber': 'बस नोंदणी क्रमांक',
    'fleet.busType': 'बस प्रकार / श्रेणी',
    'fleet.capacity': 'आसन क्षमता',
    'fleet.status': 'सद्यस्थिती',
    'fleet.platform': 'फलाट क्रमांक',
    'fleet.source': 'माहिती स्त्रोत',
    'fleet.notes': 'कार्यकारी नोंदी',
    'fleet.registerBus': 'नवीन बस नोंदवा',
    'fleet.tripNumber': 'फेरी क्रमांक',
    'fleet.origin': 'मूळ स्थानक',
    'fleet.destination': 'गंतव्य स्थान',
    'fleet.scheduledArrival': 'नियोजित आगमन',
    'fleet.scheduledDeparture': 'नियोजित प्रस्थान',
    'fleet.delay': 'विलंब',
    'fleet.passengerLoad': 'प्रवासी संख्या',
    'fleet.noBuses': 'कोणतीही बस नोंद आढळली नाही.',
    'fleet.noTrips': 'कोणतीही फेरी आढळली नाही.',

    // Statuses
    'status.SCHEDULED': 'नियोजित',
    'status.APPROACHING': 'स्थानकात येत आहे',
    'status.AT_PLATFORM': 'फलाटावर उभी आहे',
    'status.DEPARTED': 'रवाना झाली',
    'status.MAINTENANCE': 'देखभाल',
    'status.FREE': 'उपलब्ध',
    'status.OCCUPIED': 'व्यापलेले',

    // Sources
    'source.SIMULATED': 'सिम्युलेटेड',
    'source.PHONE_GPS': 'मोबाईल GPS',
    'source.MANUAL': 'मॅन्युअल',
    'source.IOT_DEVICE': 'IoT उपकरण',
    'source.OFFICIAL_FEED': 'अधिकृत फीड',

    // Passenger Display
    'pid.title': 'प्रवासी माहिती फलक · Malkapur Bus Stand',
    'pid.standardBoard': 'मानक वेळापत्रक फलक',
    'pid.announcementFocused': 'उद्घोषणा केंद्रित फलक',
    'pid.tripNo': 'फेरी क्र.',
    'pid.busReg': 'बस क्र. / प्रकार',
    'pid.depot': 'आगार',
    'pid.destination': 'गंतव्य स्थान (मार्ग)',
    'pid.arrival': 'आगमन',
    'pid.departure': 'प्रस्थान',
    'pid.platform': 'फलाट',
    'pid.status': 'स्थिती',
    'pid.missing': 'माहिती उपलब्ध नाही',
    'pid.importantAnnouncements': 'महत्त्वाची प्रवासी उद्घोषणा',
    'pid.noActiveAnnouncements': 'सध्या कोणतीही प्रलंबित उद्घोषणा नाही.',
    'pid.onTime': 'वेळेवर',
    'pid.delayed': 'विलंब',
    'pid.atPlatform': 'फलाटावर उभी आहे',
    'pid.approaching': 'येत आहे',
    'pid.departed': 'रवाना',

    // Dashboard Telemetry & Controls
    'dash.kpiFleet': 'एकूण नोंदणीकृत बसेस',
    'dash.kpiIncoming': 'स्थानकात येणाऱ्या बसेस',
    'dash.kpiAtPlatforms': 'फलाटावर उभ्या बसेस',
    'dash.kpiFreeBays': 'उपलब्ध मोकळे फलाट',
    'dash.kpiOccupiedBays': 'व्यापलेले फलाट',
    'dash.kpiDelayed': 'विलंबित फेऱ्या',
    'dash.kpiDeparted': 'रवाना झालेल्या बसेस',
    'dash.kpiConflicts': 'सक्रिय फलाट संघर्ष',
    'dash.kpiAnnouncements': 'प्रलंबित उद्घोषणा',
    'dash.platformBaysTitle': 'मलकापूर फलाट संचालन स्थिती (फलाट १ ते ४)',
    'dash.platformBaysSubtitle': 'थेट सेन्सर, मोबाईल GPS व स्वयंचलित वाटप इंजिनद्वारे फलाट नियंत्रण.',
    'dash.bayAvailable': 'फलाट मोकळा आहे (उपलब्ध)',
    'dash.busAssigned': 'नियुक्त बस:',
    'dash.operatingDepot': 'कार्यकारी आगार:',
    'dash.routeDest': 'मार्ग / गंतव्य:',
    'dash.departureExpected': 'प्रस्थान वेळ:',
    'dash.liveTimetable': 'मलकापूर बस स्थानक — थेट वेळापत्रक',
    'dash.liveTimetableSubtitle': 'सर्व आगारांतून येणाऱ्या व जाणाऱ्या बसेसचे रिअल-टाइम वेळापत्रक (दर ३ सेकंदांनी अद्ययावत).',
    'dash.searchPlaceholder': 'बस क्र., आगार किंवा शहर शोधा...',
    'dash.filterAll': 'सर्व फेऱ्या',
    'dash.colPlatform': 'मलकापूर फलाट क्र.',
    'dash.opsGuideButton': 'महामंडळ प्रत्यक्ष कार्यप्रणाली मार्गदर्शक (SOP)',

    // Driver Mobile GPS Telemetry
    'gps.portalTitle': 'चालक / वाहक थेट मोबाईल GPS पोर्टल',
    'gps.portalSubtitle': 'MSRTC बस ऑनबोर्ड क्रू पोर्टल · मलकापूर मध्यवर्ती बस स्थानक',
    'gps.policyTitle': 'बस प्रत्यक्ष जोडणी नियमावली',
    'gps.policyText': 'हा मोबाईल बसच्या डॅशबोर्डवर बसवलेला असतानाच लाइव्ह लोकेशन सुरू करा. बस मलकापूरच्या १.२ किमी कक्षेत येताच आपोआप फलाट दिला जाईल व स्थानकात उद्घोषणा होईल.',
    'gps.step1Bus': '१. आपली बस व फेरी निवडा',
    'gps.selectBus': 'धावणारी बस निवडा *',
    'gps.selectTrip': 'सक्रिय फेरी निवडा *',
    'gps.step2Live': '२. थेट सॅटेलाइट ट्रान्समिशन',
    'gps.startTransmit': '🔴 थेट GPS ट्रान्समिट सुरू करा',
    'gps.stopTransmit': 'थांबवा (GPS ट्रान्समिट बंद करा)',
    'gps.statusTransmitting': 'सक्रिय: रिअल-टाइम सॅटेलाइट लोकेशन महामंडळास पाठवले जात आहे',
    'gps.statusIdle': 'थांबलेले: GPS ट्रॅकिंग सध्या बंद आहे',
    'gps.speed': 'धावण्याचा वेग',
    'gps.accuracy': 'GPS अचूकता',
    'gps.distanceToStation': 'मलकापूर बस स्थानकापासून अंतर',
    'gps.geofenceState': 'जिओफेन्स स्थिती',
    'gps.packetsSent': 'पाठवलेले डेटा पॅकेट्स',
    'gps.wakeLock': 'स्क्रीन वेकलॉक: सक्रिय (मोबाईल स्क्रीन बंद होणार नाही)',
    'gps.signalExcellent': 'उत्कृष्ट सॅटेलाइट सिग्नल',
    'gps.signalGood': 'चांगला सिग्नल',
    'gps.signalLow': 'कमकुवत सिग्नल (खिडकीजवळ ठेवा)',
    'gps.insideGeofenceAlert': 'मल्कापूर स्थानक जिओफेन्स कक्षेत प्रवेश! फलाट वाटप निश्चित.',
    'gps.backgroundAppTitle': 'पर्यायी: Traccar / OsmAnd ॲपद्वारे स्क्रीन बंद असताना ट्रॅकिंग',
    'gps.backgroundAppDesc': 'मोबाईल स्क्रीन बंद ठेवून २४ तास ट्रॅकिंग करायचे असल्यास प्ले स्टोअरवरील मोफत "Traccar Client" किंवा "OsmAnd" मध्ये खालील URL टाका:',
    'gps.copyPingUrl': 'Ping URL कॉपी करा',
    'gps.urlCopied': 'URL कॉपी झाली!',

    // Voice Announcements & PA
    'ann.paStatusOn': 'ध्वनिक्षेपक: स्वयंचलित (चालू)',
    'ann.paStatusOff': 'ध्वनिक्षेपक: बंद',
    'ann.testChime': 'चाचणी घंटा व उद्घोषणा',
    'ann.voiceSettings': 'आवाज व ध्वनी सेटिंग्ज',
    'ann.stationBell': 'मलकापूर स्थानक घंटा',
    'ann.naturalTone': 'एसटी महामंडळ अधिकृत टोन',
    'ann.speedControl': 'बोलण्याचा वेग (Speed)',
    'ann.volumeControl': 'ध्वनी तीव्रता (Volume)',

    // Live Radar & Geofence Presentation
    'radar.title': 'GPS व जिओफेन्स थेट रडार',
    'radar.subtitle': 'मलकापूर बस स्थानकाकडे येणाऱ्या सर्व बसेसचे थेट सॅटेलाइट ट्रॅकिंग व स्थानक आगमन हद्द (१.२ किमी).',
    'radar.presentationMode': 'थेट महामंडळ सादरीकरण मोड (Live Demo)',
    'radar.liveMovement': '🚍 थेट बस हालचाल (Move Buses)',
    'radar.pauseMovement': '⏸ हालचाल थांबवा',
    'radar.simulateArrival': '⚡ १.२ किमी हद्दीत प्रवेश प्रात्यक्षिक',
    'radar.playAnnouncement': '🎙 स्थानक उद्घोषणा ऐकवा',
    'radar.geofenceAlert': '🚨 बस स्थानक आगमन हद्दीत दाखल (Geofence Detected)!',
    'radar.recommendedPlatform': 'सुचवलेला फलाट:',
    'radar.allocateNow': 'स्वीकारा आणि फलाट वाटप करा',
    'radar.changePlatform': 'फलाट बदला:',
    'radar.dockedSuccess': 'गाडी फलाटावर दाखल झाली व उद्घोषणा प्रसारित झाली!',
    'radar.distance': 'स्थानकापासून अंतर:',
    'radar.speed': 'गती:',
    'radar.corridor': 'कॉरिडॉर:',
    'radar.selectBusToTrack': 'कोणत्याही बस चिन्हावर क्लिक करून मार्ग व माहिती पहा.',
    'radar.geofenceRadius': 'मलकापूर आगमन हद्द (१.२ किमी)',
    'radar.approachRadius': '५ किमी ॲप्रोच रडार',
    'radar.telemetryDetails': 'बस थेट टेलिमेट्री तपशील',
    'radar.route': 'मार्ग व गंतव्य स्थान',

    // Real-World Deployment Guide (Mahamandal SOP)
    'guide.modalTitle': 'MSRTC महामंडळ प्रत्यक्ष कार्यप्रणाली मार्गदर्शक (Live Setup)',
    'guide.modalSubtitle': 'मलकापूर बस स्थानकावर परवापासून प्रत्यक्ष वापरण्यासाठी ४-सोप्या पायऱ्यांचे नियोजन.',
    'guide.step1': 'पायरी १: चालकाचा मोबाईल बसमध्ये ठेवणे (GPS Tracker)',
    'guide.step1Details': 'कोणत्याही चालकाच्या किंवा वाहकाच्या अँड्रॉइड मोबाईलमध्ये क्रोम ब्राउझर उघडून /mobile-gps ही लिंक उघडा (किंवा क्यूआर कोड स्कॅन करा). बस क्रमांक निवडा आणि "🔴 थेट GPS ट्रान्समिट सुरू करा" बटण दाबा. फोन बसच्या काचेजवळ किंवा डॅशबोर्डवर ठेवावा. स्क्रीन बंद होणार नाही अशी स्वयंचलित सोय (WakeLock) यात केली आहे.',
    'guide.step2': 'पायरी २: स्थानक नियंत्रण कक्ष (Station Controller)',
    'guide.step2Details': 'स्थानक प्रमुखांच्या किंवा नियंत्रकांच्या संगणकावर / (डॅशबोर्ड) उघडा. मलकापूरच्या १.२ किमी परिसरात बस येताच प्रणाली आपोआप रिकाम्या फलाटावर (१ ते ४) तिचे वाटप करेल. कोणत्याही मानवी हस्तक्षेपाची गरज नाही.',
    'guide.step3': 'पायरी ३: स्थानकावरील प्रवासी माहिती फलक (PID TV)',
    'guide.step3Details': 'बस स्थानकाच्या प्रतीक्षालयातील किंवा फलाटावरील टीव्हीला संगणक किंवा अँड्रॉइड बॉक्स जोडून /passenger-display ही लिंक उघडा आणि कीबोर्डवर F11 (फुल स्क्रीन) दाबा. प्रवाशांना मराठी, हिंदी व इंग्रजीत थेट फलाट क्रमांक व येणाऱ्या बसेस दिसतील.',
    'guide.step4': 'पायरी ४: स्थानकाचा ध्वनिक्षेपक (PA Loudspeakers)',
    'guide.step4Details': 'संगणकाची ऑडिओ केबल (३.५ मिमी जॅक) स्थानकाच्या ॲम्प्लिफायरला जोडा. हेडरमध्ये "PA Auto-Announce: ON" ठेवा. बस येताच आधी गोड घंटा (Chime) वाजेल आणि त्यानंतर अस्सल एसटी महामंडळाच्या आवाजात फलाट क्रमांकाची उद्घोषणा आपोआप होईल.',
  },

  'hi-IN': {
    // Brand & Header
    'app.title': 'Smart MSRTC',
    'app.subtitle': 'VisionX ट्रांजिट इंजन',
    'app.attribution': 'VisionX विकास टीम',
    'app.station': 'मलकापुर केंद्रीय बस स्टैंड',
    'app.stationSub': 'बुलढाणा मंडल · प्लेटफॉर्म नियंत्रण कक्ष',
    'app.division': 'बुलढाणा मंडल (४ प्लेटफॉर्म)',
    'app.disclaimer': 'विश्वविद्यालय शोध प्रायोगिक मॉडल · आधिकारिक सरकारी प्रणाली नहीं',
    'app.syncOk': 'सिंक OK',
    'app.launchSimulator': 'सिम्युलेटर खोलें',
    'app.refresh': 'रिफ्रेश करें',
    'app.backToOps': 'कंट्रोल रूम पर वापस',

    // Navigation
    'nav.dashboard': 'संचालन डैशबोर्ड',
    'nav.mobileGps': 'मोबाइल ड्राइवर GPS',
    'nav.gpsRadar': 'GPS एवं जियोफेंस रडार',
    'nav.iotDevices': 'IoT डिवाइस एडाप्टर्स',
    'nav.platforms': 'प्लेटफॉर्म प्रबंधन',
    'nav.simulator': 'बस आगमन सिम्युलेटर',
    'nav.passengerDisplay': 'यात्री सूचना बोर्ड (PID)',
    'nav.announcements': 'उद्घोषणा नियंत्रण केंद्र',
    'nav.busesTrips': 'बस बेड़ा एवं यात्रा प्रबंधन',
    'nav.routes': 'मार्ग एवं गंतव्य स्थल',
    'nav.conflicts': 'संघर्ष एवं अलर्ट प्रबंधन',
    'nav.auditTrail': 'ऑडिट ट्रेल एवं इतिहास',
    'nav.staffOps': 'प्रशासक एवं कर्मचारी कक्ष',
    'nav.settings': 'सिस्टम सेटिंग्स एवं निदान',

    // Common Actions
    'action.search': 'खोजें...',
    'action.filter': 'फ़िल्टर',
    'action.all': 'सभी',
    'action.register': 'पंजीकृत करें',
    'action.save': 'सहेजें',
    'action.cancel': 'रद्द करें',
    'action.edit': 'संपादित करें',
    'action.delete': 'हटाएं',
    'action.close': 'बंद करें',
    'action.resolve': 'निस्तारण करें',
    'action.override': 'मैन्युअल ओवरराइड',
    'action.play': 'प्ले करें',
    'action.pause': 'रोकें',
    'action.resume': 'पुनः चालू करें',
    'action.clear': 'खाली करें',
    'action.fullscreen': 'फुल स्क्रीन',
    'action.exitFullscreen': 'स्क्रीन से बाहर',

    // Multi-Depot Operations
    'depot.operatingDepot': 'संचालन डिपो',
    'depot.homeDepot': 'पंजीकृत डिपो',
    'depot.allDepots': 'सभी डिपो',
    'depot.unrecorded': 'दर्ज नहीं',
    'depot.depotsTab': 'पंजीकृत डिपो',
    'depot.fleetTab': 'बस बेड़ा सूची',
    'depot.tripsTab': 'यात्रा समय-सारणी',
    'depot.division': 'मंडल / संभाग',
    'depot.region': 'क्षेत्र',
    'depot.contact': 'संपर्क फोन',
    'depot.code': 'डिपो कोड',
    'depot.name': 'डिपो का नाम',
    'depot.registerNew': 'नया डिपो जोड़ें',
    'depot.associatedBuses': 'संबंधित बसें',
    'depot.stationNotice': 'मलकापुर स्टैंड पर कई अलग-अलग डिपो की बसें आती हैं। डिपो और प्लेटफॉर्म अलग-अलग दर्ज किए जाते हैं।',

    // Fleet & Trips
    'fleet.title': 'बस बेड़ा एवं यात्रा प्रबंधन',
    'fleet.subtitle': 'मलकापुर स्टैंड से संचालित विभिन्न डिपो की बसों एवं समय-सारणी का प्रबंधन।',
    'fleet.busNumber': 'बस पंजीकरण नंबर',
    'fleet.busType': 'बस प्रकार / श्रेणी',
    'fleet.capacity': 'सीटिंग क्षमता',
    'fleet.status': 'वर्तमान स्थिति',
    'fleet.platform': 'प्लेटफॉर्म नं.',
    'fleet.source': 'डेटा स्रोत',
    'fleet.notes': 'परिचालन नोट्स',
    'fleet.registerBus': 'नई बस जोड़ें',
    'fleet.tripNumber': 'यात्रा नंबर',
    'fleet.origin': 'प्रारंभिक स्थल',
    'fleet.destination': 'गंतव्य स्थल',
    'fleet.scheduledArrival': 'अनुसूचित आगमन',
    'fleet.scheduledDeparture': 'अनुसूचित प्रस्थान',
    'fleet.delay': 'विलंब',
    'fleet.passengerLoad': 'यात्री संख्या',
    'fleet.noBuses': 'कोई बस रिकॉर्ड नहीं मिला।',
    'fleet.noTrips': 'कोई यात्रा रिकॉर्ड नहीं मिला।',

    // Statuses
    'status.SCHEDULED': 'अनुसूचित',
    'status.APPROACHING': 'आ रही है',
    'status.AT_PLATFORM': 'प्लेटफॉर्म पर खड़ी है',
    'status.DEPARTED': 'रवाना हो चुकी',
    'status.MAINTENANCE': 'रखरखाव',
    'status.FREE': 'खाली',
    'status.OCCUPIED': 'व्यस्त',

    // Sources
    'source.SIMULATED': 'सिम्युलेटेड',
    'source.PHONE_GPS': 'मोबाइल GPS',
    'source.MANUAL': 'मैनुअल',
    'source.IOT_DEVICE': 'IoT डिवाइस',
    'source.OFFICIAL_FEED': 'आधिकारिक फीड',

    // Passenger Display
    'pid.title': 'यात्री सूचना बोर्ड · Malkapur Bus Stand',
    'pid.standardBoard': 'मानक समय-सारणी बोर्ड',
    'pid.announcementFocused': 'उद्घोषणा केंद्रित डिस्प्ले',
    'pid.tripNo': 'यात्रा क्र.',
    'pid.busReg': 'बस नं. / प्रकार',
    'pid.depot': 'डिपो',
    'pid.destination': 'गंतव्य स्थल (मार्ग)',
    'pid.arrival': 'आगमन',
    'pid.departure': 'प्रस्थान',
    'pid.platform': 'प्लेटफॉर्म',
    'pid.status': 'स्थिति',
    'pid.missing': 'जानकारी उपलब्ध नहीं',
    'pid.importantAnnouncements': 'महत्वपूर्ण यात्री उद्घोषणा',
    'pid.noActiveAnnouncements': 'वर्तमान में कोई सक्रिय उद्घोषणा नहीं है।',
    'pid.onTime': 'समय पर',
    'pid.delayed': 'विलंब',
    'pid.atPlatform': 'प्लेटफॉर्म पर खड़ी है',
    'pid.approaching': 'आ रही है',
    'pid.departed': 'रवाना',

    // Dashboard Telemetry & Controls
    'dash.kpiFleet': 'कुल पंजीकृत बसें',
    'dash.kpiIncoming': 'आगमन की ओर बसें',
    'dash.kpiAtPlatforms': 'प्लेटफॉर्म पर उपस्थित बसें',
    'dash.kpiFreeBays': 'उपलब्ध खाली प्लेटफॉर्म',
    'dash.kpiOccupiedBays': 'व्यस्त प्लेटफॉर्म',
    'dash.kpiDelayed': 'विलंबित सेवाएं',
    'dash.kpiDeparted': 'रवाना हो चुकी बसें',
    'dash.kpiConflicts': 'प्लेटफॉर्म संघर्ष अलर्ट',
    'dash.kpiAnnouncements': 'लंबित उद्घोषणाएं',
    'dash.platformBaysTitle': 'मलकापुर प्लेटफॉर्म संचालन स्थिति (प्लेटफॉर्म १ से ४)',
    'dash.platformBaysSubtitle': 'लाइव सेंसर, मोबाइल GPS एवं स्वचालित आवंटन इंजन द्वारा प्लेटफॉर्म नियंत्रण।',
    'dash.bayAvailable': 'प्लेटफॉर्म खाली है (उपलब्ध)',
    'dash.busAssigned': 'आवंटित बस:',
    'dash.operatingDepot': 'संचालन डिपो:',
    'dash.routeDest': 'मार्ग / गंतव्य:',
    'dash.departureExpected': 'प्रस्थान समय:',
    'dash.liveTimetable': 'मलकापुर बस स्टैंड — लाइव समय-सारणी',
    'dash.liveTimetableSubtitle': 'सभी डिपो से आने-जाने वाली बसों की वास्तविक समय-सारणी (प्रत्येक ३ सेकंड में अपडेट)।',
    'dash.searchPlaceholder': 'बस नं., डिपो या शहर खोजें...',
    'dash.filterAll': 'सभी सेवाएं',
    'dash.colPlatform': 'मलकापुर प्लेटफॉर्म नं.',
    'dash.opsGuideButton': 'महामंडल वास्तविक संचालन मार्गदर्शिका (SOP)',

    // Driver Mobile GPS Telemetry
    'gps.portalTitle': 'चालक / परिचालक मोबाइल GPS पोर्टल',
    'gps.portalSubtitle': 'MSRTC बस ऑनबोर्ड क्रू पोर्टल · मलकापुर केंद्रीय बस स्टैंड',
    'gps.policyTitle': 'बस प्रत्यक्ष जुड़ाव नियमावली',
    'gps.policyText': 'यह फोन बस के डैशबोर्ड पर लगा होने पर ही लाइव लोकेशन शुरू करें। बस मलकापुर के १.२ किमी दायरे में आते ही प्लेटफॉर्म स्वतः आवंटित हो जाएगा।',
    'gps.step1Bus': '१. अपनी बस एवं यात्रा चुनें',
    'gps.selectBus': 'संचालित बस चुनें *',
    'gps.selectTrip': 'सक्रिय यात्रा चुनें *',
    'gps.step2Live': '२. लाइव सेटेलाइट ट्रांसमिशन',
    'gps.startTransmit': '🔴 लाइव GPS ट्रांसमिट शुरू करें',
    'gps.stopTransmit': 'रोकें (GPS ट्रांसमिशन बंद करें)',
    'gps.statusTransmitting': 'सक्रिय: रियल-टाइम सैटेलाइट लोकेशन महामंडल को भेजी जा रही है',
    'gps.statusIdle': 'निष्क्रिय: GPS ट्रैकिंग वर्तमान में बंद है',
    'gps.speed': 'गति (Speed)',
    'gps.accuracy': 'GPS सटीकता',
    'gps.distanceToStation': 'मलकापुर बस स्टैंड से दूरी',
    'gps.geofenceState': 'जियोफेंस स्थिति',
    'gps.packetsSent': 'प्रेषित डेटा पैकेट्स',
    'gps.wakeLock': 'स्क्रीन वेकलॉक: सक्रिय (मोबाइल स्क्रीन बंद नहीं होगी)',
    'gps.signalExcellent': 'उत्कृष्ट सैटेलाइट सिग्नल',
    'gps.signalGood': 'अच्छा सिग्नल',
    'gps.signalLow': 'कमजोर सिग्नल (खिड़की के पास रखें)',
    'gps.insideGeofenceAlert': 'मलकापुर स्टैंड जियोफेंस में प्रवेश! प्लेटफॉर्म आवंटन स्वीकृत।',
    'gps.backgroundAppTitle': 'वैकल्पिक: Traccar / OsmAnd ऐप द्वारा स्क्रीन बंद होने पर ट्रैकिंग',
    'gps.backgroundAppDesc': 'स्क्रीन बंद रखकर २४ घंटे बैकग्राउंड में लोकेशन भेजने के लिए Traccar Client या OsmAnd में निम्न URL दर्ज करें:',
    'gps.copyPingUrl': 'Ping URL कॉपी करें',
    'gps.urlCopied': 'URL कॉपी हो गई!',

    // Voice Announcements & PA
    'ann.paStatusOn': 'ध्वनि उद्घोषणा: स्वचालित (चालू)',
    'ann.paStatusOff': 'ध्वनि उद्घोषणा: बंद',
    'ann.testChime': 'परीक्षण घंटी एवं उद्घोषणा',
    'ann.voiceSettings': 'ध्वनि एवं आवाज सेटिंग्स',
    'ann.stationBell': 'मलकापुर स्टेशन घंटी',
    'ann.naturalTone': 'एसटी महामंडल आधिकारिक टोन',
    'ann.speedControl': 'बोलने की गति (Speed)',
    'ann.volumeControl': 'ध्वनि तीव्रता (Volume)',

    // Live Radar & Geofence Presentation
    'radar.title': 'GPS एवं जियोफेंस लाइव रडार',
    'radar.subtitle': 'मलकापुर बस स्टैंड की ओर आ रही सभी बसों की लाइव सैटेलाइट ट्रैकिंग एवं स्टेशन आगमन सीमा (१.२ किमी)।',
    'radar.presentationMode': 'लाइव महामंडल प्रस्तुति मोड (Live Demo)',
    'radar.liveMovement': '🚍 लाइव बस आवाजाही (Move Buses)',
    'radar.pauseMovement': '⏸ आवाजाही रोकें',
    'radar.simulateArrival': '⚡ १.२ किमी दायरे में आगमन प्रदर्शन',
    'radar.playAnnouncement': '🎙 स्टेशन उद्घोषणा सुनाएं',
    'radar.geofenceAlert': '🚨 बस स्टेशन आगमन सीमा में प्रविष्ट (Geofence Detected)!',
    'radar.recommendedPlatform': 'सुझाया गया प्लेटफॉर्म:',
    'radar.allocateNow': 'स्वीकार करें और प्लेटफॉर्म आवंटित करें',
    'radar.changePlatform': 'प्लेटफॉर्म बदलें:',
    'radar.dockedSuccess': 'बस प्लेटफॉर्म पर लग चुकी है और उद्घोषणा प्रसारित हुई!',
    'radar.distance': 'स्टेशन से दूरी:',
    'radar.speed': 'गति:',
    'radar.corridor': 'कॉरिडोर:',
    'radar.selectBusToTrack': 'किसी भी बस आइकन पर क्लिक करके मार्ग एवं विवरण देखें।',
    'radar.geofenceRadius': 'मलकापुर आगमन सीमा (१.२ किमी)',
    'radar.approachRadius': '५ किमी अप्रोच रडार',
    'radar.telemetryDetails': 'बस लाइव टेलीमेट्री विवरण',
    'radar.route': 'मार्ग एवं गंतव्य स्थल',

    // Real-World Deployment Guide (Mahamandal SOP)
    'guide.modalTitle': 'MSRTC महामंडल वास्तविक संचालन गाइड (Live SOP)',
    'guide.modalSubtitle': 'मलकापुर बस स्टैंड पर वास्तविक संचालन हेतु ४ आसान चरण।',
    'guide.step1': 'चरण १: चालक का मोबाइल बस में लगाना (GPS Tracker)',
    'guide.step1Details': 'चालक या परिचालक के एंड्रॉइड फोन में /mobile-gps खोलें (या क्यूआर कोड स्कैन करें)। बस नंबर चुनें और "🔴 लाइव GPS ट्रांसमिट शुरू करें" दबाएं। फोन को डैशबोर्ड पर फिक्स करें। स्क्रीन बंद नहीं होगी।',
    'guide.step2': 'चरण २: स्टेशन नियंत्रण कक्ष (Station Controller)',
    'guide.step2Details': 'स्टेशन मास्टर या नियंत्रक के कंप्यूटर पर / (डैशबोर्ड) खोलें। बस मलकापुर के १.२ किमी दायरे में आते ही सिस्टम खाली प्लेटफॉर्म (१-४) स्वतः आवंटित कर देगा।',
    'guide.step3': 'चरण ३: स्टेशन यात्री सूचना बोर्ड (PID TV)',
    'guide.step3Details': 'बस स्टैंड के टीवी पर /passenger-display खोलकर F11 दबाएं। यात्रियों को मराठी, हिंदी और अंग्रेजी में आगमन और प्लेटफॉर्म नंबर दिखेगा।',
    'guide.step4': 'चरण ४: स्टेशन लाउडस्पीकर (PA Loudspeakers)',
    'guide.step4Details': 'कंप्यूटर का 3.5mm ऑडियो जैक स्टेशन के एम्पलीफायर में लगाएं और "PA Auto-Announce: ON" रखें। बस आते ही घंटी बजेगी और आधिकारिक उद्घोषणा स्वतः होगी।',
  },

  'en-IN': {
    // Brand & Header
    'app.title': 'Smart MSRTC',
    'app.subtitle': 'VisionX Transit Engine',
    'app.attribution': 'VisionX Development Team',
    'app.station': 'Malkapur Central Bus Stand',
    'app.stationSub': 'Buldhana Division · Platform Control Room',
    'app.division': 'Buldhana Division (4 Platforms)',
    'app.disclaimer': 'University Research Prototype · Not Official Gov Deployment',
    'app.syncOk': 'SYNC OK',
    'app.launchSimulator': 'Launch Simulator',
    'app.refresh': 'Refresh',
    'app.backToOps': 'Back to Operations',

    // Navigation
    'nav.dashboard': 'Operations Dashboard',
    'nav.mobileGps': 'Mobile Driver GPS',
    'nav.gpsRadar': 'GPS & Geofence Radar',
    'nav.iotDevices': 'IoT Device Adapters',
    'nav.platforms': 'Platform Management',
    'nav.simulator': 'Bus Arrival Simulator',
    'nav.passengerDisplay': 'Passenger Display (PID)',
    'nav.announcements': 'Announcement Control',
    'nav.busesTrips': 'Bus & Trip Management',
    'nav.routes': 'Route & Destinations',
    'nav.conflicts': 'Conflict & Alert Management',
    'nav.auditTrail': 'Event History & Audit Trail',
    'nav.staffOps': 'Admin & Staff Operations',
    'nav.settings': 'Settings & Diagnostics',

    // Common Actions
    'action.search': 'Search...',
    'action.filter': 'Filter',
    'action.all': 'All',
    'action.register': 'Register',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.close': 'Close',
    'action.resolve': 'Resolve',
    'action.override': 'Manual Override',
    'action.play': 'Play',
    'action.pause': 'Pause',
    'action.resume': 'Resume',
    'action.clear': 'Clear',
    'action.fullscreen': 'Full Screen',
    'action.exitFullscreen': 'Exit Fullscreen',

    // Multi-Depot Operations
    'depot.operatingDepot': 'Operating Depot',
    'depot.homeDepot': 'Home Depot',
    'depot.allDepots': 'All Depots',
    'depot.unrecorded': 'Depot not recorded',
    'depot.depotsTab': 'Registered Depots',
    'depot.fleetTab': 'Fleet Inventory',
    'depot.tripsTab': 'Trip Schedules',
    'depot.division': 'Division',
    'depot.region': 'Region',
    'depot.contact': 'Contact Phone',
    'depot.code': 'Depot Code',
    'depot.name': 'Depot Name',
    'depot.registerNew': 'Register Depot',
    'depot.associatedBuses': 'Associated Buses',
    'depot.stationNotice': 'Malkapur Station services buses originating from multiple operating depots. Operating Depot and Platform Bay are recorded distinctly.',

    // Fleet & Trips
    'fleet.title': 'Bus Fleet & Trip Scheduling',
    'fleet.subtitle': 'Fleet inventory across multiple MSRTC operating depots and scheduled daily services at Malkapur.',
    'fleet.busNumber': 'Registration Number',
    'fleet.busType': 'Class / Bus Type',
    'fleet.capacity': 'Seating Capacity',
    'fleet.status': 'Current Status',
    'fleet.platform': 'Platform Bay',
    'fleet.source': 'Data Source',
    'fleet.notes': 'Operational Notes',
    'fleet.registerBus': 'Register Bus',
    'fleet.tripNumber': 'Trip Number',
    'fleet.origin': 'Origin',
    'fleet.destination': 'Destination',
    'fleet.scheduledArrival': 'Sch. Arrival',
    'fleet.scheduledDeparture': 'Sch. Departure',
    'fleet.delay': 'Delay',
    'fleet.passengerLoad': 'Passengers',
    'fleet.noBuses': 'No fleet records found.',
    'fleet.noTrips': 'No scheduled trips found.',

    // Statuses
    'status.SCHEDULED': 'Scheduled',
    'status.APPROACHING': 'Approaching',
    'status.AT_PLATFORM': 'At Platform',
    'status.DEPARTED': 'Departed',
    'status.MAINTENANCE': 'Maintenance',
    'status.FREE': 'Available',
    'status.OCCUPIED': 'Occupied',

    // Sources
    'source.SIMULATED': 'Simulated',
    'source.PHONE_GPS': 'Phone GPS',
    'source.MANUAL': 'Manual',
    'source.IOT_DEVICE': 'IoT Device',
    'source.OFFICIAL_FEED': 'Official Feed',

    // Passenger Display
    'pid.title': 'Public Passenger Display · Malkapur Bus Stand',
    'pid.standardBoard': 'Standard Board Mode',
    'pid.announcementFocused': 'Announcement-Focused Mode',
    'pid.tripNo': 'Trip No.',
    'pid.busReg': 'Bus Reg / Class',
    'pid.depot': 'Depot',
    'pid.destination': 'Destination (Route)',
    'pid.arrival': 'Sch. Arrival',
    'pid.departure': 'Sch. Departure',
    'pid.platform': 'Platform',
    'pid.status': 'Status',
    'pid.missing': 'Information Unavailable',
    'pid.importantAnnouncements': 'Important Passenger Announcement',
    'pid.noActiveAnnouncements': 'No active announcements in queue.',
    'pid.onTime': 'On Time',
    'pid.delayed': 'Delayed',
    'pid.atPlatform': 'At Platform',
    'pid.approaching': 'Approaching',
    'pid.departed': 'Departed',

    // Dashboard Telemetry & Controls
    'dash.kpiFleet': 'Registered Fleet',
    'dash.kpiIncoming': 'Incoming to Station',
    'dash.kpiAtPlatforms': 'Docked at Platforms',
    'dash.kpiFreeBays': 'Available Platform Bays',
    'dash.kpiOccupiedBays': 'Occupied Bays',
    'dash.kpiDelayed': 'Delayed Trips',
    'dash.kpiDeparted': 'Departed Trips',
    'dash.kpiConflicts': 'Platform Conflicts',
    'dash.kpiAnnouncements': 'Queued Announcements',
    'dash.platformBaysTitle': 'Malkapur Platform Operations (Bays 1-4)',
    'dash.platformBaysSubtitle': 'Coordinated via live sensor telemetry, driver GPS & automatic rule engine.',
    'dash.bayAvailable': 'Platform Bay Available',
    'dash.busAssigned': 'Bus Assigned:',
    'dash.operatingDepot': 'Operating Depot:',
    'dash.routeDest': 'Route / Destination:',
    'dash.departureExpected': 'Expected Departure:',
    'dash.liveTimetable': 'Live Station Timetable — Malkapur Terminal',
    'dash.liveTimetableSubtitle': 'Multi-depot arrivals and departures verified against persistent SQLite records (polled every 3s).',
    'dash.searchPlaceholder': 'Search bus, depot, or city...',
    'dash.filterAll': 'All Trips',
    'dash.colPlatform': 'Malkapur Platform Bay',
    'dash.opsGuideButton': 'Mahamandal Deployment & Operations SOP',

    // Driver Mobile GPS Telemetry
    'gps.portalTitle': 'Driver / Crew Mobile GPS Portal',
    'gps.portalSubtitle': 'MSRTC Onboard Crew Portal · Malkapur Central Bus Stand',
    'gps.policyTitle': 'Physical Bus Association Policy',
    'gps.policyText': 'Transmit location only when device is physically mounted on active bus dashboard. Once bus enters within 1.2km of Malkapur, platform bay will allocate automatically.',
    'gps.step1Bus': '1. Select Operating Bus & Trip',
    'gps.selectBus': 'Select Operating Bus *',
    'gps.selectTrip': 'Select Active Trip *',
    'gps.step2Live': '2. Live Satellite Telemetry',
    'gps.startTransmit': '🔴 Start Live GPS Transmit',
    'gps.stopTransmit': 'Stop GPS Transmission',
    'gps.statusTransmitting': 'Active: Transmitting real-time GPS telemetry to station control room',
    'gps.statusIdle': 'Idle: GPS transmission is stopped',
    'gps.speed': 'Current Speed',
    'gps.accuracy': 'GPS Accuracy',
    'gps.distanceToStation': 'Distance to Malkapur Bus Stand',
    'gps.geofenceState': 'Geofence Status',
    'gps.packetsSent': 'Telemetry Packets Sent',
    'gps.wakeLock': 'Screen WakeLock: Active (Device will not sleep while driving)',
    'gps.signalExcellent': 'Excellent Satellite Lock',
    'gps.signalGood': 'Good Satellite Signal',
    'gps.signalLow': 'Low GPS Signal (keep near windshield)',
    'gps.insideGeofenceAlert': 'Malkapur Geofence Entered! Platform bay assigned.',
    'gps.backgroundAppTitle': 'Alternative: 24/7 Background Tracking via Traccar / OsmAnd App',
    'gps.backgroundAppDesc': 'To send live coordinates 24/7 with phone screen locked, install free Traccar Client or OsmAnd from Play Store and set this Server URL:',
    'gps.copyPingUrl': 'Copy Ping URL',
    'gps.urlCopied': 'URL Copied!',

    // Voice Announcements & PA
    'ann.paStatusOn': 'PA Auto-Announce: ON',
    'ann.paStatusOff': 'PA Auto-Announce: OFF',
    'ann.testChime': 'Test Chime & Voice',
    'ann.voiceSettings': 'PA Voice & Audio Settings',
    'ann.stationBell': 'Malkapur Station Chime',
    'ann.naturalTone': 'Authentic MSRTC Transport Cadence',
    'ann.speedControl': 'Speech Speed Rate',
    'ann.volumeControl': 'Master PA Volume',

    // Live Radar & Geofence Presentation
    'radar.title': 'GPS & Geofence Live Radar',
    'radar.subtitle': 'Real-time satellite positioning and station arrival boundary monitoring (1.2 km radius) for all buses inbound to Malkapur.',
    'radar.presentationMode': 'Mahamandal Live Presentation Mode (Demo)',
    'radar.liveMovement': '🚍 Move Live Buses',
    'radar.pauseMovement': '⏸ Pause Movement',
    'radar.simulateArrival': '⚡ Simulate 1.2km Inflow',
    'radar.playAnnouncement': '🎙 Test Station Announcement',
    'radar.geofenceAlert': '🚨 Bus Entered Station Arrival Geofence (1.2 km)!',
    'radar.recommendedPlatform': 'Recommended Platform Bay:',
    'radar.allocateNow': 'Accept & Allocate Platform',
    'radar.changePlatform': 'Change Platform:',
    'radar.dockedSuccess': 'Bus docked at platform bay and PA announcement broadcast!',
    'radar.distance': 'Distance to Station:',
    'radar.speed': 'Speed:',
    'radar.corridor': 'Corridor:',
    'radar.selectBusToTrack': 'Click any bus marker to view live telemetry and route corridor.',
    'radar.geofenceRadius': 'Malkapur Arrival Geofence (1.2 km)',
    'radar.approachRadius': '5 km Approach Radar',
    'radar.telemetryDetails': 'Bus Live Telemetry Details',
    'radar.route': 'Route & Destination',

    // Real-World Deployment Guide (Mahamandal SOP)
    'guide.modalTitle': 'MSRTC Real-World Deployment & Operations Guide',
    'guide.modalSubtitle': '4-step practical standard operating procedure for Malkapur Central Bus Stand starting this week.',
    'guide.step1': 'Step 1: Mount Driver Phone on Bus (GPS Tracker)',
    'guide.step1Details': 'Open /mobile-gps in Chrome on driver/conductor Android phone (or scan QR code). Select bus plate (e.g. MH-28-BL-4521) and press "🔴 Start Live GPS Transmit". Mount on windshield mount. Screen WakeLock keeps transmission active automatically.',
    'guide.step2': 'Step 2: Station Control Room (Station Master PC)',
    'guide.step2Details': 'Open / (Dashboard) on station master computer. When any bus enters within 1.2km of Malkapur, the deterministic rule engine automatically allocates an available platform bay (1-4). Zero manual dispatch needed.',
    'guide.step3': 'Step 3: Passenger Information Display (PID TV)',
    'guide.step3Details': 'Connect HDMI TV on bus stand wall to any PC or Android box, open /passenger-display, and press F11 for full-screen. Passengers see live platform numbers, routes, and arrival times in Marathi, Hindi, and English.',
    'guide.step4': 'Step 4: Public Address System (PA Loudspeakers)',
    'guide.step4Details': 'Connect 3.5mm audio cable from station PC to amplifier. Toggle "PA Auto-Announce: ON". When a bus arrives, a realistic 4-tone station chime sounds, followed by an authentic MSRTC Devanagari voice announcement announcing the platform.',
  },
};

const DESTINATION_TRANSLATIONS: Record<Language, Record<string, string>> = {
  'mr-IN': {
    'Nagpur': 'नागपूर',
    'Pune': 'पुणे',
    'Akola': 'अकोला',
    'Buldhana': 'बुलढाणा',
    'Amravati': 'अमरावती',
    'Chhatrapati Sambhajinagar': 'छत्रपती संभाजीनगर',
    'Aurangabad': 'छत्रपती संभाजीनगर',
    'Nashik': 'नाशिक',
    'Jalgaon': 'जळगाव',
    'Khamgaon': 'खामगाव',
    'Malkapur': 'मलकापूर',
    'Mumbai': 'मुंबई',
    'Solapur': 'सोलापूर',
    'Nanded': 'नांदेड',
    'Dhule': 'धुळे',
    'Kolhapur': 'कोल्हापूर',
    'Shegaon': 'शेगाव',
    'Wardha': 'वर्धा',
    'Yavatmal': 'यवतमाळ',
  },
  'hi-IN': {
    'Nagpur': 'नागपुर',
    'Pune': 'पुणे',
    'Akola': 'अकोला',
    'Buldhana': 'बुलढाणा',
    'Amravati': 'अमरावती',
    'Chhatrapati Sambhajinagar': 'छत्रपति संभाजीनगर',
    'Aurangabad': 'छत्रपति संभाजीनगर',
    'Nashik': 'नासिक',
    'Jalgaon': 'जलगांव',
    'Khamgaon': 'खामगांव',
    'Malkapur': 'मलकापुर',
    'Mumbai': 'मुंबई',
    'Solapur': 'सोलापुर',
    'Nanded': 'नांदेड़',
    'Dhule': 'धुले',
    'Kolhapur': 'कोल्हापुर',
    'Shegaon': 'शेगांव',
    'Wardha': 'वर्धा',
    'Yavatmal': 'यवतमाल',
  },
  'en-IN': {
    'Nagpur': 'Nagpur',
    'Pune': 'Pune',
    'Akola': 'Akola',
    'Buldhana': 'Buldhana',
    'Amravati': 'Amravati',
    'Chhatrapati Sambhajinagar': 'Chhatrapati Sambhajinagar',
    'Aurangabad': 'Chhatrapati Sambhajinagar',
    'Nashik': 'Nashik',
    'Jalgaon': 'Jalgaon',
    'Khamgaon': 'Khamgaon',
    'Malkapur': 'Malkapur',
    'Mumbai': 'Mumbai',
    'Solapur': 'Solapur',
    'Nanded': 'Nanded',
    'Dhule': 'Dhule',
    'Kolhapur': 'Kolhapur',
    'Shegaon': 'Shegaon',
    'Wardha': 'Wardha',
    'Yavatmal': 'Yavatmal',
  },
};

const DEPOT_TRANSLATIONS: Record<Language, Record<string, string>> = {
  'mr-IN': {
    'Malkapur': 'मलकापूर आगार',
    'Malkapur Depot': 'मलकापूर आगार',
    'Nagpur Central': 'नागपूर मध्यवर्ती आगार',
    'Nagpur': 'नागपूर आगार',
    'Akola': 'अकोला आगार',
    'Akola Depot': 'अकोला आगार',
    'Buldhana': 'बुलढाणा आगार',
    'Buldhana Depot': 'बुलढाणा आगार',
    'Pune Swargate': 'पुणे स्वारगेट आगार',
    'Pune': 'पुणे आगार',
    'Amravati': 'अमरावती आगार',
    'Amravati Depot': 'अमरावती आगार',
    'Chhatrapati Sambhajinagar': 'छत्रपती संभाजीनगर आगार',
    'Jalgaon': 'जळगाव आगार',
    'Khamgaon': 'खामगाव आगार',
  },
  'hi-IN': {
    'Malkapur': 'मलकापुर डिपो',
    'Malkapur Depot': 'मलकापुर डिपो',
    'Nagpur Central': 'नागपुर सेंट्रल डिपो',
    'Nagpur': 'नागपुर डिपो',
    'Akola': 'अकोला डिपो',
    'Akola Depot': 'अकोला डिपो',
    'Buldhana': 'बुलढाणा डिपो',
    'Buldhana Depot': 'बुलढाणा डिपो',
    'Pune Swargate': 'पुणे स्वारगेट डिपो',
    'Pune': 'पुणे डिपो',
    'Amravati': 'अमरावती डिपो',
    'Amravati Depot': 'अमरावती डिपो',
    'Chhatrapati Sambhajinagar': 'छत्रपति संभाजीनगर डिपो',
    'Jalgaon': 'जलगांव डिपो',
    'Khamgaon': 'खामगांव डिपो',
  },
  'en-IN': {
    'Malkapur': 'Malkapur Depot',
    'Malkapur Depot': 'Malkapur Depot',
    'Nagpur Central': 'Nagpur Central Depot',
    'Nagpur': 'Nagpur Depot',
    'Akola': 'Akola Depot',
    'Akola Depot': 'Akola Depot',
    'Buldhana': 'Buldhana Depot',
    'Buldhana Depot': 'Buldhana Depot',
    'Pune Swargate': 'Pune Swargate Depot',
    'Pune': 'Pune Depot',
    'Amravati': 'Amravati Depot',
    'Amravati Depot': 'Amravati Depot',
    'Chhatrapati Sambhajinagar': 'Chhatrapati Sambhajinagar Depot',
    'Jalgaon': 'Jalgaon Depot',
    'Khamgaon': 'Khamgaon Depot',
  },
};

const BUS_TYPE_TRANSLATIONS: Record<Language, Record<string, string>> = {
  'mr-IN': {
    'Express': 'एक्सप्रेस (जलद)',
    'Ordinary': 'परिवर्तन (साधी)',
    'Parivartan': 'परिवर्तन (साधी)',
    'Shivshahi': 'शिवशाही (वातानुकूलित)',
    'Hirkani': 'हिरकणी (निमआराम)',
    'E-Shivneri': 'शिवनेरी (इलेक्ट्रिक)',
    'Shivneri': 'शिवनेरी (व्होल्व्हो AC)',
  },
  'hi-IN': {
    'Express': 'एक्सप्रेस (द्रुतगामी)',
    'Ordinary': 'परिवर्तन (साधारण)',
    'Parivartan': 'परिवर्तन (साधारण)',
    'Shivshahi': 'शिवशाही (AC)',
    'Hirkani': 'हिरकणी (सेमी-डीलक्स)',
    'E-Shivneri': 'शिवनेरी (इलेक्ट्रिक)',
    'Shivneri': 'शिवनेरी (वोल्वो AC)',
  },
  'en-IN': {
    'Express': 'Express',
    'Ordinary': 'Ordinary',
    'Parivartan': 'Parivartan (Ordinary)',
    'Shivshahi': 'Shivshahi (AC)',
    'Hirkani': 'Hirkani (Semi-Deluxe)',
    'E-Shivneri': 'E-Shivneri (Electric)',
    'Shivneri': 'Shivneri (Volvo AC)',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'mr-IN',
  setLanguage: () => {},
  t: (key) => key,
  statusT: (status) => status,
  sourceT: (source) => source,
  depotT: (depot) => depot || 'Depot not recorded',
  destT: (dest) => dest || '',
  busTypeT: (type) => type || '',
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('smart_msrtc_lang');
    if (saved === 'mr-IN' || saved === 'hi-IN' || saved === 'en-IN') {
      return saved;
    }
    return 'mr-IN';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('smart_msrtc_lang', lang);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[language] || translations['mr-IN'];
    if (dict[key]) {
      return dict[key];
    }
    if (translations['en-IN'][key]) {
      return translations['en-IN'][key];
    }
    return fallback || key;
  };

  const statusT = (status: string): string => {
    const key = `status.${status}`;
    return t(key, status);
  };

  const sourceT = (source: string): string => {
    const key = `source.${source}`;
    return t(key, source);
  };

  const depotT = (depotName?: string | null): string => {
    if (!depotName || depotName === 'Depot not recorded' || depotName === 'UNRECORDED') {
      return t('depot.unrecorded', 'Depot not recorded');
    }
    const map = DEPOT_TRANSLATIONS[language] || DEPOT_TRANSLATIONS['mr-IN'];
    return map[depotName] || depotName;
  };

  const destT = (destination?: string | null): string => {
    if (!destination) return '';
    const map = DESTINATION_TRANSLATIONS[language] || DESTINATION_TRANSLATIONS['mr-IN'];
    return map[destination] || destination;
  };

  const busTypeT = (busType?: string | null): string => {
    if (!busType) return '';
    const map = BUS_TYPE_TRANSLATIONS[language] || BUS_TYPE_TRANSLATIONS['mr-IN'];
    return map[busType] || busType;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, statusT, sourceT, depotT, destT, busTypeT }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
