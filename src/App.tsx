/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { BusTripManagementPage } from './pages/BusTripManagementPage';
import { RouteManagementPage } from './pages/RouteManagementPage';
import { PlatformCoordinationPage } from './pages/PlatformCoordinationPage';
import { GpsTrackingPage } from './pages/GpsTrackingPage';
import { MobileGpsPage } from './pages/MobileGpsPage';
import { IotDevicesPage } from './pages/IotDevicesPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { PassengerDisplayPage } from './pages/PassengerDisplayPage';
import { AnnouncementCenterPage } from './pages/AnnouncementCenterPage';
import { ConflictAlertPage } from './pages/ConflictAlertPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { StaffOperationsPage } from './pages/StaffOperationsPage';
import { SettingsHealthPage } from './pages/SettingsHealthPage';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { api } from './services/api';

function AppLayout() {
  const location = useLocation();
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [conflictCount, setConflictCount] = useState<number>(0);
  const [autoAnnounceEnabled, setAutoAnnounceEnabled] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const isPassengerDisplay = location.pathname === '/passenger-display';

  const fetchGlobalStatus = async () => {
    try {
      setIsRefreshing(true);
      const conflicts = await api.getConflicts();
      const unresolved = conflicts.filter((c) => !c.is_resolved).length;
      setConflictCount(unresolved);
      setLastUpdated(new Date().toISOString());
    } catch {
      // quiet fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGlobalStatus();
    const interval = setInterval(fetchGlobalStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // If on passenger display, render standalone full-screen presentation layout
  if (isPassengerDisplay) {
    return <PassengerDisplayPage />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Desktop / Tablet Navigation Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          conflictCount={conflictCount}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full bg-slate-900 shadow-2xl">
            <Sidebar conflictCount={conflictCount} onItemClick={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header Contract */}
        <Header
          lastUpdated={lastUpdated}
          onRefresh={fetchGlobalStatus}
          isRefreshing={isRefreshing}
          autoAnnounceEnabled={autoAnnounceEnabled}
          onAutoAnnounceToggle={setAutoAnnounceEnabled}
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/mobile-gps" element={<MobileGpsPage />} />
              <Route path="/iot-devices" element={<IotDevicesPage />} />
              <Route path="/buses-trips" element={<BusTripManagementPage />} />
              <Route path="/routes" element={<RouteManagementPage />} />
              <Route path="/platforms" element={<PlatformCoordinationPage />} />
              <Route path="/gps-tracking" element={<GpsTrackingPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/announcements" element={<AnnouncementCenterPage />} />
              <Route path="/conflicts" element={<ConflictAlertPage />} />
              <Route path="/audit-trail" element={<AuditTrailPage />} />
              <Route path="/staff-operations" element={<StaffOperationsPage />} />
              <Route path="/settings" element={<SettingsHealthPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </LanguageProvider>
  );
}
