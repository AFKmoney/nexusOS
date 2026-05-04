import React, { useEffect, useState } from 'react';
import { useMobile } from './store/mobileStore';

import BootScreen from './components/BootScreen';
import LoginScreen from './components/LoginScreen';
import LockScreen from './components/LockScreen';
import MobileStatusBar from './components/MobileStatusBar';
import MobileNavBar from './components/MobileNavBar';
import MobileHomeScreen from './components/MobileHomeScreen';
import MobileWindowManager from './components/MobileWindowManager';
import MobileAppDrawer from './components/MobileAppDrawer';
import MobileNotificationPanel from './components/MobileNotificationPanel';
import MobileControlCenter from './components/MobileControlCenter';
import MobileRecentApps from './components/MobileRecentApps';
import MobileSearchOverlay from './components/MobileSearchOverlay';
import MobileWallpaper from './components/MobileWallpaper';

export default function App() {
  const {
    booted,
    setBooted,
    isLoggedIn,
    accentColor,
    appStack,
    activeAppId,
    isAppDrawerOpen,
    isNotificationPanelOpen,
    isControlCenterOpen,
    isRecentAppsOpen,
    isSearchOpen,
    setNotificationPanelOpen,
    setControlCenterOpen,
    setRecentAppsOpen,
  } = useMobile();

  const [locked, setLocked] = useState(false);

  // Apply accent color to CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--nx-accent', accentColor);
    const rgb = hexToRgb(accentColor);
    if (rgb) {
      document.documentElement.style.setProperty('--nx-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }, [accentColor]);

  // Boot timeout failsafe
  useEffect(() => {
    if (!booted) {
      const t = setTimeout(() => setBooted(true), 4000);
      return () => clearTimeout(t);
    }
  }, [booted, setBooted]);

  // Dismiss any overlay on physical back
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (isRecentAppsOpen) { setRecentAppsOpen(false); return; }
      if (isNotificationPanelOpen) { setNotificationPanelOpen(false); return; }
      if (isControlCenterOpen) { setControlCenterOpen(false); return; }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [isRecentAppsOpen, isNotificationPanelOpen, isControlCenterOpen]);

  // Boot screen
  if (!booted) {
    return <BootScreen onDone={() => setBooted(true)} />;
  }

  // Login
  if (!isLoggedIn) {
    return (
      <>
        <MobileWallpaper />
        <LoginScreen />
      </>
    );
  }

  // Lock screen
  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  const hasActiveApp = appStack.length > 0 && !!activeAppId;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: 'var(--nx-surface)' }}
    >
      {/* Layer 0: Wallpaper (only on home) */}
      {!hasActiveApp && <MobileWallpaper />}

      {/* Layer 1: Status Bar (always on top) */}
      <MobileStatusBar />

      {/* Layer 2: Content Area */}
      <div
        className="content-area"
        style={{
          background: hasActiveApp ? 'var(--nx-surface)' : 'transparent',
        }}
      >
        {/* Home screen (visible when no app is open) */}
        {!hasActiveApp && (
          <div className="h-full animate-fade-in">
            <MobileHomeScreen />
          </div>
        )}
      </div>

      {/* Layer 3: App Window Manager (full-screen apps) */}
      <MobileWindowManager />

      {/* Layer 4: Nav Bar */}
      <MobileNavBar />

      {/* Layer 5: Overlays */}
      <MobileAppDrawer />
      <MobileNotificationPanel />
      <MobileControlCenter />
      <MobileRecentApps />
      <MobileSearchOverlay />
    </div>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}
