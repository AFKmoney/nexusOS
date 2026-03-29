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

  // Recent files (mocked by sorting use r dir by modified)
  // MUST be before any co nditional return to satisfy React hooks rules 
  const recentFiles = useMemo(() => {
    if (!isStartMenuOpen) return [];
    const list = vfs.listDir('/home/user');
    return list 
      .map(f => {
        const fullPath = `/home/user/${f}`;
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
    'System': ['dashboard', 'settings', 'monitor', 'task_manager', 'clipboard', 'notifications'],
    'AI & Dev': ['hyperide', 'forge', 'daemon_chat', 'aion_agent', 'model_manager', 'nfr', 'terminal', 'ubuntu', 'snippets'],
    'Media': ['paint', 'video_player', 'image_viewer', 'music'],
    'Productivity': ['notepad', 'explorer', 'calculator', 'calendar', 'rich_editor', 'kanban', 'pomodoro', 'habits', 'contacts']
  };

  const categoriesList = Object.keys(CATEGORIES);

  // Filter apps
  const displayedApps = registry.filter(app => {
    if (!installedApps.includes(app.id)) return false;
    if (app.hidden) return false;
    if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory !== 'All' && !search) {
      // Find category
      const inCat = CATEGORIES[activeCategory].includes(app.id);
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
      className="fixed bottom-14 left-4 z-[9990] w-[600px] max-w-[calc(100vw-32px)] h-[680px] max-h-[calc(80vh-60px)] bg-[#09090b]/95 backdrop-blur-3xl border border-white/5 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 duration-200 ring-1 ring-white/5"
      onClick={(e) => e.stopPropagation()} 
    >
      
      {/* Search Bar Area */}
      <div className="p-6 pb-4 shrink-0 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
           <div className="relative group">
               <Search className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
               <input 
                  className="w-full bg-[#18181b] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-base text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:bg-[#202024] transition-all placeholder:text-zinc-500 shadow-inner"
                  placeholder="Ask DAEMON or search apps, files, settings..."
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   autoFocus
              />
           </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
         {/* Category Pills — horizontal, no scroll needed */}
        <div className="px-6 pt-4 pb-2 flex gap-2 flex-wrap shrink-0">
           {categoriesList.map(cat => (
             <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === cat ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'text-zinc-500 hover:text-zinc-300 bg-white/3 hover:bg-white/8 border border-transparent'}`}>
              {cat}
             </button>
          ))}
        </div>

         {/* Main Content */}
        <div className="flex-1 flex flex-col px-6 pb-4 overflow-y-auto custom-scrollbar bg-[#0A0A0C]">
           
          {/* Recent Files Section (only show if not searching and in 'All' category) */}
          {!search && activeCategory === 'All' && recentFiles.length > 0 && (
             <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 mb-3">
                 <Clock size={14} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recent Files</span>
               </div>
              <div className="grid grid-cols-2 gap-2">
                {recentFiles.map(file => (
                  <button key={file.path} onClick={() => { openWindow('notepad', { path: file.path }); toggleStartMenu(); }}
                    className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition group text-left">
                     <div className="text-zinc-400 group-hover:text-emerald-400 transition-colors shrink-0">{getSmartIcon(file.path, 24)}</div>
                     <div className="min-w-0">
                       <div className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{file.name}</div>
                       <div className="text-[10px] text-zinc-500 truncate">{new Date(file.modified).toLocaleString()}</div>
                     </div>
                  </button>
                 ))}
              </div>
             </div>
          )}

          {/* App Grid */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <FolderOpen size={14} className="text-zinc-500" /> {activeCategory === 'All' ? 'All Apps' : activeCategory}
             </span>
          </div>

          <div className="grid grid-cols-5 gap-x-2 gap-y-3">
              {displayedApps.map(app => {
                  const Icon = app.icon;
                  return (
                    <button  
                        key={app.id}
                         onClick={() => { openWindow(app.id); toggleStartMenu(); }}
                         onContextMenu={(e) => handleAppRightClick(e, app.id)}
                        className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-white/5 transition-all group outline-none"
                    >
                         <div className="w-12 h-12 bg-gradient-to-b from-[#1E1E22] to-[#121214] rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-emerald-500/40 group-hover:shadow-[0_4px_25px_rgba(16,185,129,0.15)] group-hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                            <Icon size={22} className="text-zinc-300 group-hover:text-emerald-400 transition-colors drop-shadow-md" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                        </div>
                         <span className="text-[11px] text-zinc-400 font-medium text-center line-clamp-2 w-full px-1 group-hover:text-zinc-100 transition-colors">{app.name}</span>
                     </button>
                 )
              })}
             {displayedApps.length === 0 && (
                 <div className="col-span-5 text-center text-zinc-600 py-12 flex flex-col items-center gap-2">
                      <Search size={32} className="opacity-20" />
                     <div className="text-sm font-medium">No matches found</div>
                 </div>
             )}
           </div>
        </div>
      </div>
 
      {/* Footer / Profile / Power Menu */}
       <div className="bg-[#0c0c0e]/95 p-5 border-t border-white/5 flex items-center justify-between mt-auto shrink-0 relative">
           <button 
              className="flex items-center gap-3 hover:bg-white/5 px-3 py-2 -ml-2 rounded-xl transition-colors cursor-pointer group outline-none" 
              onClick={() => { openWindow('settings'); toggleStartMenu(); }}
          >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-base font-bold text-white shadow-lg border border-white/20 group-hover:border-emerald-400 transition-all">
                   {currentUser?.name?.[0] || <User size={16}/>}
              </div>
               <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-bold text-zinc-100 group-hover:text-white leading-none">{currentUser?.name || "System Admin"}</span>
                   <span className="text-[10px] text-zinc-500 font-mono tracking-wider">DAEMON.AUTH_OK</span>
              </div>
          </button>

           <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/5">
                <button onClick={() => { /* Implement screen lock */ toggleStartMenu(); }} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors" title="Lock Screen">
                    <Lock size={16} />
               </button>
               <button onClick={() => { logout(); toggleStartMenu(); }} className="w-10 h-10 flex items-center justify-center hover:bg-amber-500/10 hover:text-amber-400 rounded-xl text-zinc-400 transition-colors" title="Sign Out">
                   <LogOut size={16} />
               </button>
                <button onClick={() => systemReset(false)}  className="w-10 h-10 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 rounded-xl text-zinc-400 transition-colors" title="Shut Down">
                   <Power size={16} />
               </button>
           </div>
      </div>
    </div>
  );
} 