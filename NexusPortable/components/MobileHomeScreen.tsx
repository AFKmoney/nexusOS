import React, { useRef, useState, useEffect } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Plus, Check, Box } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { MOBILE_APPS } from '../appRegistry';

function TimeDisplay({ isEditing, onDone }: { isEditing: boolean, onDone: () => void }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  
  if (isEditing) {
    return (
      <div className="flex justify-between items-center px-6 pt-8 pb-4">
        <span className="text-white font-semibold text-lg">Edit Home Screen</span>
        <button onClick={onDone} className="bg-white/20 text-white px-4 py-1.5 rounded-full font-medium active:bg-white/30 transition-all flex items-center gap-1.5">
           <Check size={16}/> Done
        </button>
      </div>
    );
  }

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

function AppIcon({ 
  appId, 
  onOpen, 
  isEditing, 
  onRemove, 
  onMoveLeft, 
  onMoveRight, 
  onLongPress 
}: { 
  appId: string; 
  onOpen: (id: string) => void;
  isEditing: boolean;
  onRemove?: () => void;
  onMoveLeft?: (() => void) | undefined;
  onMoveRight?: (() => void) | undefined;
  onLongPress?: (() => void) | undefined;
}) {
  const { registry } = useMobile();
  const app = registry.find(a => a.id === appId);
  if (!app) return null;
  const Icon = app.icon || Box;

  const pressTimer = useRef<any>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditing) return;
    const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };

    pressTimer.current = setTimeout(() => {
      onLongPress && onLongPress();
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!pressTimer.current) return;
    const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY;
    
    const dx = Math.abs(clientX - startPos.current.x);
    const dy = Math.abs(clientY - startPos.current.y);
    
    if (dx > 10 || dy > 10) {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="relative">
      {isEditing && onRemove && (
        <button 
          onClick={onRemove}
          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center z-10 border-2 border-black"
        >
          <X size={14} className="text-white" />
        </button>
      )}
      
      <div 
        className={`app-icon ${isEditing ? 'animate-pulse' : ''}`}
        onClick={() => !isEditing && onOpen(appId)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        style={isEditing ? { transform: `rotate(${Math.random() > 0.5 ? '1deg' : '-1deg'})` } : undefined}
      >
        <div className="icon-bg" style={{ background: (app as any).iconBg || 'linear-gradient(135deg, #374151 0%, #111827 100%)' }}>
          <Icon size={28} className="text-white" strokeWidth={1.8} />
        </div>
        <span className="icon-label">{app.name}</span>
      </div>

      {isEditing && (onMoveLeft || onMoveRight) && (
        <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
          {onMoveLeft && (
            <button onClick={onMoveLeft} className="p-1 bg-black/50 rounded-full backdrop-blur">
              <ChevronLeft size={12} className="text-white" />
            </button>
          )}
          {onMoveRight && (
            <button onClick={onMoveRight} className="p-1 bg-black/50 rounded-full backdrop-blur">
              <ChevronRight size={12} className="text-white" />
            </button>
          )}
        </div>
      )}
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

function WidgetSection() {
  const { governance, installedApps } = useMobile();
  const [battery, setBattery] = useState(87);
  
  return (
    <div className="px-6 grid grid-cols-2 gap-3 mb-8">
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col gap-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <Brain size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Neural Health</span>
        </div>
        <div className="text-2xl font-light text-white">{(governance.confidenceScore * 100).toFixed(0)}%</div>
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${governance.confidenceScore * 100}%` }} />
        </div>
      </div>
      
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col gap-2">
        <div className="flex items-center gap-2 text-cyan-400">
          <Database size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">System Load</span>
        </div>
        <div className="text-2xl font-light text-white">{installedApps.length} <span className="text-xs text-zinc-500 uppercase">Apps</span></div>
        <div className="text-[9px] text-zinc-600 font-mono">NOMINAL SYNC ACTIVE</div>
      </div>
    </div>
  );
}

export default function MobileHomeScreen() {
  const { homeConfig, currentHomePage, setCurrentHomePage, openApp, setSearchOpen, updateHomeConfig, setAppDrawerOpen } = useMobile();
  // ... rest of component (add <WidgetSection /> before search)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const pages = homeConfig.pages;
  const dock = homeConfig.dock;

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

  const handleRemove = (pageIdx: number, appIdx: number) => {
    const newPages = [...pages];
    const page = newPages[pageIdx];
    if (!page) return;

    const newPage = [...page];
    newPage.splice(appIdx, 1);
    newPages[pageIdx] = newPage;
    
    if (newPage.length === 0 && newPages.length > 1) {
      newPages.splice(pageIdx, 1);
      setCurrentHomePage(Math.max(0, currentHomePage - 1));
    }
    
    updateHomeConfig({ pages: newPages });
  };

  const handleMove = (pageIdx: number, appIdx: number, direction: -1 | 1) => {
    const newPages = [...pages];
    const page = newPages[pageIdx];
    if (!page) return;

    const newPage = [...page];
    const newIdx = appIdx + direction;
    
    if (newIdx >= 0 && newIdx < newPage.length) {
      const temp = newPage[appIdx];
      if (temp && newPage[newIdx]) {
        newPage[appIdx] = newPage[newIdx]!;
        newPage[newIdx] = temp;
        newPages[pageIdx] = newPage;
      }
    } else if (direction === 1 && pageIdx < newPages.length - 1) {
      const nextPage = newPages[pageIdx + 1];
      if (nextPage && nextPage.length < 24) {
        const app = newPage.splice(appIdx, 1)[0];
        if (app) {
           newPages[pageIdx] = newPage;
           newPages[pageIdx + 1] = [app, ...nextPage];
        }
      }
    } else if (direction === -1 && pageIdx > 0) {
      const prevPage = newPages[pageIdx - 1];
      if (prevPage && prevPage.length < 24) {
        const app = newPage.splice(appIdx, 1)[0];
        if (app) {
           newPages[pageIdx] = newPage;
           newPages[pageIdx - 1] = [...prevPage, app];
        }
      }
    }
    updateHomeConfig({ pages: newPages });
  };

  const handleAddPage = () => {
    updateHomeConfig({ pages: [...pages, []] });
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }
    }, 100);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'transparent' }}>
      <TimeDisplay isEditing={isEditing} onDone={() => setIsEditing(false)} />

      {!isEditing && <WidgetSection />}

      {!isEditing && (
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
      )}

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
      >
        {pages.map((page, pageIdx) => (
          <div
            key={pageIdx}
            className="flex-none w-full h-full px-4"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="grid grid-cols-4 gap-y-6 gap-x-2 pt-2">
              {page.map((appId, appIdx) => (
                <div key={appId} className="flex justify-center relative">
                  <AppIcon 
                    appId={appId} 
                    onOpen={openApp}
                    isEditing={isEditing}
                    onLongPress={() => setIsEditing(true)}
                    onRemove={() => handleRemove(pageIdx, appIdx)}
                    onMoveLeft={(appIdx > 0 || pageIdx > 0) ? () => handleMove(pageIdx, appIdx, -1) : undefined}
                    onMoveRight={(appIdx < page.length - 1 || pageIdx < pages.length - 1) ? () => handleMove(pageIdx, appIdx, 1) : undefined}
                  />
                </div>
              ))}
              
              {isEditing && page.length < 24 && (
                <div className="flex justify-center items-start pt-2">
                  <button 
                    onClick={() => setAppDrawerOpen(true)}
                    className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center text-white/50 active:bg-white/10"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isEditing && (
          <div className="flex-none w-full h-full px-4 flex items-center justify-center" style={{ scrollSnapAlign: 'start' }}>
             <button onClick={handleAddPage} className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium flex items-center gap-2">
               <Plus size={18} /> New Page
             </button>
          </div>
        )}
      </div>

      <PageDots total={isEditing ? pages.length + 1 : pages.length} current={currentHomePage} />

      {/* Dock */}
      <div
        className="mx-4 mb-2 px-4 py-3 rounded-3xl flex justify-around items-center relative"
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
              className={`app-icon ${isEditing ? 'animate-pulse' : ''}`}
              onClick={() => !isEditing && openApp(appId)}
              onContextMenu={(e) => { e.preventDefault(); setIsEditing(true); }}
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
