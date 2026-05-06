import React, { useState } from 'react';
import { ChevronLeft, Plus, X } from 'lucide-react';
import type { MobileAppProps } from '../types';

const COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa', '#fb923c'];

interface StickyNote { id: string; text: string; color: string; x: number; y: number; }

const STORAGE_KEY = 'nx_sticky_notes';
const load = (): StickyNote[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; } };
const save = (n: StickyNote[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(n));

export default function MobileStickyNotes({ onBack }: MobileAppProps) {
  const [notes, setNotes] = useState<StickyNote[]>(load);
  const [editing, setEditing] = useState<string | null>(null);

  const upd = (n: StickyNote[]) => { setNotes(n); save(n); };

  const addNote = () => {
    const note: StickyNote = {
      id: Date.now().toString(),
      text: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      x: Math.random() * 30,
      y: Math.random() * 30,
    };
    const next = [...notes, note];
    upd(next);
    setEditing(note.id);
  };

  const deleteNote = (id: string) => upd(notes.filter(n => n.id !== id));
  const updateText = (id: string, text: string) => upd(notes.map(n => n.id === id ? { ...n, text } : n));

  const editingNote = notes.find(n => n.id === editing);

  if (editing && editingNote) {
    return (
      <div className="h-full flex flex-col"
        style={{ background: editingNote.color + '15' }}>
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${editingNote.color}30` }}>
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={() => setEditing(null)}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <div className="flex gap-2 flex-1">
            {COLORS.map(c => (
              <button key={c} className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: editingNote.color === c ? 'white' : 'transparent' }}
                onClick={() => upd(notes.map(n => n.id === editing ? { ...n, color: c } : n))} />
            ))}
          </div>
          <button className="p-1.5 active:opacity-60" onClick={() => { deleteNote(editing); setEditing(null); }}>
            <X size={18} className="text-red-400/70" />
          </button>
        </div>
        <textarea
          className="flex-1 p-5 bg-transparent resize-none outline-none"
          style={{
            fontSize: '18px',
            lineHeight: '1.6',
            color: 'rgba(255,255,255,0.9)',
            caretColor: editingNote.color,
            fontFamily: "'Patrick Hand', 'Caveat', cursive, sans-serif",
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
          placeholder="Write your note..."
          value={editingNote.text}
          onChange={e => updateText(editing, e.target.value)}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">Sticky Notes</h1>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)' }}
          onClick={addNote}>
          <Plus size={18} style={{ color: '#fbbf24' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/20 gap-3">
            <span className="text-4xl">📝</span>
            <p className="text-[14px]">No sticky notes yet</p>
            <button className="text-yellow-400/60 text-[14px]" onClick={addNote}>Create one</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {notes.map(note => (
              <div
                key={note.id}
                className="p-4 rounded-2xl cursor-pointer active:scale-95 transition-all min-h-32 flex flex-col"
                style={{ background: note.color + '18', border: `1px solid ${note.color}30` }}
                onClick={() => setEditing(note.id)}
              >
                <p className="text-white/80 text-[14px] leading-relaxed flex-1 line-clamp-5">
                  {note.text || <span className="text-white/30 italic">Empty note</span>}
                </p>
                <div className="w-3 h-3 rounded-full mt-2" style={{ background: note.color }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
