import React, { useState, useMemo } from 'react';
import { useOS } from '../store/osStore';
import { vfs, SYSTEM_VFS_APP_ID } from '../kernel/fileSystem';
import { PROCEDURAL_WALLPAPERS } from '../appShellConstants';
import {
  Power, Search, LogOut, Settings, User, Clock, Lock, Shield,
  Wallpaper, Palette, Layers3, Store, MonitorCog, LaptopMinimalCheck,
} from 'lucide-react';
import { getSmartIcon } from '../utils/smartIcons';

export default function StartMenu() {
  const {
    isStartMenuOpen, registry, installedApps, openWindow, systemReset,
    currentUser, logout, openContextMenu, toggleStartMenu,
    lockShell,
    wallpaper, wallpaperEffect, themePreset, aiManagedStoreEnabled,
    setWallpaper, setWallpaperEffect, setThemePreset,
    setAiManagedStoreEnabled, setAccentColor,
  } = useOS();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showControls, setShowControls] = useState(false);

  const recentFiles = useMemo(() => {
    if (!isStartMenuOpen) return [];
    const list = vfs.listDir('/home/user/Desktop', SYSTEM_VFS_APP_ID);
    return (list || [])
      .map(f => {
        const fullPath = `/home/user/Desktop/${f}`;
        const stat = vfs.stat(fullPath);
        return { name: f, path: fullPath, modified: stat?.modified || 0, type: stat?.type };
      })
      .filter(n => n.type === 'file')
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 4);
  }, [isStartMenuOpen]);

  if (!isStartMenuOpen) return null;

  const CATEGORIES: Record<string, string[]> = {
    'All': [],
    'System': ['dashboard', 'settings', 'monitor', 'task_manager', 'clipboard', 'notifications', 'device_manager', 'recyclebin'],
    'AI & Dev': ['hyperide', 'forge', 'daemon_chat', 'aion_agent', 'model_manager', 'nfr', 'terminal', 'ubuntu', 'snippets'],
    'Media': ['paint', 'video_player', 'image_viewer', 'music', 'wallpaper', 'fractal'],
    'Productivity': ['notepad', 'explorer', 'calculator', 'calendar', 'rich_editor', 'kanban', 'pomodoro', 'habits', 'contacts'],
    'Utilities': ['appstore', 'silence', 'native_zip', 'sticky_notes', 'vault', 'voice_recorder', 'markdown', 'rss', 'accessibility', 'screenshot', 'sysinfo', 'weather'],
  };

  const categoriesList = Object.keys(CATEGORIES);

  const displayedApps = registry.filter(app => {
    if (!installedApps.includes(app.id)) return false;
    if (app.hidden) return false;
    if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory !== 'All' && !search) {
      const inCat = CATEGORIES[activeCategory]?.includes(app.id);
      if (!inCat) return false;
    }
    return true;
  });

  const handleAppRightClick = (e: React.MouseEvent, appId: string) => {
    e.preventDefault(); e.stopPropagation();
    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'app-icon', appId });
  };

  const handleAccentChange = (preset: string, color: string) => {
    setAccentColor(color);
    setThemePreset(preset === 'blue' ? 'midnight-cyan' : themePreset);
  };

  return (
    <div
      className="start-menu fixed bottom-16 left-3 z-[9990] w-[640px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(85vh-70px)] bg-[#08080c]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Header */}
      <div className="px-4 py-3 shrink-0 border-b border-white/5 relative z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-zinc-100 focus:outline-none focus:border-accent/50 transition-colors placeholder:text-zinc-500"
            placeholder="Search apps..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-h-0">
        {/* Category Navigation */}
        <div className="px-4 pt-3 pb-2 flex gap-1.5 flex-wrap shrink-0">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors ${activeCategory === cat
                ? 'bg-accent text-black'
                : 'text-zinc-500 hover:text-zinc-300 bg-white/5 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setShowControls(!showControls)}
            className={`ml-auto px-2 py-1 rounded-lg transition-colors ${showControls ? 'bg-accent/20 text-accent' : 'text-zinc-600 hover:text-zinc-300 bg-white/5 hover:bg-white/10'}`}
            title="Surface Controls"
          >
            <MonitorCog size={14} />
          </button>
        </div>

        {/* Collapsible Controls */}
        {showControls && (
          <div className="px-4 pb-2">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => {
                const keys = Object.keys(PROCEDURAL_WALLPAPERS);
                if (keys.length === 0) return;
                const idx = keys.indexOf(wallpaper);
                const next = keys[(idx + 1) % keys.length]!;
                setWallpaper(next);
                const label = next.split('/').pop();
                if (label === 'aurora' || label === 'nebula') setWallpaperEffect(label);
              }}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-left">
                <Wallpaper size={14} className="text-accent shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">Effect</div>
                  <div className="text-[10px] text-zinc-500 truncate">{wallpaperEffect === 'aurora' ? 'Aurora' : 'Cycle'}</div>
                </div>
              </button>
              <button onClick={() => setThemePreset(themePreset === 'neo-emerald' ? 'midnight-cyan' : 'neo-emerald')}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-left">
                <Palette size={14} className="text-accent shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">Theme</div>
                  <div className="text-[10px] text-zinc-500 truncate">Swap</div>
                </div>
              </button>
              <button onClick={() => handleAccentChange('blue', '#3b82f6')}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-left">
                <Layers3 size={14} className="text-accent shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">Accent</div>
                  <div className="text-[10px] text-zinc-500 truncate">Blue</div>
                </div>
              </button>
              <button onClick={() => setAiManagedStoreEnabled(!aiManagedStoreEnabled)}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left ${aiManagedStoreEnabled ? 'bg-accent/10 border-accent/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                <LaptopMinimalCheck size={14} className={aiManagedStoreEnabled ? 'text-accent shrink-0' : 'text-zinc-500 shrink-0'} />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">AI Store</div>
                  <div className="text-[10px] text-zinc-500 truncate">{aiManagedStoreEnabled ? 'On' : 'Off'}</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 min-h-0">
          {/* Recent Files */}
          {!search && activeCategory === 'All' && recentFiles.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={12} className="text-accent" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Recent</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recentFiles.slice(0, 2).map(file => (
                  <button
                    key={file.path}
                    onClick={() => { openWindow('notepad', { path: file.path }); toggleStartMenu(); }}
                    className="flex items-center gap-2.5 p-2.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-white/15 transition-colors text-left group"
                  >
                    <div className="p-1.5 bg-black/40 rounded-lg text-zinc-400 group-hover:text-accent transition-colors shrink-0">
                      {getSmartIcon(file.path, 14)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{file.name}</div>
                      <div className="text-[9px] font-mono text-zinc-500 truncate">{new Date(file.modified).toLocaleTimeString()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* App Grid Header */}
          <div className="flex items-center gap-2 mb-3 mt-1">
            <div className="w-1 h-1 rounded-full bg-accent" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {activeCategory === 'All' ? 'All Apps' : activeCategory}
            </span>
            <span className="text-[10px] text-zinc-600 ml-auto">{displayedApps.length} apps</span>
          </div>

          {/* App Grid — 5 columns, proper spacing */}
          <div className="grid grid-cols-5 gap-2 pb-2">
            {displayedApps.map(app => {
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => { openWindow(app.id); toggleStartMenu(); }}
                  onContextMenu={(e) => handleAppRightClick(e, app.id)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors group hover:bg-white/5 border border-transparent hover:border-white/5"
                >
                  <div className="w-11 h-11 bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-accent/40 group-hover:shadow-[0_4px_15px_rgba(var(--nx-accent-rgb),0.2)] transition-all">
                    <Icon size={20} className="text-zinc-300 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] font-medium text-zinc-400 text-center line-clamp-1 w-full px-0.5 group-hover:text-accent transition-colors">
                    {app.name}
                  </span>
                </button>
              );
            })}
          </div>

          {displayedApps.length === 0 && (
            <div className="col-span-5 text-center py-16 flex flex-col items-center gap-3">
              <Search size={28} className="text-zinc-600" />
              <div className="text-xs text-zinc-500 uppercase tracking-widest">No apps found</div>
            </div>
          )}
        </div>
      </div>

      {/* Footer — Profile + System Controls */}
      <div className="bg-black/40 backdrop-blur-xl px-4 py-3 border-t border-white/10 flex items-center justify-between shrink-0 relative z-20">
        <button
          className="flex items-center gap-3 hover:bg-white/5 p-2 -ml-2 rounded-xl transition-colors group"
          onClick={() => { openWindow('settings'); toggleStartMenu(); }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-base font-bold text-black border-2 border-[#08080c] group-hover:scale-105 transition-transform">
            {currentUser?.name?.[0] || <User size={20} />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{currentUser?.name || "Admin"}</span>
              <Shield size={11} className="text-emerald-500" />
            </div>
            <span className="text-[9px] text-zinc-500 font-mono tracking-wider flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AUTHENTICATED
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 p-1.5 bg-black/60 rounded-xl border border-white/10">
          <button
            onClick={() => { lockShell(); toggleStartMenu(); }}
            className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Lock"
          >
            <Lock size={16} />
          </button>
          <button
            onClick={() => { openWindow('appstore'); toggleStartMenu(); }}
            className="w-9 h-9 flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-300 rounded-lg text-zinc-400 transition-colors"
            title="App Store"
          >
            <Store size={16} />
          </button>
          <button
            onClick={() => { logout(); toggleStartMenu(); }}
            className="w-9 h-9 flex items-center justify-center hover:bg-amber-500/20 hover:text-amber-400 rounded-lg text-zinc-400 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-0.5" />
          <button
            onClick={() => systemReset(false)}
            className="w-9 h-9 flex items-center justify-center bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg text-red-400 transition-colors"
            title="Restart"
          >
            <Power size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
