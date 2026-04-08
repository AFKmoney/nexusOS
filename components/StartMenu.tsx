import React, { useState, useMemo } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem'; 
import { 
    Power, Search, LogOut, Settings, User, X, Clock, FolderOpen, Lock, Shield, Zap, Sparkles
} from 'lucide-react';
import { getSmartIcon } from '../utils/smartIcons';

export default function StartMenu() {
  const { isStartMenuOpen, registry, installedApps, openWindow, systemReset, currentUser, logout, openContextMenu, toggleStartMenu } = useOS();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const recentFiles = useMemo(() => {
    if (!isStartMenuOpen) return [];
    const list = vfs.listDir('/home/user/Desktop');
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
    'System': ['dashboard', 'settings', 'monitor', 'task_manager', 'clipboard', 'notifications', 'device_manager', 'recycle_bin'],
    'AI & Dev': ['hyperide', 'forge', 'daemon_chat', 'aion_agent', 'model_manager', 'nfr', 'terminal', 'ubuntu', 'snippets'],
    'Media': ['paint', 'video_player', 'image_viewer', 'music', 'wallpaper', 'fractal'],
    'Productivity': ['notepad', 'explorer', 'calculator', 'calendar', 'rich_editor', 'kanban', 'pomodoro', 'habits', 'contacts'],
    'Utilities': ['appstore', 'silence', 'native_zip', 'sticky_notes', 'vault', 'voice_recorder', 'markdown', 'rss', 'accessibility', 'screenshot', 'sysinfo', 'weather']
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
      openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'app-icon', appId: appId });
  };

  return (
     <div 
      className="start-menu fixed bottom-20 left-6 z-[9990] w-[780px] max-w-[calc(100vw-48px)] h-[720px] max-h-[calc(90vh-80px)] bg-[#050508]/80 backdrop-blur-[60px] border border-white/10 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 zoom-in-95 duration-500 ring-1 ring-white/10"
      onClick={(e) => e.stopPropagation()} 
    >
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[250px] h-[250px] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
      
      {/* Search Header Spatial */}
      <div className="p-6 pb-4 shrink-0 border-b border-white/5 relative z-10">
           <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
               <Search className="absolute left-4 top-3 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
               <input 
                  className="w-full relative bg-black/60 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700 shadow-inner font-medium tracking-wide"
                  placeholder="Neural Query..."
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   autoFocus
              />
           </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
         {/* Category Navigation Spatial */}
        <div className="px-6 pt-4 pb-2 flex gap-2.5 flex-wrap shrink-0">
           {categoriesList.map(cat => (
             <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeCategory === cat ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105' : 'text-zinc-500 hover:text-zinc-300 bg-white/5 border border-transparent hover:border-white/10'}`}>
              {cat}
             </button>
          ))}
        </div>

         {/* Main Viewport */}
        <div className="flex-1 flex flex-col px-6 pb-4 overflow-y-auto custom-scrollbar relative">
           
          {/* Recent Manifests */}
          {!search && activeCategory === 'All' && recentFiles.length > 0 && (
             <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-2 mb-3">
                 <div className="p-1 bg-emerald-500/10 rounded-md text-emerald-400"><Clock size={12} /></div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Recent Artifacts</span>
               </div>
              <div className="grid grid-cols-2 gap-3">
                {recentFiles.map(file => (
                  <button key={file.path} onClick={() => { openWindow('notepad', { path: file.path }); toggleStartMenu(); }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-500 group text-left shadow-lg">
                     <div className="p-2 bg-black/40 rounded-lg text-zinc-400 group-hover:text-emerald-400 transition-all shrink-0 shadow-inner">{getSmartIcon(file.path, 16)}</div>
                     <div className="min-w-0">
                       <div className="text-[10px] font-black text-zinc-200 truncate group-hover:text-white transition-colors tracking-wide">{file.name}</div>
                       <div className="text-[8px] font-mono text-zinc-600 truncate mt-0.5 uppercase">{new Date(file.modified).toLocaleTimeString()}</div>
                     </div>
                  </button>
                 ))}
              </div>
             </div>
          )}

          {/* App Matrix */}
          <div className="flex justify-between items-center mb-4 mt-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
              {activeCategory === 'All' ? 'Neural Core' : activeCategory}
             </span>
          </div>

          <div className="grid grid-cols-8 gap-2 pb-6">
              {displayedApps.map(app => {
                  const Icon = app.icon;
                  return (
                    <button  
                        key={app.id}
                         onClick={() => { openWindow(app.id); toggleStartMenu(); }}
                         onContextMenu={(e) => handleAppRightClick(e, app.id)}
                        className="flex flex-col items-center gap-1.5 p-1.5 rounded-2xl transition-all duration-500 group outline-none hover:bg-white/[0.03] border border-transparent hover:border-white/5"
                    >
                         <div className="w-10 h-10 bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-emerald-500/50 group-hover:shadow-[0_10px_25px_rgba(16,185,129,0.2)] group-hover:-translate-y-1 transition-all duration-500 relative overflow-hidden backdrop-blur-md">
                            <Icon size={20} className="text-zinc-300 group-hover:text-white transition-all duration-500 drop-shadow-2xl z-10" />
                            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        </div>
                         <span className="text-[8px] font-black text-zinc-500 text-center line-clamp-1 w-full px-1 group-hover:text-emerald-300 transition-colors tracking-widest uppercase">{app.name}</span>
                     </button>
                 )
              })}
             {displayedApps.length === 0 && (
                 <div className="col-span-8 text-center py-16 flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2 border border-white/5">
                        <Search size={24} className="text-zinc-700" />
                      </div>
                     <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Empty Node</div>
                 </div>
             )}
           </div>
        </div>
      </div>
 
      {/* Profile & Logic Controls Spatial */}
       <div className="bg-black/40 backdrop-blur-3xl p-6 border-t border-white/5 flex items-center justify-between mt-auto shrink-0 relative z-20">
           <button 
              className="flex items-center gap-3 hover:bg-white/5 p-2 -ml-2 rounded-2xl transition-all duration-500 cursor-pointer group outline-none" 
              onClick={() => { openWindow('settings'); toggleStartMenu(); }}
          >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-sm font-black text-black shadow-lg border-2 border-[#050508] group-hover:scale-110 transition-all duration-500 relative z-10">
                     {currentUser?.name?.[0] || <User size={18}/>}
                </div>
              </div>
               <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white tracking-wide group-hover:text-emerald-300 transition-colors uppercase">{currentUser?.name || "Admin"}</span>
                    <Shield size={10} className="text-emerald-500" />
                  </div>
                   <span className="text-[8px] text-zinc-600 font-mono tracking-[0.2em] flex items-center gap-1.5">
                     <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                     AUTH_OK
                   </span>
              </div>
          </button>

           <div className="flex items-center gap-2 p-1.5 bg-black/80 rounded-2xl border border-white/10 shadow-2xl">
                <button onClick={() => { toggleStartMenu(); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all shadow-lg" title="Lock">
                    <Lock size={16} />
               </button>
               <button onClick={() => { logout(); toggleStartMenu(); }} className="w-10 h-10 flex items-center justify-center hover:bg-amber-500/20 hover:text-amber-400 rounded-xl text-zinc-400 transition-all shadow-lg" title="Log Out">
                   <LogOut size={16} />
               </button>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button onClick={() => systemReset(false)}  className="w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500 hover:text-black rounded-xl text-red-500 transition-all shadow-lg group" title="Shutdown">
                   <Power size={18} className="group-hover:animate-pulse fill-current" />
               </button>
           </div>
      </div>
    </div>
  );
}
