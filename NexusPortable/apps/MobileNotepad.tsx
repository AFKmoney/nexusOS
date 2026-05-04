import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Plus, Search, Trash2, FileText, Save } from 'lucide-react';
import type { MobileAppProps } from '../types';

interface Note {
  id: string;
  title: string;
  content: string;
  modified: number;
}

const STORAGE_KEY = 'nx_mobile_notes';

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch { return []; }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export default function MobileNotepad({ onBack }: MobileAppProps) {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'list' | 'editor'>('list');
  const textRef = useRef<HTMLTextAreaElement>(null);

  const active = notes.find(n => n.id === activeId) ?? null;

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const createNote = () => {
    const id = Date.now().toString();
    const note: Note = { id, title: 'New Note', content: '', modified: Date.now() };
    setNotes(n => [note, ...n]);
    setActiveId(id);
    setView('editor');
    setTimeout(() => textRef.current?.focus(), 150);
  };

  const updateNote = (id: string, partial: Partial<Note>) => {
    setNotes(n => n.map(note => note.id === id ? { ...note, ...partial, modified: Date.now() } : note));
  };

  const deleteNote = (id: string) => {
    setNotes(n => n.filter(note => note.id !== id));
    if (activeId === id) { setActiveId(null); setView('list'); }
  };

  const openNote = (id: string) => {
    setActiveId(id);
    setView('editor');
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(query.toLowerCase()) ||
    n.content.toLowerCase().includes(query.toLowerCase())
  );

  const fmt = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (view === 'editor' && active) {
    const titleLine = active.content.split('\n')[0] || 'New Note';
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={() => setView('list')}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <div className="flex-1">
            <p className="text-white font-semibold text-[15px] truncate">{titleLine.slice(0, 30) || 'New Note'}</p>
            <p className="text-white/40 text-[11px]">{fmt(active.modified)}</p>
          </div>
          <button className="p-1.5 rounded-xl active:bg-white/10"
            onClick={() => deleteNote(active.id)}>
            <Trash2 size={17} className="text-red-400/70" />
          </button>
        </div>

        {/* Editor */}
        <textarea
          ref={textRef}
          className="flex-1 p-5 bg-transparent text-white resize-none outline-none"
          style={{
            fontSize: '16px',
            lineHeight: '1.7',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            caretColor: 'var(--nx-accent)',
          }}
          placeholder="Start writing..."
          value={active.content}
          onChange={e => updateNote(active.id, { content: e.target.value })}
          autoFocus={false}
        />

        {/* Word count */}
        <div className="flex justify-end px-5 py-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="text-white/25 text-[11px]">
            {active.content.split(/\s+/).filter(Boolean).length} words · {active.content.length} chars
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="flex-1 text-white font-semibold text-[16px]">Notes</h1>
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center active:bg-white/10"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
          onClick={createNote}
        >
          <Plus size={18} className="text-emerald-400" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={15} className="text-white/40" />
          <input
            className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder:text-white/30"
            placeholder="Search notes..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ fontSize: '16px', userSelect: 'text', WebkitUserSelect: 'text' }}
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/20">
            <FileText size={40} strokeWidth={1.5} />
            <p className="text-[14px]">{query ? 'No results' : 'No notes yet'}</p>
            {!query && (
              <button className="text-emerald-400/70 text-[14px] mt-1" onClick={createNote}>
                Create your first note
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(note => (
              <div
                key={note.id}
                className="p-4 rounded-2xl cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => openNote(note.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white font-medium text-[15px] line-clamp-1">
                    {note.content.split('\n')[0] || 'Empty note'}
                  </p>
                  <span className="text-white/30 text-[11px] flex-shrink-0 mt-0.5">{fmt(note.modified)}</span>
                </div>
                <p className="text-white/40 text-[13px] mt-1 line-clamp-2">
                  {note.content.split('\n').slice(1).join(' ').trim() || 'No content'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
