import React, { useState, useEffect } from 'react';
import { Plus, Trash2, StickyNote, Palette, ShieldAlert, Zap } from 'lucide-react';
import { useOS } from '../store/osStore';
import { uuid } from '../utils/uuid';

interface Note { id: string; content: string; color: string; x: number; y: number; }
const LS_KEY = 'nexus_notes_v2';

const COLORS = [
  'bg-yellow-400/90', 'bg-emerald-400/90', 'bg-blue-400/90', 
  'bg-rose-400/90', 'bg-purple-400/90', 'bg-zinc-100/90'
];

export default function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', content: 'DAEMON: Initialize neural uplink at 02:00.', color: COLORS[0], x: 20, y: 20 },
      { id: '2', content: 'Remember to verify VFS integrity.', color: COLORS[1], x: 250, y: 50 },
    ];
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    const n: Note = { 
      id: uuid(), 
      content: '', 
      color: COLORS[Math.floor(Math.random() * COLORS.length)], 
      x: 50 + (notes.length * 20), 
      y: 50 + (notes.length * 20) 
    };
    setNotes([...notes, n]);
  };

  const updateNote = (id: string, content: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, content } : n));
  };

  const changeColor = (id: string) => {
    setNotes(notes.map(n => {
      if (n.id === id) {
        const currentIdx = COLORS.indexOf(n.color);
        return { ...n, color: COLORS[(currentIdx + 1) % COLORS.length] };
      }
      return n;
    }));
  };

  const deleteNote = (id: string) => setNotes(notes.filter(n => n.id !== id));

  return (
    <div className="h-full bg-[#050508]/50 backdrop-blur-md p-6 overflow-hidden relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <StickyNote size={20} className="text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Neural Sticky Memory</span>
        </div>
        <button onClick={addNote} className="p-2 bg-yellow-400 text-black rounded-xl hover:bg-yellow-300 transition-all shadow-lg active:scale-90">
          <Plus size={20} />
        </button>
      </div>

      <div className="relative w-full h-full">
        {notes.map(note => (
          <div 
            key={note.id}
            className={`absolute w-56 min-h-[160px] ${note.color} rounded-2xl shadow-2xl flex flex-col p-4 transition-all hover:scale-[1.02] animate-in zoom-in-95 duration-200 group`}
            style={{ left: note.x, top: note.y, zIndex: 10 }}
          >
            <div className="flex items-center justify-between mb-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => changeColor(note.id)} className="p-1 hover:bg-black/10 rounded transition-colors"><Palette size={12} className="text-black/60"/></button>
              <button onClick={() => deleteNote(note.id)} className="p-1 hover:bg-black/10 rounded transition-colors text-black/60 hover:text-red-600"><Trash2 size={12}/></button>
            </div>
            <textarea 
              className="flex-1 bg-transparent border-none outline-none text-black font-medium text-xs resize-none placeholder:text-black/20 leading-relaxed"
              placeholder="Enter thought node..."
              value={note.content}
              onChange={e => updateNote(note.id, e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[8px] font-black uppercase tracking-tighter text-black/40 font-mono">NODE_ID: {note.id.slice(0, 8)}</div>
              <Zap size={10} className="text-black/20" />
            </div>
          </div>
        ))}

        {notes.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <ShieldAlert size={80} />
            <div className="text-sm font-black uppercase tracking-widest mt-4">Buffer Empty</div>
          </div>
        )}
      </div>
    </div>
  );
}
