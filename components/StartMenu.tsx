import React, { useState, useMemo } from 'rea ct';
import { useOS } from '../store/osStore' ;
import { vfs } from '../kernel/fileSystem'; 
import { 
    Power, Search, LogOut, Setting s, User, X, Clock, FolderOpen, Lock
} from 'l ucide-react';
import { getSmartIcon } from '. ./utils/smartIcons';

export default function  StartMenu() {
  const { isStartMenuOpen, reg istry, installedApps, openWindow, systemReset , currentUser, logout, openContextMenu, toggl eStartMenu } = useOS();
  const [search, setS earch] = useState('');
  const [activeCategor y, setActiveCategory] = useState<string>('All ');

  // Recent files (mocked by sorting use r dir by modified)
  // MUST be before any co nditional return to satisfy React hooks rules 
  const recentFiles = useMemo(() => {
    if  (!isStartMenuOpen) return [];
    const list  = vfs.listDir('/home/user');
    return list 
      .map(f => {
        const fullPath = ` /home/user/${f}`;
        const stat = vfs.st at(fullPath);
        return { name: f, path:  fullPath, modified: stat?.modified || 0, typ e: stat?.type };
      })
      .filter(n =>  n.type === 'file')
      .sort((a, b) => b.mo dified - a.modified)
      .slice(0, 4);
  },  [isStartMenuOpen]);

  if (!isStartMenuOpen)  return null;

  // Categories Mapping
  cons t CATEGORIES: Record<string, string[]> = {
     'All': [],
    'System': ['dashboard', 'set tings', 'monitor', 'task_manager', 'clipboard ', 'notifications'],
    'AI & Dev': ['hyperi de', 'forge', 'daemon_chat', 'aion_agent', 'm odel_manager', 'nfr', 'terminal', 'ubuntu', ' snippets'],
    'Media': ['paint', 'video_pla yer', 'image_viewer', 'music'],
    'Producti vity': ['notepad', 'explorer', 'calculator',  'calendar', 'rich_editor', 'kanban', 'pomodor o', 'habits', 'contacts']
  };

  const categ oriesList = Object.keys(CATEGORIES);

  // Fi lter apps
  const displayedApps = registry.fi lter(app => {
    if (!installedApps.includes (app.id)) return false;
    if (app.hidden) r eturn false;
    if (search && !app.name.toLo werCase().includes(search.toLowerCase())) ret urn false;
    if (activeCategory !== 'All' & & !search) {
      // Find category
      con st inCat = CATEGORIES[activeCategory].include s(app.id);
      if (!inCat) return false;
     }
    return true;
  });

  const handleApp RightClick = (e: React.MouseEvent, appId: str ing) => {
      e.preventDefault(); e.stopPro pagation();
      openContextMenu({ isOpen: t rue, x: e.clientX, y: e.clientY, targetType:  'app-icon', appId: appId });
  };
  return (
     <div 
      className="fixed bottom-14 le ft-4 z-[9990] w-[600px] max-w-[calc(100vw-32p x)] h-[680px] max-h-[calc(80vh-60px)] bg-[#09 090b]/95 backdrop-blur-3xl border border-whit e/5 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0 .8)] flex flex-col overflow-hidden animate-in  slide-in-from-bottom-5 zoom-in-95 duration-2 00 ring-1 ring-white/5"
      onClick={(e) =>  e.stopPropagation()} 
    >
      
      {/*  Search Bar Area */}
      <div className="p- 6 pb-4 shrink-0 border-b border-white/5 bg-gr adient-to-b from-white/5 to-transparent">
           <div className="relative group">
               <Search className="absolute left-4 t op-3.5 text-zinc-500 group-focus-within:text- emerald-400 transition-colors" size={20} />
               <input 
                  classN ame="w-full bg-[#18181b] border border-white/ 10 rounded-2xl py-3 pl-12 pr-4 text-base text -zinc-200 focus:outline-none focus:ring-1 foc us:ring-emerald-500/50 focus:bg-[#202024] tra nsition-all placeholder:text-zinc-500 shadow- inner"
                  placeholder="Ask DAE MON or search apps, files, settings..."
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   autoFocus
              />
           </div>
      </div>

      <div class Name="flex-1 flex flex-col overflow-hidden">
         {/* Category Pills — horizontal, no  scroll needed */}
        <div className="px -6 pt-4 pb-2 flex gap-2 flex-wrap shrink-0">
           {categoriesList.map(cat => (
             <button key={cat} onClick={() => setAct iveCategory(cat)}
              className={`p x-3 py-1.5 rounded-full text-xs font-bold tra nsition-all ${activeCategory === cat ? 'bg-em erald-500/20 text-emerald-400 border border-e merald-500/30 shadow-[0_0_10px_rgba(16,185,12 9,0.15)]' : 'text-zinc-500 hover:text-zinc-30 0 bg-white/3 hover:bg-white/8 border border-t ransparent'}`}>
              {cat}
             </button>
          ))}
        </div>

         {/* Main Content */}
        <div class Name="flex-1 flex flex-col px-6 pb-4 overflow -y-auto custom-scrollbar bg-[#0A0A0C]">
           
          {/* Recent Files Section (onl y show if not searching and in 'All' category ) */}
          {!search && activeCategory == = 'All' && recentFiles.length > 0 && (
             <div className="mb-6 animate-in fade-in  slide-in-from-bottom-2">
              <div  className="flex items-center gap-2 mb-3">
                 <Clock size={14} className="text -zinc-500" />
                <span className ="text-xs font-bold text-zinc-400 uppercase t racking-widest">Recent Files</span>
               </div>
              <div className="gri d grid-cols-2 gap-2">
                {recent Files.map(file => (
                  <button  key={file.path} onClick={() => { openWindow( 'notepad', { path: file.path }); toggleStartM enu(); }}
                    className="flex  items-center gap-3 p-2 bg-white/5 hover:bg-w hite/10 rounded-xl border border-white/5 tran sition group text-left">
                     <div className="text-zinc-400 group-hover:tex t-emerald-400 transition-colors shrink-0">{ge tSmartIcon(file.path, 24)}</div>
                     <div className="min-w-0">
                       <div className="text-sm font-mediu m text-zinc-200 truncate group-hover:text-whi te transition-colors">{file.name}</div>
                       <div className="text-[10px]  text-zinc-500 truncate">{new Date(file.modifi ed).toLocaleString()}</div>
                     </div>
                  </button>
                 ))}
              </div>
             </div>
          )}

          {/* App Grid  */}
          <div className="flex justify-be tween items-center mb-3">
            <span c lassName="text-xs font-bold text-zinc-400 upp ercase tracking-widest flex items-center gap- 2">
              <FolderOpen size={14} class Name="text-zinc-500" /> {activeCategory === ' All' ? 'All Apps' : activeCategory}
             </span>
          </div>

          <div c lassName="grid grid-cols-5 gap-x-2 gap-y-3">
              {displayedApps.map(app => {
                  const Icon = app.icon;
                  return (
                    <button  
                        key={app.id}
                         onClick={() => { openWindow( app.id); toggleStartMenu(); }}
                         onContextMenu={(e) => handleAppRigh tClick(e, app.id)}
                        cl assName="flex flex-col items-center gap-2 p-2  rounded-2xl hover:bg-white/5 transition-all  group outline-none"
                    >
                         <div className="w-12 h-1 2 bg-gradient-to-b from-[#1E1E22] to-[#121214 ] rounded-2xl flex items-center justify-cente r border border-white/10 group-hover:border-e merald-500/40 group-hover:shadow-[0_4px_25px_ rgba(16,185,129,0.15)] group-hover:-translate -y-1 transition-all duration-300 relative ove rflow-hidden">
                            <I con size={22} className="text-zinc-300 group- hover:text-emerald-400 transition-colors drop -shadow-md" />
                            <d iv className="absolute inset-0 bg-gradient-to -t from-black/20 to-transparent pointer-event s-none" />
                        </div>
                         <span className="text-[1 1px] text-zinc-400 font-medium text-center li ne-clamp-2 w-full px-1 group-hover:text-zinc- 100 transition-colors">{app.name}</span>
                     </button>
                 )
              })}
             {displayedApps. length === 0 && (
                 <div class Name="col-span-5 text-center text-zinc-600 py -12 flex flex-col items-center gap-2">
                      <Search size={32} className="o pacity-20" />
                     <div class Name="text-sm font-medium">No matches found</ div>
                 </div>
             )}
           </div>
        </div>
      </div>
 
      {/* Footer / Profile / Power Menu */}
       <div className="bg-[#0c0c0e]/95 p-5 bor der-t border-white/5 flex items-center justif y-between mt-auto shrink-0 relative">
           <button 
              className="flex ite ms-center gap-3 hover:bg-white/5 px-3 py-2 -m l-2 rounded-xl transition-colors cursor-point er group outline-none" 
              onClick ={() => { openWindow('settings'); toggleStart Menu(); }}
          >
              <div cla ssName="w-10 h-10 rounded-full bg-gradient-to -br from-emerald-500 to-teal-700 flex items-c enter justify-center text-base font-bold text -white shadow-lg border border-white/20 group -hover:border-emerald-400 transition-all">
                   {currentUser?.name?.[0] || <U ser size={16}/>}
              </div>
               <div className="flex flex-col items-st art gap-0.5">
                  <span classNa me="text-sm font-bold text-zinc-100 group-hov er:text-white leading-none">{currentUser?.nam e || "System Admin"}</span>
                   <span className="text-[10px] text-zinc-500 f ont-mono tracking-wider">DAEMON.AUTH_OK</span >
              </div>
          </button>

           <div className="flex items-center ga p-1.5 p-1 bg-black/40 rounded-2xl border bord er-white/5">
                <button onClick= {() => { /* Implement screen lock */ toggleSt artMenu(); }} className="w-10 h-10 flex items -center justify-center hover:bg-white/10 roun ded-xl text-zinc-400 hover:text-white transit ion-colors" title="Lock Screen">
                    <Lock size={16} />
               </bu tton>
               <button onClick={() => {  logout(); toggleStartMenu(); }} className="w -10 h-10 flex items-center justify-center hov er:bg-amber-500/10 hover:text-amber-400 round ed-xl text-zinc-400 transition-colors" title= "Sign Out">
                   <LogOut size={ 16} />
               </button>
                <button onClick={() => systemReset(false)}  className="w-10 h-10 flex items-center justif y-center hover:bg-red-500/20 hover:text-red-4 00 rounded-xl text-zinc-400 transition-colors " title="Shut Down">
                   <Powe r size={16} />
               </button>
           </div>
      </div>
    </div>
  );
} 