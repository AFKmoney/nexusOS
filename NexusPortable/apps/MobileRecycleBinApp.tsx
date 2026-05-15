import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, RefreshCcw, File, AlertCircle, Info } from 'lucide-react';
import { useOS } from '../../store/osStore';
import { vfs } from '../../kernel/fileSystem';
import type { MobileAppProps } from '../types';

export default function MobileRecycleBinApp({ onBack }: MobileAppProps) {
  const { addNotification } = useOS();
  const [items, setItems] = useState<{name: string, originalName: string, deletedAt: Date}[]>([]);

  const loadTrash = () => {
    try {
      if (!vfs.resolveNode('/home/user/Trash')) {
        vfs.createDir('/home/user/Trash');
      }
      const files = vfs.listDir('/home/user/Trash');
      const parsed = files.map(f => {
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
    } catch (e) {
      console.error("Failed to load trash", e);
    }
  };

  useEffect(() => {
    loadTrash();
    const interval = setInterval(loadTrash, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRestore = (item: any) => {
    const success = vfs.move(`/home/user/Trash/${item.name}`, `/home/user/Desktop/${item.originalName}`);
    if (success) {
      addNotification({ title: 'Restored', message: `${item.originalName} moved to Desktop`, type: 'success' });
      loadTrash();
    } else {
      addNotification({ title: 'Error', message: 'Failed to restore file', type: 'error' });
    }
  };

  const handlePermanentDelete = (item: any) => {
    vfs.delete(`/home/user/Trash/${item.name}`);
    loadTrash();
  };

  const handleEmptyTrash = () => {
    // On mobile we might want a custom modal but for now browser confirm is okay if available, 
    // or just execute with a notification.
    if (items.length === 0) return;
    items.forEach(i => vfs.delete(`/home/user/Trash/${i.name}`));
    addNotification({ title: 'Trash Emptied', message: 'All items removed.', type: 'info' });
    loadTrash();
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-zinc-300 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111]/90 backdrop-blur-md border-b border-white/5 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors" onClick={onBack}>
            <ChevronLeft size={24} className="text-white" />
          </button>
          <div>
            <h1 className="text-[15px] font-bold text-white">Recycle Bin</h1>
            <p className="text-[11px] text-zinc-500">{items.length} items</p>
          </div>
        </div>
        <button 
          onClick={handleEmptyTrash}
          disabled={items.length === 0}
          className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-black uppercase tracking-wider active:bg-red-500 active:text-white transition-all disabled:opacity-30"
        >
          Empty
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
              <Trash2 size={40} className="opacity-20" />
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-zinc-500">Trash is Empty</div>
              <p className="text-[11px] opacity-60">Deleted files will appear here</p>
            </div>
          </div>
        ) : (
          items.map(item => (
            <div key={item.name} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                  <File size={20} className="text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">{item.originalName}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    Deleted {item.deletedAt.toLocaleDateString()} at {item.deletedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRestore(item)}
                  className="flex-1 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-400 active:bg-emerald-500 active:text-white transition-all"
                >
                  <RefreshCcw size={14} /> Restore
                </button>
                <button 
                  onClick={() => handlePermanentDelete(item)}
                  className="flex-1 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold text-red-400 active:bg-red-500 active:text-white transition-all"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      {items.length > 0 && (
        <div className="p-4 bg-zinc-900/50 border-t border-white/5">
          <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-zinc-500 leading-tight">
              Items in the Recycle Bin are still occupying space. Emptying the trash will permanently remove them from the system.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
