import React, { useState, useRef, useEffect } from 'react';
import { StickyNote, Plus, X, Palette, GripVertical } from 'lucide-react';

interface Note { id: string; text: string; color: string; x: number; y: number; width: number; height: number; }

const NOTES_KEY = 'nexus_sticky_v1';
const COLORS = ['#fef08a', '#d9f99d', '#a5f3fc', '#ddd6fe', '#fecdd3', '#fed7aa'];

export default function StickyNotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; offX: number; offY: number } | null>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(NOTES_KEY); if (raw) setNotes(JSON.parse(raw)); } catch {}
  }, []);

  const persist = (n: Note[]) => { setNotes(n); localStorage.setItem(NOTES_KEY, JSON.stringify(n)); };

  const addNote = () => {
    const n: Note = {
      id: uuid(),
      text: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      x: 20 + Math.random() * 200,
      y: 20 + Math.random() * 150,
      width: 180,
      height: 160,
    };
    persist([...notes, n]);
  };

  const updateText = (id: string, text: string) => { persist(notes.map(n => n.id === id ? { ...n, text } : n)); };
  const removeNote = (id: string) => { persist(notes.filter(n => n.id !== id)); };
  const changeColor = (id: string) => {
    persist(notes.map(n => {
      if (n.id !== id) return n;
      const idx = (COLORS.indexOf(n.color) + 1) % COLORS.length;
      return { ...n, color: COLORS[idx] };
    }));
  };

  const onMouseDown = (id: string, e: React.MouseEvent) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setDragging({ id, offX: e.clientX - note.x, offY: e.clientY - note.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    persist(notes.map(n => n.id === dragging.id ? { ...n, x: e.clientX - dragging.offX, y: e.clientY - dragging.offY } : n));
  };

  const onMouseUp = () => setDragging(null);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <StickyNote size={16} className="text-amber-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Sticky Notes</span>
        </div>
        <button onClick={addNote} className="flex items-center gap-1 text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition">
          <Plus size={13} /> New
        </button>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <StickyNote size={32} className="mb-3 opacity-30" />
            <span className="text-sm">Click + New to create a sticky note</span>
          </div>
        )}
        {notes.map(note => (
          <div
            key={note.id}
            className="absolute rounded-xl shadow-xl flex flex-col cursor-default"
            style={{ left: note.x, top: note.y, width: note.width, minHeight: note.height, backgroundColor: note.color }}
          >
            <div className="flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing" onMouseDown={e => onMouseDown(note.id, e)}>
              <GripVertical size={12} className="text-black/30" />
              <div className="flex items-center gap-0.5">
                <button onClick={() => changeColor(note.id)} className="p-0.5 hover:bg-black/10 rounded"><Palette size={11} className="text-black/40" /></button>
                <button onClick={() => removeNote(note.id)} className="p-0.5 hover:bg-black/10 rounded"><X size={11} className="text-black/40" /></button>
              </div>
            </div>
            <textarea
              value={note.text}
              onChange={e => updateText(note.id, e.target.value)}
              placeholder="Write something..."
              className="flex-1 bg-transparent text-black text-xs px-3 pb-3 resize-none outline-none placeholder-black/30"
              style={{ minHeight: 100 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
