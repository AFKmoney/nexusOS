import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { useSystemControls } from '../hooks/useSystemControls';
import { Zap, Wifi, Volume2, VolumeX, Lock, Droplet, Bell, ChevronUp, Moon, Shield, Settings, Sun, BatteryFull, BatteryCharging, WifiOff } from 'lucide-react';
import { notificationQueue } from '../kernel/notificationQueue';

export default function Taskbar() {
  const {
    openWindow,
    windows,
    activeWindowId,
    activeWorkspace,
    switchWorkspace,
    restoreWindow,
    minimizeWindow,
    registry,
    toggleStartMenu,
    isStartMenuOpen,
    openContextMenu,
    focusWindow,
    pinnedApps,
    kernelRules,
    updateKernelRules,
  } = useOS();

  const {
    volume, setVolume, isMuted, toggleMute,
    brightness, setBrightness,
    batteryLevel, isCharging,
    isOnline, connectionType, effectiveType,
  } = useSystemControls();

  const [time, setTime] = useState(new Date());
  const [unreadCount, setUnreadCount] = useState(0);
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setUnreadCount(notificationQueue.getUnreadCount());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTaskbarRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'taskbar' });
  };

  const handleWindowClick = (w: any) => {
    if (activeWindowId === w.id && !w.isMinimized) minimizeWindow(w.id);
    else if (w.isMinimized) restoreWindow(w.id);
    else focusWindow(w.id);
  };

  const safePinnedApps = Array.isArray(pinnedApps) ? pinnedApps : [];

  return (
    <div
      onContextMenu={handleTaskbarRightClick}
      className="taskbar fixed left-3 right-3 bottom-3 h-14 z-50 select-none"
    >
      <div className="h-full rounded-2xl bg-white/8 backdrop-blur-2xl border border-white/12 flex items-center px-3 justify-between shadow-[0_10px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/5">
        {/* Left: Start + Pinned Apps */}
        <div className="flex items-center gap-3 h-full">
          <button
            onClick={(e) => { e.stopPropagation(); toggleStartMenu(); }}
            className={`group relative flex items-center gap-2.5 px-3 h-10 rounded-xl transition-all duration-300 ${
              isStartMenuOpen
                ? 'bg-accent/20 text-accent ring-1 ring-accent/30'
                : 'bg-white/5 text-zinc-300 border border-white/5 hover:border-accent/20'
            }`}
          >
            <div className={`w-5 h-5 bg-accent rounded-md flex items-center justify-center shadow-sm transition-transform duration-300 ${isStartMenuOpen ? 'rotate-180' : 'group-hover:rotate-12'}`}>
              <Zap size={12} className="text-black fill-current" />
            </div>
            <span className="font-bold text-xs tracking-[0.2em] hidden lg:inline">NEXUS</span>
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
                    e.preventDefault();
                    e.stopPropagation();
                    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'app-icon', appId: app.id });
                  }}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-white/10 shadow-inner' : 'hover:bg-white/10'}`}
                >
                  <Icon size={20} className={`transition-colors ${isActive ? 'text-accent' : 'text-zinc-400 group-hover:text-white'}`} />
                  {isActive && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent rounded-full" />}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#0a0a0c]/95 backdrop-blur-xl border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-zinc-200 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-lg translate-y-2 group-hover:translate-y-0 z-[100]">
                    {app.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Window Tabs */}
        <div className="flex-1 flex justify-center gap-1.5 px-4 overflow-hidden h-full items-center">
          {windows.filter(w => w.workspaceId === activeWorkspace || !w.workspaceId).map(w => {
            const app = registry.find(a => a.id === w.appId);
            const Icon = app?.icon || Lock;
            const isFocused = activeWindowId === w.id;
            return (
              <div key={w.id} className="relative group">
                <button
                  onClick={() => handleWindowClick(w)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'window', targetId: w.id });
                  }}
                  className={`px-3 h-9 rounded-lg text-xs font-medium truncate max-w-[160px] transition-all border flex items-center gap-2 ${
                    isFocused && !w.isMinimized
                      ? 'bg-white/10 border-white/15 text-white'
                      : 'bg-black/30 border-white/5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  } ${w.isMinimized ? 'opacity-50' : ''}`}
                >
                  <Icon size={13} className={isFocused ? 'text-accent' : 'text-zinc-500'} />
                  <span className="truncate">{w.title}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: System Controls */}
        <div className="flex items-center gap-2 shrink-0 h-full">
          {/* Workspace Switcher */}
          <div className="flex items-center gap-1 bg-black/60 rounded-2xl border border-white/10 p-1.5 shadow-inner">
            {[1, 2, 3].map(i => (
              <button
                key={i}
                onClick={() => switchWorkspace(i)}
                className={`w-7 h-7 rounded-xl text-[10px] font-black transition-all duration-300 ${
                  activeWorkspace === i
                    ? 'bg-accent text-black shadow-accent scale-110'
                    : 'text-zinc-600 hover:bg-white/5 hover:text-zinc-300'
                }`}
              >
                {i}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Notifications */}
          <button onClick={() => openWindow('notifications')} className="relative p-2.5 hover:bg-white/10 rounded-2xl transition-all group">
            <Bell size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            {unreadCount > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#030305] shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />}
          </button>

          {/* Full Autonomy / AutoPilot indicators */}
          {kernelRules.fullAutonomy && (
            <button
              onClick={() => updateKernelRules({ fullAutonomy: false })}
              title="Full Autonomy is ON — click to disable"
              className="p-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 transition-all group"
            >
              <Shield size={18} className="text-rose-400 group-hover:text-rose-300 animate-pulse" />
            </button>
          )}
          {kernelRules.autonomyEnabled && !kernelRules.fullAutonomy && (
            <button
              onClick={() => openWindow('governance')}
              title="Autonomy Engine is running — click to inspect"
              className="p-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-all group"
            >
              <Zap size={18} className="text-emerald-400 group-hover:text-emerald-300" />
            </button>
          )}

          {/* Quick Settings Toggle */}
          <button
            onClick={() => setShowQuickSettings(!showQuickSettings)}
            className={`p-2.5 rounded-2xl transition-all duration-300 ${showQuickSettings ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <ChevronUp size={18} className={`transition-transform duration-500 ${showQuickSettings ? 'rotate-180' : ''}`} />
          </button>

          {/* Network + Battery */}
          <div className="flex items-center gap-2 bg-black/35 px-3 h-11 rounded-2xl border border-white/10 shadow-inner cursor-pointer hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 px-2 py-1 rounded-xl">
              <span className="text-[10px] font-black text-zinc-400 font-mono tracking-tighter uppercase">
                {effectiveType ? effectiveType.toUpperCase() : (isOnline ? 'ONLINE' : 'OFFLINE')}
              </span>
              {isOnline ? <Wifi size={14} className="text-accent" /> : <WifiOff size={14} className="text-red-500" />}
            </div>
            <div className="flex items-center gap-2 px-2 py-1 rounded-xl">
              {isCharging
                ? <BatteryCharging size={14} className="text-accent" />
                : <BatteryFull size={14} className={batteryLevel <= 20 ? 'text-red-400' : 'text-zinc-400'} />
              }
              <span className={`text-[10px] font-black font-mono ${batteryLevel <= 20 ? 'text-red-400' : 'text-zinc-400'}`}>{batteryLevel}%</span>
            </div>
          </div>

          {/* Clock */}
          <button onClick={() => openWindow('calendar')} className="flex flex-col items-end min-w-[80px] group cursor-pointer">
            <span className="text-zinc-100 font-black text-sm tracking-widest leading-none group-hover:text-accent transition-colors">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1 group-hover:text-zinc-200 transition-colors">
              {time.toLocaleDateString([], { day: '2-digit', month: 'short' })}
            </span>
          </button>

          {/* Show Desktop */}
          <button
            className="w-8 h-9 bg-white/5 hover:bg-accent/20 rounded-lg transition-colors flex items-center justify-center"
            title="Show Desktop"
            onClick={() => windows.forEach(w => minimizeWindow(w.id))}
          >
            <div className="w-3 h-3 border border-white/20 rounded-sm" />
          </button>
        </div>

        {/* Quick Settings Panel */}
        {showQuickSettings && (
          <div
            className="absolute bottom-20 right-6 w-72 bg-[#0a0a0c]/95 backdrop-blur-[50px] border border-white/10 rounded-[28px] p-5 shadow-[0_40px_100px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-10 fade-in duration-300 ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Volume Control */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    {isMuted || volume === 0
                      ? <VolumeX size={16} className="text-red-400" />
                      : <Volume2 size={16} className="text-emerald-400" />
                    }
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Volume</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-zinc-300">{isMuted ? 'MUTED' : `${volume}%`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-1.5 bg-black rounded-full appearance-none cursor-pointer shadow-inner border border-white/5 accent-emerald-500"
              />
            </div>

            {/* Brightness Control */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sun size={16} className="text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Brightness</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-zinc-300">{brightness}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="w-full h-1.5 bg-black rounded-full appearance-none cursor-pointer shadow-inner border border-white/5 accent-blue-500"
              />
            </div>

            {/* Connection Info */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white/5 border border-white/5 mb-4">
              <div className="flex items-center gap-2">
                {isOnline ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-red-400" />}
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">
                {connectionType}{effectiveType ? ` · ${effectiveType.toUpperCase()}` : ''}
              </span>
            </div>

            {/* Battery Info */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white/5 border border-white/5 mb-4">
              <div className="flex items-center gap-2">
                {isCharging
                  ? <BatteryCharging size={14} className="text-emerald-400" />
                  : <BatteryFull size={14} className={batteryLevel <= 20 ? 'text-red-400' : 'text-zinc-300'} />
                }
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                  {batteryLevel}%
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">
                {isCharging ? 'Charging' : batteryLevel <= 20 ? 'Low Battery' : 'On Battery'}
              </span>
            </div>

            {/* Open Settings */}
            <button
              onClick={() => { setShowQuickSettings(false); openWindow('settings'); }}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 transition-all group"
            >
              <Settings size={14} className="text-zinc-500 group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Settings</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
