import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { vfs, SYSTEM_VFS_APP_ID } from '../kernel/fileSystem';
import { Trash2, RotateCcw, X, AlertTriangle, File, Folder } from 'lucide-react';

export default function RecycleBin({ windowId }: { windowId: string }) {
  const { addNotification } = useOS();
  const [items, setItems] = useState<Array<{ name: string; path: string; trashedAt: number | null }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    try {
      setItems(vfs.listTrash());
    } catch (e: any) {
      addNotification({ title: 'Recycle Bin Error', message: e?.message || 'Failed to load', type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const restoreSelected = async () => {
    let count = 0;
    for (const path of selected) {
      const restored = vfs.restoreFromTrash(path);
      if (restored) count++;
    }
    addNotification({ title: 'Restored', message: `${count} item(s) restored to home`, type: 'success' });
    setSelected(new Set());
    refresh();
  };

  const deleteSelected = () => {
    let count = 0;
    for (const path of selected) {
      if (vfs.delete(path, SYSTEM_VFS_APP_ID)) count++;
    }
    addNotification({ title: 'Deleted', message: `${count} item(s) permanently deleted`, type: 'info' });
    setSelected(new Set());
    refresh();
  };

  const emptyBin = () => {
    for (const item of items) {
      vfs.delete(item.path, SYSTEM_VFS_APP_ID);
    }
    addNotification({ title: 'Recycle Bin Emptied', message: `${items.length} item(s) removed`, type: 'info' });
    setSelected(new Set());
    refresh();
  };

  const toggleSelect = (path: string) => {
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.path)));
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-800/50">
            <Trash2 size={20} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Recycle Bin</h1>
            <p className="text-xs text-zinc-500">{items.length} item(s) · {selected.size} selected</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Refresh
          </button>
          {items.length > 0 && (
            <button
              onClick={emptyBin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
            >
              <Trash2 size={14} /> Empty Bin
            </button>
          )}
        </div>
      </div>

      {/* Action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-5 py-2 bg-emerald-500/5 border-b border-emerald-500/10 shrink-0">
          <button
            onClick={restoreSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all"
          >
            <RotateCcw size={14} /> Restore Selected ({selected.size})
          </button>
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all"
          >
            <X size={14} /> Delete Permanently
          </button>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Trash2 size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-bold">Recycle Bin is empty</p>
            <p className="text-xs mt-1">Deleted files appear here</p>
          </div>
        ) : (
          <div className="p-3">
            <button
              onClick={toggleSelectAll}
              className="w-full flex items-center gap-2 px-3 py-1.5 mb-2 text-xs text-zinc-500 hover:text-zinc-300 transition-all"
            >
              <div className={`w-4 h-4 rounded border ${selected.size === items.length ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'} flex items-center justify-center`}>
                {selected.size === items.length && <span className="text-[10px] text-white">✓</span>}
              </div>
              {selected.size === items.length ? 'Deselect all' : 'Select all'}
            </button>
            {items.map((item) => {
              const isSelected = selected.has(item.path);
              const isDir = vfs.stat(item.path)?.type === 'directory';
              return (
                <div
                  key={item.path}
                  onClick={() => toggleSelect(item.path)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-all ${
                    isSelected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'} flex items-center justify-center`}>
                    {isSelected && <span className="text-[10px] text-white">✓</span>}
                  </div>
                  <div className="p-1.5 rounded-lg bg-zinc-800/50 shrink-0">
                    {isDir ? <Folder size={16} className="text-amber-400" /> : <File size={16} className="text-zinc-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-600 font-mono truncate">{item.path}</div>
                  </div>
                  {item.trashedAt && (
                    <div className="text-[10px] text-zinc-600 shrink-0">
                      {new Date(item.trashedAt).toLocaleString()}
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); const r = vfs.restoreFromTrash(item.path); if (r) { addNotification({ title: 'Restored', message: `${item.name} → ${r}`, type: 'success' }); refresh(); } }}
                    className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all shrink-0"
                    title="Restore"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); vfs.delete(item.path, SYSTEM_VFS_APP_ID); addNotification({ title: 'Deleted', message: item.name, type: 'info' }); refresh(); }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                    title="Delete permanently"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer warning */}
      {items.length > 0 && (
        <div className="px-5 py-2 border-t border-white/5 shrink-0 flex items-center gap-2 text-[10px] text-zinc-600">
          <AlertTriangle size={12} className="shrink-0" />
          <span>Permanently deleted files cannot be recovered. Use "Restore" to move files back to /home/user.</span>
        </div>
      )}
    </div>
  );
}
