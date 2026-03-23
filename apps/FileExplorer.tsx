import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { Folder, ArrowLeft, RefreshCw, HardDrive, Search, Loader2, X, Sparkles, LayoutGrid, List as ListIcon, FileText, Image as ImageIcon, Code, Box, ChevronRight, Home, Layout, Files } from 'lucide-react';
import { getSmartIcon } from '../utils/smartIcons';
import { aiService } from '../services/puterService';

export default function FileExplorerApp({ windowId }: { windowId: string }) {
  const { openWindow, updateWindow, windows, openContextMenu, kernelRules } = useOS();
  const win = windows.find(w => w.id === windowId);
  const currentPath = win?.data?.path || '/home/user';
  
  const [items, setItems] = useState<string[]>([]);
  const [metadataMap, setMetadataMap] = useState<{[key:string]: any}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const refresh = () => {
    if (searchQuery && !isAiSearching) return;
    
    // Safety check if directory was removed while open
    if (!vfs.stat(currentPath)) {
      navigate('/home/user');
      return;
    }
    
    const list = vfs.listDir(currentPath);
    setItems(list);
    
    const metas: any = {};
    list.forEach(name => {
        const fullPath = `${currentPath === '/' ? '' : currentPath}/${name}`;
        const node = vfs.stat(fullPath);
        if (node) {
            let info = { type: node.type, size: 0, date: new Date(node.modified).toLocaleString() };
            if (node.type === 'file') info.size = node.content?.length || 0;
            else { const stat = vfs.getStats(fullPath); info.size = stat?.size || 0; }
            metas[name] = { 
                summary: node.summary, 
                smartLabel: node.smartLabel,
                info
            };
        }
    });
    setMetadataMap(metas);
    if (!list.includes(selectedItem || '')) setSelectedItem(null);
  };

  useEffect(() => {
    if (!searchQuery) {
        refresh();
        const interval = setInterval(refresh, 2000);
        return () => clearInterval(interval);
    }
  }, [currentPath, searchQuery]);

  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!searchQuery.trim()) { refresh(); return; }
      setIsAiSearching(true);
      const allFiles = vfs.listDir(currentPath);
      try {
          const fileContext = allFiles.map(f => {
              const stat = vfs.stat(`${currentPath}/${f}`);
              return { name: f, type: stat?.type };
          });
          const prompt = `Filter the file list based on query: "${searchQuery}". Context: ${JSON.stringify(fileContext)}. Return ONLY a JSON array of matched filenames.`;
          const res = await aiService.generateOnce(prompt, kernelRules, 'json');
          let matches = JSON.parse(res.replace(/```json|```/g, '').trim());
          if (Array.isArray(matches)) {
              const allFilesSet = new Set(allFiles);
              setItems(matches.filter(m => typeof m === 'string' && allFilesSet.has(m)));
          }
          else setItems(allFiles.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase())));
      } catch (e) {
          setItems(allFiles.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase())));
      } finally { setIsAiSearching(false); }
  };

  const clearSearch = () => { setSearchQuery(''); refresh(); };

  const navigate = (dir: string) => {
    let newPath = '';
    if (dir === '..') newPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    else if (dir.startsWith('/')) newPath = dir;
    else newPath = `${currentPath === '/' ? '' : currentPath}/${dir}`;
    updateWindow(windowId, { data: { ...win?.data, path: newPath } });
    setSearchQuery(''); setSelectedItem(null);
  };

  const handleOpen = (item: string) => {
    const fullPath = `${currentPath === '/' ? '' : currentPath}/${item}`;
    const node = vfs.stat(fullPath);
    if (node?.type === 'directory') navigate(item);
    else {
      if (item.endsWith('.png') || item.endsWith('.jpg')) openWindow('image_viewer', { path: fullPath });
      else if (item.endsWith('.mp4')) openWindow('video_player', { path: fullPath });
      else if (item.endsWith('.html')) openWindow('web_runner', { path: fullPath });
      else openWindow('notepad', { path: fullPath });
    }
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: string) => {
    e.preventDefault(); e.stopPropagation();
    const fullPath = `${currentPath === '/' ? '' : currentPath}/${item}`;
    setSelectedItem(item);
    openContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, targetType: 'icon', filePath: fullPath });
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: string) => {
    const fullPath = `${currentPath === '/' ? '' : currentPath}/${item}`;
    e.dataTransfer.setData('text/plain', fullPath);
  };
  const handleDrop = (e: React.DragEvent, targetItem?: string) => {
    e.preventDefault();
    const oldPath = e.dataTransfer.getData('text/plain');
    if (!oldPath) return;
    const destPath = targetItem 
      ? (`${currentPath === '/' ? '' : currentPath}/${targetItem}`)
      : currentPath;
    
    const node = vfs.stat(destPath);
    if (node?.type === 'directory' && oldPath !== destPath && !destPath.startsWith(oldPath)) {
      vfs.move(oldPath, `${destPath}/${oldPath.split('/').pop()}`);
      refresh();
    }
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);
  
  const selectedNode = selectedItem ? vfs.stat(`${currentPath === '/' ? '' : currentPath}/${selectedItem}`) : null;

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-200 font-sans">
      {/* Header Bar */}
      <div className="flex items-center gap-3 p-2 border-b border-white/5 bg-black/40 shrink-0">
        <div className="flex gap-1">
          <button onClick={() => navigate('..')} disabled={currentPath === '/' || !!searchQuery} className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 text-zinc-400 hover:text-white transition"><ArrowLeft size={16} /></button>
          <button onClick={() => refresh()} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition"><RefreshCw size={16} className={isAiSearching ? 'animate-spin opacity-50' : ''} /></button>
        </div>
        
        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-1 text-sm bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-white/5 text-zinc-400 overflow-x-auto no-scrollbar">
          <button onClick={() => navigate('/')} className="hover:text-white transition shrink-0"><HardDrive size={14} /></button>
          {breadcrumbs.map((crumb, i) => {
            const path = '/' + breadcrumbs.slice(0, i + 1).join('/');
            return (
              <React.Fragment key={path}>
                <ChevronRight size={12} className="shrink-0 opacity-50 mx-1" />
                <button onClick={() => navigate(path)} className="hover:text-white truncate max-w-[120px] transition">{crumb}</button>
              </React.Fragment>
            );
          })}
        </div>

        <form onSubmit={handleSearch} className="w-64 relative group">
          <div className="absolute left-2.5 top-1.5 flex items-center pointer-events-none">
              {isAiSearching ? <Loader2 size={14} className="text-cyan-400 animate-spin" /> : <Sparkles size={14} className={`transition-colors ${searchQuery ? 'text-cyan-400' : 'text-zinc-600'}`} />}
          </div>
          <input className="w-full bg-zinc-900 border border-white/5 rounded-lg pl-8 pr-7 py-1 text-sm outline-none focus:border-cyan-400/50 transition-all text-white placeholder:text-zinc-600" placeholder="Neural Query..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button type="button" onClick={clearSearch} className="absolute right-2 top-1.5 text-zinc-500 hover:text-white"><X size={14} /></button>}
        </form>

        <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg border border-white/5 p-0.5">
          <button onClick={() => setViewMode('grid')} className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid size={14} /></button>
          <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><ListIcon size={14} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-black/20 border-r border-white/5 flex flex-col p-2 space-y-1">
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-1 mt-2">Favorites</div>
          {[
            { icon: Home, label: 'Home', path: '/home/user' },
            { icon: Layout, label: 'Desktop', path: '/home/user/Desktop' },
            { icon: Box, label: 'System', path: '/system' },
            { icon: Files, label: 'Root', path: '/' },
          ].map(f => (
            <button key={f.path} onClick={() => navigate(f.path)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${currentPath === f.path ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
              <f.icon size={14} /> {f.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0C]" 
          onDragOver={e => e.preventDefault()} 
          onDrop={e => handleDrop(e)} 
          onClick={() => setSelectedItem(null)}>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {searchQuery && !isAiSearching && (
                <div className="mb-4 text-xs font-bold text-cyan-400/80 uppercase tracking-widest flex items-center gap-2">
                    <Search size={14} /> Found {items.length} results
                </div>
            )}

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {items.map(item => {
                  if (typeof item !== 'string') return null;
                  const fullPath = `${currentPath === '/' ? '' : currentPath}/${item}`;
                  const isDir = metadataMap[item]?.info?.type === 'directory';
                  const isSelected = selectedItem === item;
                  return (
                    <div key={item}
                      draggable
                      onDragStart={e => handleDragStart(e, item)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.stopPropagation(); handleDrop(e, item); }}
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                      onDoubleClick={() => handleOpen(item)}
                      onContextMenu={(e) => handleItemContextMenu(e, item)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition cursor-pointer select-none border ${isSelected ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border-transparent hover:bg-white/5'}`}>
                      <div className="relative">
                        {isDir ? <Folder size={48} className="text-blue-500" /> : getSmartIcon(fullPath, 48)}
                      </div>
                      <span className={`text-xs text-center break-words line-clamp-2 w-full ${isSelected ? 'text-white font-medium' : 'text-zinc-400'}`}>{item}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 pb-2 border-b border-white/5 mb-2">
                  <div className="flex-1">Name</div>
                  <div className="w-24 text-right">Date Modified</div>
                  <div className="w-20 text-right">Size</div>
                </div>
                {items.map(item => {
                  if (typeof item !== 'string') return null;
                  const fullPath = `${currentPath === '/' ? '' : currentPath}/${item}`;
                  const meta = metadataMap[item]?.info;
                  const isDir = meta?.type === 'directory';
                  const isSelected = selectedItem === item;
                  return (
                    <div key={item}
                      draggable
                      onDragStart={e => handleDragStart(e, item)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.stopPropagation(); handleDrop(e, item); }}
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                      onDoubleClick={() => handleOpen(item)}
                      onContextMenu={(e) => handleItemContextMenu(e, item)}
                      className={`flex items-center px-4 py-2 rounded-lg transition cursor-pointer select-none ${isSelected ? 'bg-cyan-500/10 text-white' : 'hover:bg-white/5 text-zinc-300'}`}>
                      <div className="flex-1 flex items-center gap-3">
                        {isDir ? <Folder size={18} className="text-blue-500" /> : getSmartIcon(fullPath, 18)}
                        <span className="text-xs truncate">{item}</span>
                      </div>
                      <div className="w-24 text-right text-[10px] text-zinc-500 truncate">{meta?.date}</div>
                      <div className="w-20 text-right text-[10px] text-zinc-500 font-mono">{meta?.size} B</div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {items.length === 0 && !isAiSearching && (
              <div className="flex flex-col items-center justify-center text-zinc-600 py-20 gap-3">
                  <Folder size={40} className="opacity-20" />
                  <span className="text-sm">Folder is empty</span>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {selectedItem && selectedNode && (
          <div className="w-64 bg-zinc-900 border-l border-white/5 p-4 flex flex-col shrink-0 overflow-y-auto">
            <div className="flex justify-center mb-4 p-4 bg-black/40 rounded-xl border border-white/5">
              {selectedNode.type === 'directory' ? <Folder size={64} className="text-blue-500" /> : getSmartIcon(selectedNode.name, 64)}
            </div>
            <div className="text-sm font-bold text-white mb-4 break-all">{selectedNode.name}</div>
            
            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Type</div>
                <div className="text-xs text-zinc-300 capitalize">{selectedNode.type}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Size</div>
                <div className="text-xs text-zinc-300 font-mono">{metadataMap[selectedItem]?.info?.size} Bytes</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Modified</div>
                <div className="text-xs text-zinc-300">{new Date(selectedNode.modified).toLocaleString()}</div>
              </div>
            </div>

            {selectedNode.type === 'file' && selectedNode.content && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Preview</div>
                <div className="bg-black/40 p-2 rounded text-[10px] text-zinc-400 font-mono overflow-hidden line-clamp-6 text-ellipsis whitespace-pre-wrap border border-white/5">
                  {selectedNode.content}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
