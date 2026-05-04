import React from 'react';
import { ChevronLeft, Home, Grid3X3, Clock } from 'lucide-react';
import { useMobile } from '../store/mobileStore';

export default function MobileNavBar() {
  const {
    appStack,
    goBack,
    activeAppId,
    isRecentAppsOpen,
    setRecentAppsOpen,
    setAppDrawerOpen,
    closeAllApps,
  } = useMobile();

  const hasApp = appStack.length > 0 && !!activeAppId;

  return (
    <div
      className="nav-bar glass-dark flex items-start justify-around pt-3"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Back */}
      <button
        className={`flex flex-col items-center gap-1 transition-all ${hasApp ? 'opacity-100' : 'opacity-30'}`}
        onClick={() => hasApp && goBack()}
        disabled={!hasApp}
      >
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${hasApp ? 'active:bg-white/10' : ''}`}>
          <ChevronLeft size={22} className="text-white" strokeWidth={2.5} />
        </div>
      </button>

      {/* Home */}
      <button
        className="flex flex-col items-center gap-1"
        onClick={() => closeAllApps()}
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-white/10 transition-all">
          <Home size={20} className="text-white" strokeWidth={2.5} />
        </div>
      </button>

      {/* Recent Apps */}
      <button
        className={`flex flex-col items-center gap-1 ${isRecentAppsOpen ? 'opacity-100' : ''}`}
        onClick={() => setRecentAppsOpen(!isRecentAppsOpen)}
      >
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isRecentAppsOpen ? 'bg-white/10' : 'active:bg-white/10'}`}>
          <Clock size={18} className="text-white" strokeWidth={2.5} />
          {appStack.length > 0 && (
            <span className="absolute ml-4 mb-4 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-bold text-black flex items-center justify-center">
              {appStack.length}
            </span>
          )}
        </div>
      </button>

      {/* App Drawer */}
      <button
        className="flex flex-col items-center gap-1"
        onClick={() => setAppDrawerOpen(true)}
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-white/10 transition-all">
          <Grid3X3 size={18} className="text-white" strokeWidth={2.5} />
        </div>
      </button>
    </div>
  );
}
