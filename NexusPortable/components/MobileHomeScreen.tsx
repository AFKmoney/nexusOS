import React, { useRef, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { MOBILE_APPS } from '../appRegistry';

function TimeDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center pt-6 pb-4 select-none">
      <div className="text-white text-6xl font-thin tracking-tight">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-white/60 text-sm mt-1">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}

function AppIcon({ appId, onOpen }: { appId: string; onOpen: (id: string) => void }) {
  const app = MOBILE_APPS.find(a => a.id === appId);
  if (!app) return null;
  const Icon = app.icon;

  return (
    <div className="app-icon" onClick={() => onOpen(appId)}>
      <div className="icon-bg" style={{ background: app.iconBg }}>
        <Icon size={28} className="text-white" strokeWidth={1.8} />
      </div>
      <span className="icon-label">{app.name}</span>
    </div>
  );
}

function PageDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-5 h-1.5 bg-white'
              : 'w-1.5 h-1.5 bg-white/30'
          }`}
        />
      ))}
    </div>
  );
}

export default function MobileHomeScreen() {
  const { homeConfig, currentHomePage, setCurrentHomePage, openApp, setSearchOpen } = useMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pages = homeConfig.pages;
  const dock = homeConfig.dock;

  // Sync scroll to currentHomePage on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = currentHomePage * scrollRef.current.offsetWidth;
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const page = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
    setCurrentHomePage(page);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'transparent' }}>
      {/* Time */}
      <TimeDisplay />

      {/* Search Bar */}
      <div className="px-4 mb-3">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
          onClick={() => setSearchOpen(true)}
        >
          <Search size={16} className="text-white/50" />
          <span className="text-white/50 text-[15px]">Search apps...</span>
        </button>
      </div>

      {/* App Pages */}
      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto scroll-smooth"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onScroll={handleScroll}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
      >
        {pages.map((page, pageIdx) => (
          <div
            key={pageIdx}
            className="flex-none w-full h-full px-4"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="grid grid-cols-4 gap-y-6 gap-x-2 pt-2">
              {page.map((appId) => (
                <div key={appId} className="flex justify-center">
                  <AppIcon appId={appId} onOpen={openApp} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Page Dots */}
      <PageDots total={pages.length} current={currentHomePage} />

      {/* Dock */}
      <div
        className="mx-4 mb-2 px-4 py-3 rounded-3xl flex justify-around items-center"
        style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {dock.map((appId) => {
          const app = MOBILE_APPS.find(a => a.id === appId);
          if (!app) return null;
          const Icon = app.icon;
          return (
            <button
              key={appId}
              className="app-icon"
              onClick={() => openApp(appId)}
            >
              <div
                className="icon-bg"
                style={{
                  background: app.iconBg,
                  width: 56,
                  height: 56,
                  borderRadius: 15,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <Icon size={26} className="text-white" strokeWidth={1.8} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
