import React, { useState, useMemo } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem'; 
import { 
    Power, Search, LogOut, Settings, User, X, Clock, FolderOpen, Lock
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

  // Categories Mapping
  const CATEGORIES: Record<string, string[]> = {
    'All': [],
    'System': ['dashboard', 'settings', 'monitor', 'task_manager', 'clipboard', 'notifications', 'device_manager', 'recycle_bin'],
    'AI & Dev': ['hyperide', 'forge', 'daemon_chat', 'aion_agent', 'model_manager', 'nfr', 'terminal', 'ubuntu', 'snippets'],
    'Media': ['paint', 'video_player', 'image_viewer', 'music', 'wallpaper', 'fractal'],
    'Productivity': ['notepad', 'explorer', 'calculator', 'calendar', 'rich_editor', 'kanban', 'pomodoro', 'habits', 'contacts'],
    'Utilities': ['appstore', 'silence', 'native_zip', 'sticky_notes', 'vault', 'voice_recorder', 'markdown', 'rss', 'accessibility', 'screenshot', 'sysinfo', 'weather']
  };

  const categoriesList = Object.keys(CATEGORIES);

  // Filter apps
  const displayedApps = registry.filter(app => {
    if (!installedApps.includes(app.id)) return false;
    if (app.hidden) return false;
    if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory !== 'All' && !search) {
      // Find category
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
      className="fixed bottom-16 left-4 z-[9990] w-[640px] max-w-[calc(100vw-32px)] h-[720px] max-h-[calc(80vh-60px)] bg-[#050508]/80 backdrop-blur-[40px] border border-white/10 rounded-3xl shadow-[0_15px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 zoom-in-95 duration-300 ring-1 ring-white/5"
      onClick={(e) => e.stopPropagation()} 
    >
      
      {/* Search Bar Area */}
      <div className="p-6 pb-4 shrink-0 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
           <div className="relative group z-10">
               <Search className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
               <input 
                  className="w-full bg-[#0A0A0C]/80 backdrop-blur-md border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-base text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
                  placeholder="Ask DAEMON or search system nodes..."
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   autoFocus
              />
           </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
         {/* Category Pills */}
        <div className="px-6 pt-4 pb-2 flex gap-2 flex-wrap shrink-0">
           {categoriesList.map(cat => (
             <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-zinc-500 hover:text-zinc-300 bg-white/5 hover:bg-white/10 border border-transparent'}`}>
              {cat}
             </button>
          ))}
        </div>

         {/* Main Content */}
        <div className="flex-1 flex flex-col px-6 pb-4 overflow-y-auto custom-scrollbar relative z-10">
           
          {/* Recent Files */}
          {!search && activeCategory === 'All' && recentFiles.length > 0 && (
             <div className="mb-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 mb-3">
                 <Clock size={14} className="text-emerald-500/70" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Recent Artifacts</span>
               </div>
              <div className="grid grid-cols-2 gap-3">
                {recentFiles.map(file => (
                  <button key={file.path} onClick={() => { openWindow('notepad', { path: file.path }); toggleStartMenu(); }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 group text-left shadow-sm">
                     <div className="p-2 bg-black/40 rounded-xl text-zinc-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all shrink-0">{getSmartIcon(file.path, 18)}</div>
                     <div className="min-w-0">
                       <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{file.name}</div>
                       <div className="text-[9px] font-mono text-zinc-600 truncate mt-0.5">{new Date(file.modified).toLocaleTimeString()}</div>
                     </div>
                  </button>
                 ))}
              </div>
             </div>
          )}

          {/* App Grid */}
          <div className="flex justify-between items-center mb-4 mt-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <FolderOpen size={14} className="text-blue-500/70" /> {activeCategory === 'All' ? 'System Applications' : activeCategory}
             </span>
          </div>

          <div className="grid grid-cols-5 gap-x-3 gap-y-4">
              {displayedApps.map(app => {
                  const Icon = app.icon;
                  return (
                    <button  
                        key={app.id}
                         onClick={() => { openWindow(app.id); toggleStartMenu(); }}
                         onContextMenu={(e) => handleAppRightClick(e, app.id)}
                        className="flex flex-col items-center gap-2 p-2 rounded-2xl transition-all group outline-none hover:bg-white/[0.03]"
                    >
                         <div className="w-14 h-14 bg-gradient-to-b from-white/10 to-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-emerald-500/50 group-hover:shadow-[0_10px_30px_rgba(16,185,129,0.3)] group-hover:-translate-y-2 transition-all duration-300 relative overflow-hidden backdrop-blur-sm">
                            <Icon size={26} className="text-zinc-300 group-hover:text-white transition-colors drop-shadow-lg z-10" />
                            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                         <span className="text-[10px] font-black text-zinc-400 text-center line-clamp-2 w-full px-1 group-hover:text-emerald-300 transition-colors tracking-wide">{app.name}</span>
                     </button>
                 )
              })}
             {displayedApps.length === 0 && (
                 <div className="col-span-5 text-center py-16 flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <Search size={28} className="text-zinc-600" />
                      </div>
                     <div className="text-sm font-bold text-zinc-400">No nodes match your query</div>
                 </div>
             )}
           </div>
        </div>
      </div>
 
      {/* Footer / Profile / Power Menu */}
       <div className="bg-[#0A0A0C]/90 backdrop-blur-xl p-5 border-t border-white/5 flex items-center justify-between mt-auto shrink-0 relative z-20">
           <button 
              className="flex items-center gap-3 hover:bg-white/5 p-2 -ml-2 rounded-2xl transition-colors cursor-pointer group outline-none" 
              onClick={() => { openWindow('settings'); toggleStartMenu(); }}
          >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center text-lg font-black text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] border-2 border-[#050508] group-hover:scale-110 transition-transform">
                   {currentUser?.name?.[0] || <User size={20}/>}
              </div>
               <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-black text-white tracking-wide group-hover:text-emerald-300 transition-colors">{currentUser?.name || "System Admin"}</span>
                   <span className="text-[9px] text-zinc-500 font-mono tracking-[0.2em] flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     DAEMON.SYNCED
                   </span>
              </div>
          </button>

           <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/10 shadow-inner">
                <button onClick={() => { toggleStartMenu(); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all hover:scale-105" title="Lock Node">
                    <Lock size={16} />
               </button>
               <button onClick={() => { logout(); toggleStartMenu(); }} className="w-10 h-10 flex items-center justify-center hover:bg-amber-500/20 hover:text-amber-400 rounded-xl text-zinc-400 transition-all hover:scale-105" title="Disconnect">
                   <LogOut size={16} />
               </button>
                <div className="w-px h-6 bg-white/10 mx-0.5" />
                <button onClick={() => systemReset(false)}  className="w-10 h-10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 rounded-xl text-zinc-400 transition-all hover:scale-105 group" title="Terminate Core">
                   <Power size={18} className="group-hover:animate-pulse" />
               </button>
           </div>
      </div>
    </div>
  );
}

