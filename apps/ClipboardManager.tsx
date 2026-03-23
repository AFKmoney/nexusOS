import React, { useState, useEffect } from 'react';
import { Clipboard, Search, Star, StarOff, Trash2, Copy } from 'lucide-react';
import { uuid } from '../utils/uuid';

interface ClipEntry { id: string; text: string; timestamp: number; pinned: boolean; }

const CLIP_KEY = 'nexus_clipboard_v1';

export default function ClipboardManagerApp() {
  const [entries, setEntries] = useState<ClipEntry[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLIP_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
    // Listen for copy events
    const handler = () => {
      navigator.clipboard.readText().then(text => {
        if (text && text.trim()) addEntry(text.trim());
      }).catch(() => {});
    };
    document.addEventListener('copy', handler);
    return () => document.removeEventListener('copy', handler);
  }, []);

  const persist = (e: ClipEntry[]) => { setEntries(e); localStorage.setItem(CLIP_KEY, JSON.stringify(e)); };

  const addEntry = (text: string) => {
    setEntries(prev => {
      const dup = prev.find(e => e.text === text);
      if (dup) return prev;
      const next = [{ id: uuid(), text, timestamp: Date.now(), pinned: false }, ...prev].slice(0, 100);
      localStorage.setItem(CLIP_KEY, JSON.stringify(next));
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const togglePin = (id: string) => {
    persist(entries.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e));
  };

  const remove = (id: string) => { persist(entries.filter(e => e.id !== id)); };
  const clearAll = () => { persist(entries.filter(e => e.pinned)); };

  const sorted = [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });
  const filtered = search ? sorted.filter(e => e.text.toLowerCase().includes(search.toLowerCase())) : sorted;

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2">
          <Clipboard size={16} className="text-violet-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Clipboard</span>
          <span className="text-xs text-zinc-500 ml-1">({entries.length})</span>
        </div>
        <button onClick={clearAll} className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition">
          <Trash2 size={12} /> Clear
        </button>
      </div>

      <div className="px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 bg-zinc-900/60 rounded-lg px-3 py-1.5">
          <Search size={13} className="text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clipboard..." className="bg-transparent text-sm flex-1 outline-none text-white placeholder-zinc-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Clipboard size={28} className="mb-3 opacity-30" />
            <span className="text-sm">{search ? 'No matches' : 'Clipboard is empty'}</span>
          </div>
        ) : filtered.map(e => (
          <div key={e.id} className="bg-neutral-900/60 border border-white/5 rounded-lg p-2.5 hover:bg-white/5 transition-colors group">
            <div className="flex items-start gap-2">
              <div className="flex-1 text-xs text-zinc-300 font-mono whitespace-pre-wrap line-clamp-3 cursor-pointer" onClick={() => copyToClipboard(e.text)}>
                {e.text}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                <button onClick={() => copyToClipboard(e.text)} className="p-1 hover:bg-emerald-500/20 rounded" title="Copy">
                  <Copy size={12} className="text-emerald-400" />
                </button>
                <button onClick={() => togglePin(e.id)} className="p-1 hover:bg-amber-500/20 rounded" title={e.pinned ? 'Unpin' : 'Pin'}>
                  {e.pinned ? <Star size={12} className="text-amber-400" /> : <StarOff size={12} className="text-zinc-500" />}
                </button>
                <button onClick={() => remove(e.id)} className="p-1 hover:bg-rose-500/20 rounded" title="Delete">
                  <Trash2 size={12} className="text-rose-400" />
                </button>
              </div>
            </div>
            <div className="text-[10px] text-zinc-600 mt-1 flex items-center justify-between">
              <span>{new Date(e.timestamp).toLocaleTimeString()}</span>
              <span>{e.text.length} chars</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
