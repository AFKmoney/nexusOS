import React, { useEffect, useRef } from 'react';
import { useMobile } from '../store/mobileStore';
import { MOBILE_APPS } from '../appRegistry';

export default function MobileWindowManager() {
  const { appStack, activeAppId, goBack } = useMobile();

  if (appStack.length === 0) return null;

  return (
    <div className="fixed inset-0 z-40">
      {appStack.map((openApp, idx) => {
        const isActive = openApp.id === activeAppId;
        const app = MOBILE_APPS.find(a => a.id === openApp.appId);

        return (
          <AppScreen
            key={openApp.id}
            openApp={openApp}
            app={app}
            isActive={isActive}
            onBack={goBack}
          />
        );
      })}
    </div>
  );
}

function AppScreen({
  openApp,
  app,
  isActive,
  onBack,
}: {
  openApp: { id: string; appId: string; title: string };
  app: ReturnType<typeof MOBILE_APPS.find>;
  isActive: boolean;
  onBack: () => void;
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Edge swipe-back gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
    touchStartY.current = e.touches[0]!.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0]!.clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0]!.clientY - touchStartY.current);
    if (touchStartX.current < 24 && dx > 60 && dy < 80) {
      onBack();
    }
  };

  if (!app) {
    return isActive ? (
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'var(--nx-surface)' }}>
        <p className="text-white/40">App not found: {openApp.appId}</p>
      </div>
    ) : null;
  }

  const Component = app.component;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex flex-col"
      style={{
        background: 'var(--nx-surface)',
        display: isActive ? 'flex' : 'none',
        paddingTop: 'var(--status-bar-height)',
        paddingBottom: 'var(--nav-bar-height)',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Component onBack={onBack} appId={openApp.appId} />
    </div>
  );
}
