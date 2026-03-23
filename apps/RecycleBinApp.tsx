import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { Trash2, RefreshCcw, File, AlertCircle } from 'lucide-react';

export default function RecycleBinApp() {
  const { addNotification } = useOS();
  const [items, setItems] = useState<{name: string, originalName: string, deletedAt: Date}[]>([]);

  const loadTrash = () => {
    const files = vfs.listDir('/home/user/Trash');
    const parsed = files.map(f => {
      // name format: originalName_timestamp
      const parts = f.split('_');
      const ts = parseInt(parts.pop() || '0', 10);
      const originalName = parts.join('_');
      return { 
        name: f, 
        originalName: originalName || f, 
        deletedAt: new Date(ts || Date.now()) 
      };
    }).sort((a,b) => b.deletedAt.getTime() - a.deletedAt.getTime());
    setItems(parsed);
  };

  useEffect(() => {
    loadTrash();
    // Refresh periodically in case files are deleted in background
    const interval = setInterval(loadTrash, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRestore = (item: typeof items[0]) => {
    const success = vfs.move(`/home/user/Trash/${item.name}`, `/home/user/Desktop/${item.originalName}`);
    if (success) {
      addNotification({ title: 'Restored', message: `${item.originalName} restored to Desktop`, type: 'success' });
      loadTrash();
    } else {
      addNotification({ title: 'Error', message: 'Failed to restore file', type: 'error' });
    }
  };

  const handlePermanentDelete = (item: typeof items[0]) => {
    vfs.delete(`/home/user/Trash/${item.name}`);
    loadTrash();
  };

  const handleEmptyTrash = () => {
    if (!confirm('Are you sure you want to permanently delete all items?')) return;
    items.forEach(i => vfs.delete(`/home/user/Trash/${i.name}`));
    addNotification({ title: 'Trash Emptied', message: 'All items permanently removed.', type: 'info' });
    loadTrash();
  };

  return (
    <div className="flex flex-col h-full bg-[#111] text-zinc-300 font-sans overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
            <Trash2 size={24} className="text-zinc-400" />
            <div>
              <div className="text-white font-bold text-sm">Recycle Bin</div>
              <div className="text-xs text-zinc-500">{items.length} items</div>
            </div>
        </div>
        
        <button 
          onClick={handleEmptyTrash} 
          disabled={items.length === 0}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <AlertCircle size={16} /> Empty Trash
        </button>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
            <Trash2 size={64} className="mb-4" />
            <div className="text-lg font-bold">Trash is Empty</div>
            <div className="text-sm">Deleted files will appear here.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.name} className="p-4 bg-black/40 border border-white/5 rounded-xl hover:bg-white/5 transition-colors group flex flex-col">
                <div className="flex items-center gap-3 mb-3 text-zinc-300 font-bold text-sm truncate">
                  <File size={20} className="text-zinc-500 shrink-0" />
                  <span className="truncate">{item.originalName}</span>
                </div>
                
                <div className="text-xs text-zinc-500 mb-4 font-mono">
                  Deleted: {item.deletedAt.toLocaleString()}
                </div>
                
                <div className="mt-auto flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleRestore(item)}
                    className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1"
                  >
                    <RefreshCcw size={12} /> Restore
                  </button>
                  <button 
                    onClick={() => handlePermanentDelete(item)}
                    className="flex-1 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
