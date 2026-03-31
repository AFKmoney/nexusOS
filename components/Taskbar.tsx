import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { Zap, Wifi, Volume2, Battery, BatteryCharging, Sparkles, Lock, Droplet, Bell, Layers, ChevronUp, Bluetooth, Moon, Monitor, Shield, Settings, Sun, Search } from 'lucide-react';
import { notificationQueue } from '../kernel/notificationQueue';

export default function Taskbar() {
  const { 
      openWindow, windows, activeWindowId, activeWorkspace, switchWorkspace, 
      restoreWindow, minimizeWindow, registry, toggleStartMenu, isStartMenuOpen,
      openContextMenu, focusWindow, autoArrangeWindows, pinnedApps, notifications
  } = useOS();
  
  const [time, setTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [networkType, setNetworkType] = useState('WiFi');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSystemTray, setShowSystemTray] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setUnreadCount(notificationQueue.getUnreadCount());
    }, 1000);

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        setBatteryLevel(Math.round(batt.level * 100));
        setIsCharging(batt.charging);
        batt.addEventListener('levelchange', () => setBatteryLevel(Math.round(batt.level * 100)));
        batt.addEventListener('chargingchange', () => setIsCharging(batt.charging));
      });
    } else {
      setBatteryLevel(85); 
    }

    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      setNetworkType(conn.effectiveType ? conn.effectiveType.toUpperCase() : 'WIFI');
      conn.addEventListener('change', () => {
        setNetworkType(conn.effectiveType ? conn.effectiveType.toUpperCase() : 'WIFI');
      });
    }

    return () => clearInterval(timer);
  }, []);

  const handleTaskbarRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'taskbar' });
  };

  const handleWindowClick = (w: any) => {
      if (activeWindowId === w.id && !w.isMinimized) minimizeWindow(w.id);
      else { if (w.isMinimized) restoreWindow(w.id); else focusWindow(w.id); }
  };

  const safePinnedApps = Array.isArray(pinnedApps) ? pinnedApps : [];

  return (
    <div onContextMenu={handleTaskbarRightClick} className="taskbar h-16 bg-black/20 backdrop-blur-[60px] border-t border-white/10 flex items-center px-6 justify-between absolute bottom-0 w-full z-50 select-none shadow-[0_-15px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
      
      {/* Left Area: Start & Pinned */}
      <div className="flex items-center gap-3 h-full">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleStartMenu(); }}
          className={`group relative flex items-center gap-3 px-4 h-11 rounded-2xl transition-all duration-500 hover:scale-[1.05] active:scale-95 ${isStartMenuOpen ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-zinc-300 border border-white/5 hover:border-emerald-500/30'}`}
        >
          <div className={`w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center shadow-lg transition-transform duration-500 ${isStartMenuOpen ? 'rotate-180' : 'group-hover:rotate-12'}`}>
             <Zap size={14} className="text-black fill-current" />
          </div>
          <span className="font-black text-sm tracking-[0.3em] drop-shadow-md hidden lg:inline">NEXUS</span>
          {isStartMenuOpen && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />}
        </button>
        
        <div className="h-8 w-px bg-white/10 mx-2" />
        
        <div className="flex items-center gap-1.5">
          {safePinnedApps.map(appId => {
            const app = registry.find(a => a.id === appId);
            if (!app) return null;
            const isActive = windows.some(w => w.appId === app.id);
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => openWindow(app.id)}
                onContextMenu={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'app-icon', appId: app.id });
                }}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 group relative ${isActive ? 'bg-white/10 shadow-inner' : 'hover:bg-white/10 hover:scale-110'}`}
              >
                <Icon size={22} className={`transition-all duration-300 ${isActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-zinc-400 group-hover:text-white'}`} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                )}
                {/* Tooltip Spatial */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#0a0a0c]/90 backdrop-blur-2xl border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-100 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-[0_20px_40px_rgba(0,0,0,0.9)] translate-y-4 group-hover:translate-y-0 z-[100] ring-1 ring-white/5">
                  {app.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Area: Running Node Indicators */}
      <div className="flex-1 flex justify-center gap-3 px-10 overflow-hidden h-full items-center">
        {windows.filter(w => w.workspaceId === activeWorkspace || !w.workspaceId).map(w => {
            const app = registry.find(a => a.id === w.appId);
            const Icon = app?.icon || Lock;
            const isFocused = activeWindowId === w.id;
            
            return (
                <div key={w.id} className="relative group">
                  <button
                      onClick={() => handleWindowClick(w)}
                      onContextMenu={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'window', targetId: w.id });
                      }}
                      className={`
                          px-4 h-10 rounded-xl text-xs font-bold truncate max-w-[180px] transition-all border flex items-center gap-3
                          ${isFocused && !w.isMinimized 
                              ? 'bg-white/10 border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.05]' 
                              : 'bg-black/40 border-white/5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300'} 
                          ${w.isMinimized ? 'opacity-40 grayscale' : ''}
                      `}
                  >
                      <div className={`p-1.5 rounded-lg ${isFocused ? 'bg-emerald-500/20 text-emerald-400' : 'bg-black/20 text-zinc-600'}`}>
                        <Icon size={14} />
                      </div>
                      <span className="truncate tracking-wide">{w.title}</span>
                  </button>

                  {/* Enhanced Spatial Preview */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 p-4 w-56 bg-[#0a0a0c]/95 backdrop-blur-3xl border border-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-[0_30px_60px_rgba(0,0,0,1)] z-[100] scale-90 group-hover:scale-100 duration-300 origin-bottom ring-1 ring-white/10">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-3">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg"><Icon size={14} className="text-emerald-400" /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white truncate">{w.title}</span>
                    </div>
                    <div className="h-24 bg-gradient-to-br from-zinc-900 to-black rounded-2xl border border-white/5 flex flex-col items-center justify-center overflow-hidden relative">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 to-transparent" />
                      <Droplet size={24} className="mb-2 text-emerald-500/20" />
                      <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Neural Snapshot</span>
                    </div>
                  </div>
                </div>
            )
        })}
      </div>

      {/* Right Area: Telemetry & Chronos */}
      <div className="flex items-center gap-4 shrink-0 h-full">
        
        {/* Spatial Workspace Switcher */}
        <div className="flex items-center gap-1.5 bg-black/60 rounded-2xl border border-white/10 p-1.5 shadow-inner">
            {[1, 2, 3].map(i => (
              <button 
                key={i} 
                onClick={() => switchWorkspace(i)} 
                className={`w-7 h-7 rounded-xl text-[10px] font-black transition-all duration-300 ${activeWorkspace === i ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110' : 'text-zinc-600 hover:bg-white/5 hover:text-zinc-300'}`}
              >
                {i}
              </button>
            ))}
        </div>

        <div className="h-8 w-px bg-white/10" />

        {/* Global Notifications */}
        <button onClick={() => openWindow('notifications')} className="relative p-2.5 hover:bg-white/10 rounded-2xl transition-all group overflow-hidden">
          <Bell size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
          {unreadCount > 0 && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#030305] shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
          )}
        </button>

        {/* System Control Trigger */}
        <button 
          onClick={() => setShowSystemTray(!showSystemTray)} 
          className={`p-2.5 rounded-2xl transition-all duration-300 ${showSystemTray ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
        >
          <ChevronUp size={18} className={`transition-transform duration-500 ${showSystemTray ? 'rotate-180' : ''}`} />
        </button>

        {/* Telemetry Block */}
        <div className="flex items-center gap-4 bg-black/40 px-4 h-11 rounded-2xl border border-white/5 shadow-inner cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-zinc-600 font-mono tracking-tighter uppercase">{networkType}</span>
              <Wifi size={14} className={navigator.onLine ? 'text-emerald-400' : 'text-red-500'} />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3 bg-zinc-800 rounded-sm relative overflow-hidden">
                <div className={`absolute bottom-0 w-full bg-emerald-500 transition-all duration-1000`} style={{ height: `${batteryLevel}%` }} />
              </div>
              <span className="text-[10px] font-black font-mono text-zinc-400">{batteryLevel}%</span>
            </div>
        </div>

        {/* Chronos Block */}
        <div className="flex flex-col items-end min-w-[80px] group cursor-pointer">
            <span className="text-zinc-100 font-black text-sm tracking-widest leading-none group-hover:text-emerald-400 transition-colors">
              {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-1 group-hover:text-zinc-400 transition-colors">
              {time.toLocaleDateString([], {day: '2-digit', month: 'short'})}
            </span>
        </div>
        
        {/* Desktop Anchor */}
        <button 
            className="w-1.5 h-10 bg-white/5 border-l border-white/10 ml-1 hover:bg-emerald-500/20 rounded-full transition-all active:scale-y-75" 
            title="Sovereign Desktop"
            onClick={() => windows.forEach(w => minimizeWindow(w.id))}
        />
      </div>

      {/* Expanded Telemetry Hub (System Tray) */}
      {showSystemTray && (
        <div className="absolute bottom-20 right-6 w-80 bg-[#0a0a0c]/90 backdrop-blur-[50px] border border-white/10 rounded-[32px] p-6 shadow-[0_40px_100px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-10 fade-in duration-500 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Telemetry Hub</h3>
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse delay-150" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: 'Uplink', icon: Wifi, color: 'text-blue-400', active: true },
              { label: 'Neural', icon: Zap, color: 'text-emerald-400', active: true },
              { label: 'Privacy', icon: Shield, color: 'text-purple-400', active: true },
              { label: 'Stealth', icon: Moon, color: 'text-zinc-400', active: false },
            ].map(act => (
              <button key={act.label} className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all border ${act.active ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/40 border-transparent opacity-40'}`}>
                <act.icon size={18} className={act.active ? act.color : 'text-zinc-600'} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-200">{act.label}</span>
              </button>
            ))}
          </div>
          
          <div className="space-y-6 pt-2">
            <div className="space-y-3">
               <div className="flex justify-between items-center px-1">
                 <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Audio Flux</span>
                 <Volume2 size={12} className="text-zinc-500" />
               </div>
               <input type="range" className="w-full accent-emerald-500 h-1.5 bg-black rounded-full appearance-none cursor-pointer shadow-inner border border-white/5" defaultValue={80} />
            </div>
            <div className="space-y-3">
               <div className="flex justify-between items-center px-1">
                 <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Photon Density</span>
                 <Sun size={12} className="text-zinc-500" />
               </div>
               <input type="range" className="w-full accent-blue-500 h-1.5 bg-black rounded-full appearance-none cursor-pointer shadow-inner border border-white/5" defaultValue={100} />
            </div>
          </div>

          <button 
            onClick={() => { setShowSystemTray(false); openWindow('settings'); }}
            className="w-full mt-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 transition-all group"
          >
            <Settings size={16} className="text-zinc-500 group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">System Parameters</span>
          </button>
        </div>
      )}
    </div>
  );
}
