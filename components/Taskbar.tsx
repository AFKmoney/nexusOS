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

    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        setBatteryLevel(Math.round(batt.level * 100));
        setIsCharging(batt.charging);
        batt.addEventListener('levelchange', () => setBatteryLevel(Math.round(batt.level * 100)));
        batt.addEventListener('chargingchange', () => setIsCharging(batt.charging));
      });
    } else {
      setBatteryLevel(85); // Mock
    }

    // Network API
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
    <div onContextMenu={handleTaskbarRightClick} className="h-14 bg-[#030305]/80 backdrop-blur-3xl border-t border-white/5 flex items-center px-4 justify-between absolute bottom-0 w-full z-50 select-none shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
      
      {/* LEFT: Start Button & Pinned Apps */}
      <div className="flex items-center gap-2 shrink-0 h-full">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleStartMenu(); }}
          className={`mr-3 font-black text-lg tracking-widest cursor-pointer px-3 h-10 rounded-xl transition-all flex items-center gap-2.5 duration-300 hover:scale-[1.02] active:scale-95 ${isStartMenuOpen ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/30' : 'text-zinc-200 hover:bg-white/10 hover:text-emerald-400'}`}
        >
          <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-md shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center justify-center">
             <Zap size={12} className="text-black" />
          </div>
          <span className="hidden md:inline drop-shadow-md">NEXUS</span>
        </button>
        
        <div className="h-6 w-px bg-white/10 mx-1" />
        
        {/* Pinned Apps */}
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
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 group relative hover:bg-white/10 hover:scale-105 active:scale-95 ${isActive ? 'bg-white/5' : ''}`}
            >
              <Icon size={22} className={`transition-all duration-300 drop-shadow-md ${isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-white'}`} />
              
              {isActive && (
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-500 rounded-t-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
              
              {/* Tooltip */}
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#121214]/90 backdrop-blur-md border border-white/10 rounded-lg text-xs font-medium text-zinc-200 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.8)] translate-y-2 group-hover:translate-y-0 z-[100]">
                {app.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* CENTER: Open Windows */}
      <div className="flex-1 flex justify-center gap-2 mx-4 overflow-hidden">
        {windows.filter(w => w.workspaceId === activeWorkspace || !w.workspaceId).map(w => {
            const app = registry.find(a => a.id === w.appId);
            const Icon = app?.icon || Lock;
            
            return (
                <div key={w.id} className="relative group">
                  <button
                      onClick={() => handleWindowClick(w)}
                      onContextMenu={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'window', targetId: w.id });
                      }}
                      className={`
                          px-3 py-1.5 rounded-lg text-sm truncate max-w-[160px] transition-all border flex items-center gap-2
                          ${activeWindowId === w.id && !w.isMinimized 
                              ? 'bg-zinc-800/90 border-zinc-500/50 text-white shadow-lg scale-[1.02]' 
                              : 'bg-white/5 border-transparent text-zinc-400 hover:bg-white/10 hover:text-zinc-200'} 
                          ${w.isMinimized ? 'opacity-50' : ''}
                      `}
                  >
                      <Icon size={16} className={activeWindowId === w.id ? "text-cyan-400" : ""} />
                      <span className="truncate text-xs font-medium">{w.title}</span>
                  </button>

                  {/* Window Preview Tooltip */}
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 mb-2 p-3 w-48 bg-zinc-900 border border-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl z-[100] scale-95 group-hover:scale-100 duration-200 origin-bottom">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                      <Icon size={14} className="text-cyan-400" />
                      <span className="text-[10px] font-bold text-white truncate">{w.title}</span>
                    </div>
                    <div className="h-20 bg-black/40 rounded border border-white/5 flex flex-col items-center justify-center text-zinc-600">
                      <Droplet size={20} className="mb-1 opacity-20" />
                      <span className="text-[9px] uppercase tracking-widest">{app?.name}</span>
                    </div>
                  </div>
                </div>
            )
        })}
      </div>

      {/* RIGHT: System Tray */}
      <div className="flex items-center gap-3 text-sm font-mono text-zinc-400 shrink-0">
        
        {/* Workspace Switcher */}
        <div className="flex items-center gap-1 bg-black/40 rounded border border-white/5 p-1 group relative">
            <button onClick={() => switchWorkspace(1)} className={`w-5 h-5 rounded text-[10px] font-bold ${activeWorkspace === 1 ? 'bg-cyan-500 text-black' : 'hover:bg-white/10 text-zinc-400'}`}>1</button>
            <button onClick={() => switchWorkspace(2)} className={`w-5 h-5 rounded text-[10px] font-bold ${activeWorkspace === 2 ? 'bg-cyan-500 text-black' : 'hover:bg-white/10 text-zinc-400'}`}>2</button>
            <button onClick={() => switchWorkspace(3)} className={`w-5 h-5 rounded text-[10px] font-bold ${activeWorkspace === 3 ? 'bg-cyan-500 text-black' : 'hover:bg-white/10 text-zinc-400'}`}>3</button>
            {/* Tooltip */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 border border-white/10 rounded text-[10px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                 Workspaces
            </div>
        </div>
        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Window Layout AI */}
        <button 
            onClick={() => autoArrangeWindows()}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-purple-400 group relative"
            title="Neural Arrange"
        >
            <Sparkles size={16} className="group-hover:animate-pulse" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Notifications Badge */}
        <button onClick={() => openWindow('notifications')} className="relative p-1.5 hover:bg-white/10 rounded transition" title="Notifications">
          <Bell size={16} />
          {unreadCount > 0 && (
            <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-black shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
          )}
        </button>

        {/* Expand System Tray Button */}
        <button onClick={() => setShowSystemTray(!showSystemTray)} className="p-1 hover:bg-white/10 rounded transition text-zinc-400">
          <ChevronUp size={16} className={`transition-transform duration-300 ${showSystemTray ? 'rotate-180' : ''}`} />
        </button>

        {/* Status Icons */}
        <div className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded-lg transition-colors cursor-pointer" title="System Status">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-zinc-500">{networkType}</span>
              <Wifi size={14} className={navigator.onLine ? 'text-zinc-300' : 'text-red-400'} />
            </div>
            <Volume2 size={14} />
            <div className="flex items-center gap-1">
              {isCharging ? <BatteryCharging size={14} className="text-emerald-400" /> : <Battery size={14} />}
              {batteryLevel !== null && <span className="text-[10px]">{batteryLevel}%</span>}
            </div>
        </div>

        {/* Date/Time */}
        <div className="flex flex-col items-end px-3 py-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer group">
            <span className="text-zinc-200 font-bold leading-none text-xs group-hover:text-white transition-colors">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span className="text-[10px] leading-none mt-1 text-zinc-500 group-hover:text-zinc-400 transition-colors">{time.toLocaleDateString()}</span>
        </div>
        
        <div 
            className="w-1.5 h-full bg-white/5 border-l border-white/10 ml-1 hover:bg-white/20 cursor-pointer transition-colors" 
            title="Show Desktop"
            onClick={() => windows.forEach(w => minimizeWindow(w.id))}
        ></div>
      </div>

      {/* System Tray Expanded Panel */}
      {showSystemTray && (
        <div className="absolute bottom-14 right-4 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* Quick Actions */}
            <button className="flex flex-col items-center justify-center py-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors">
              <Wifi size={18} className="mb-1.5" />
              <span className="text-[10px] font-bold">Wi-Fi</span>
            </button>
            <button className="flex flex-col items-center justify-center py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
              <Bluetooth size={18} className="mb-1.5" />
              <span className="text-[10px] font-bold">Bluetooth</span>
            </button>
            <button className="flex flex-col items-center justify-center py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/5 transition-colors">
              <Moon size={18} className="mb-1.5" />
              <span className="text-[10px] font-bold">Focus</span>
            </button>
            <button className="flex flex-col items-center justify-center py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/5 transition-colors">
              <Monitor size={18} className="mb-1.5" />
              <span className="text-[10px] font-bold">Night Light</span>
            </button>
            <button className="flex flex-col items-center justify-center py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/5 transition-colors">
              <Shield size={18} className="mb-1.5" />
              <span className="text-[10px] font-bold">VPN</span>
            </button>
            <button onClick={() => { setShowSystemTray(false); openWindow('settings'); }} className="flex flex-col items-center justify-center py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/5 transition-colors">
              <Settings size={18} className="mb-1.5" />
              <span className="text-[10px] font-bold">Settings</span>
            </button>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
               <Volume2 size={16} className="text-zinc-400" />
               <input type="range" className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer" defaultValue={80} />
            </div>
            <div className="flex items-center gap-3">
               <Sun size={16} className="text-zinc-400" />
               <input type="range" className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer" defaultValue={100} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

