import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { Search, HardDrive, Filter, X, File as FileIcon, Terminal } from 'lucide-react';
import { eventBus } from '../kernel/eventBus';
import { vfs } from '../kernel/fileSystem';

export default function GlobalSearch() {
  const { isSearchOpen, toggleSearch, openWindow } = useOS();
  const [query, setQuery] = useState('');
  const [vfsResults, setVfsResults] = useState<{ path: string, name: string }[]>([]);
  const [hostResults, setHostResults] = useState<string[]>([]);
  const [isSearchingHost, setIsSearchingHost] = useState(false);
  const [isCommandMode, setIsCommandMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setVfsResults([]);
      setHostResults([]);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setVfsResults([]);
      setHostResults([]);
      setIsCommandMode(false);
      return;
    }

    if (query.startsWith('/') || query.startsWith('>')) {
      setIsCommandMode(true);
      return;
    } else {
      setIsCommandMode(false);
    }

    // VFS Search
    const foundVfs: {path:string, name:string}[] = [];
    const walkVfs = (dirPath: string) => {
       const node = vfs.resolveNode(dirPath);
       if (!node || node.type !== 'directory' || !node.children) return;
       for (const [name, child] of Object.entries(node.children as any)) {
           const childNode = child as { type: string };
           const fullPath = dirPath === '/' ? `/${name}` : `${dirPath}/${name}`;
           if (name.toLowerCase().includes(query.toLowerCase())) {
               foundVfs.push({ path: fullPath, name });
           }
           if (childNode.type === 'directory') walkVfs(fullPath);
       }
    };
    walkVfs('/');
    setVfsResults(foundVfs.slice(0, 10)); // max 10

    // Native Search
    if (window.electron && window.electron.invoke) {
        setIsSearchingHost(true);
        window.electron.invoke('native-search', query)
          .then(res => {
              setHostResults(res || []);
              setIsSearchingHost(false);
          })
          .catch(() => setIsSearchingHost(false));
    }
  }, [query]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={toggleSearch} />

      <div className="relative w-full max-w-2xl bg-black/80 border border-white/20 rounded-2xl shadow-2xl flex flex-col font-sans overflow-hidden" 
           style={{ boxShadow: '0 0 50px rgba(16, 185, 129, 0.1)' }}>
        
        {/* Search Bar */}
        <div className={`flex items-center gap-3 p-4 border-b ${isCommandMode ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10'}`}>
          {isCommandMode ? <Terminal size={24} className="text-emerald-500" /> : <Search size={24} className="text-emerald-500" />}
          <input 
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isCommandMode && query.length > 2) {
                eventBus.emit('daemon:command', query.substring(1));
                toggleSearch();
              }
            }}
            placeholder="Search VFS, Host, or type / to command DAEMON..."
            className={`flex-1 bg-transparent border-none outline-none text-xl font-light placeholder-white/30 ${isCommandMode ? 'text-emerald-400 font-mono tracking-widest' : 'text-white'}`}
          />
          {query && <button onClick={() => setQuery('')} className="p-1 rounded hover:bg-white/10 text-white/50"><X size={20}/></button>}
        </div>

        {/* Results Area */}
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
           {query.length >= 2 ? (
              <div className="p-2 space-y-4">
                 {/* VFS Results */}
                 {vfsResults.length > 0 && (
                     <div>
                        <div className="px-3 py-1 text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                           <HardDrive size={14} /> Virtual File System (NexusOS)
                        </div>
                        {vfsResults.map(res => (
                            <button 
                              key={res.path} 
                              onClick={() => { toggleSearch(); openWindow('notepad', { title: res.name, file: res.path }); }}
                              className="w-full text-left p-3 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors group"
                            >
                               <FileIcon size={18} className="text-white/50 group-hover:text-emerald-400 shrink-0" />
                               <div className="truncate">
                                  <div className="text-white font-medium truncate">{res.name}</div>
                                  <div className="text-xs text-white/40 font-mono truncate">{res.path}</div>
                               </div>
                            </button>
                        ))}
                     </div>
                 )}

                 {/* Native Host Results */}
                 {(isSearchingHost || hostResults.length > 0) && (
                     <div>
                        <div className="px-3 py-1 text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                           <Filter size={14} /> Physical Host (Windows Desktop)
                        </div>
                        {isSearchingHost && <div className="px-3 py-2 text-sm text-white/50 animate-pulse">Scanning native host...</div>}
                        {hostResults.map(p => {
                            const name = p.split('\\').pop() || p;
                            return (
                               <div key={p} className="w-full text-left p-3 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors group">
                                  <FileIcon size={18} className="text-blue-500/50 group-hover:text-blue-400 shrink-0" />
                                  <div className="truncate">
                                     <div className="text-white font-medium truncate">{name}</div>
                                     <div className="text-xs text-white/40 font-mono truncate">{p}</div>
                                  </div>
                               </div>
                            );
                        })}
                     </div>
                 )}

                 {isCommandMode && (
                     <div className="p-8 text-center text-emerald-500/80 font-mono flex flex-col items-center">
                        <Terminal size={48} className="mb-4 opacity-50 animate-pulse" />
                        <div>Neural link established.</div>
                        <div className="text-xs opacity-60 mt-2">Press ENTER to send directive to DAEMON.</div>
                     </div>
                 )}

                 {!isSearchingHost && !isCommandMode && vfsResults.length === 0 && hostResults.length === 0 && (
                     <div className="p-8 text-center text-white/40">No results found for "{query}"</div>
                 )}
              </div>
           ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center text-white/30">
                 {isCommandMode ? <Terminal size={48} className="mb-4 opacity-50" /> : <Search size={48} className="mb-4 opacity-50" />}
                 <div className="text-lg">Start typing to search NexusOS and Host</div>
                 <div className="text-sm mt-2 opacity-70">Type <span className="text-emerald-400 font-mono">/</span> to command the autonomous DAEMON.</div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
