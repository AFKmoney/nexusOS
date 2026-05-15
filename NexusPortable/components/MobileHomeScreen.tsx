import React, { useRef, useState, useEffect } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
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
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onLongPress?: () => void;
}) {
  const app = MOBILE_APPS.find(a => a.id === appId);
  if (!app) return null;
  const Icon = app.icon;

  let pressTimer: any = null;

  const handleTouchStart = () => {
    if (isEditing) return;
    pressTimer = setTimeout(() => {
      onLongPress && onLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (pressTimer) clearTimeout(pressTimer);
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
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        style={isEditing ? { transform: `rotate(${Math.random() > 0.5 ? '1deg' : '-1deg'})` } : undefined}
      >
        <div className="icon-bg" style={{ background: app.iconBg }}>
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

export default function MobileHomeScreen() {
  const { homeConfig, currentHomePage, setCurrentHomePage, openApp, setSearchOpen, updateHomeConfig, setAppDrawerOpen } = useMobile();
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
    newPages[pageIdx] = [...newPages[pageIdx]];
    newPages[pageIdx].splice(appIdx, 1);
    
    if (newPages[pageIdx].length === 0 && newPages.length > 1) {
      newPages.splice(pageIdx, 1);
      setCurrentHomePage(Math.max(0, currentHomePage - 1));
    }
    
    updateHomeConfig({ pages: newPages });
  };

  const handleMove = (pageIdx: number, appIdx: number, direction: -1 | 1) => {
    const newPages = [...pages];
    newPages[pageIdx] = [...newPages[pageIdx]];
    
    const newIdx = appIdx + direction;
    if (newIdx >= 0 && newIdx < newPages[pageIdx].length) {
      const temp = newPages[pageIdx][appIdx];
      newPages[pageIdx][appIdx] = newPages[pageIdx][newIdx];
      newPages[pageIdx][newIdx] = temp;
    } else if (direction === 1 && pageIdx < newPages.length - 1 && newPages[pageIdx+1].length < 24) {
      const app = newPages[pageIdx].splice(appIdx, 1)[0];
      newPages[pageIdx+1] = [app, ...newPages[pageIdx+1]];
    } else if (direction === -1 && pageIdx > 0 && newPages[pageIdx-1].length < 24) {
      const app = newPages[pageIdx].splice(appIdx, 1)[0];
      newPages[pageIdx-1] = [...newPages[pageIdx-1], app];
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
                    onMoveLeft={appIdx > 0 || pageIdx > 0 ? () => handleMove(pageIdx, appIdx, -1) : undefined}
                    onMoveRight={appIdx < page.length - 1 || pageIdx < pages.length - 1 ? () => handleMove(pageIdx, appIdx, 1) : undefined}
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