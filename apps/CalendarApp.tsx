import React, { useState, useEffect } from 'react';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, Clock, Bell, Trash2, X } from 'lucide-react';
import { uuid } from '../utils/uuid';

interface CalEvent { id: string; date: string; title: string; time?: string; color: string; }
const EVENTS_KEY = 'nexus_calendar_v1';
const COLORS = ['#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#3b82f6'];

export default function CalendarApp() {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  useEffect(() => {
    try { const r = localStorage.getItem(EVENTS_KEY); if (r) setEvents(JSON.parse(r)); } catch {}
  }, []);
  const persist = (e: CalEvent[]) => { setEvents(e); localStorage.setItem(EVENTS_KEY, JSON.stringify(e)); };

  const year = current.getFullYear(), month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthName = current.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const getDayStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dayEvents = (d: number) => events.filter(e => e.date === getDayStr(d));

  const addEvent = () => {
    if (!newTitle.trim() || !selected) return;
    persist([...events, { id: uuid(), date: selected, title: newTitle.trim(), time: newTime || undefined, color: newColor }]);
    setNewTitle(''); setNewTime(''); setShowAdd(false);
  };
  const removeEvent = (id: string) => { persist(events.filter(e => e.id !== id)); };

  const selectedEvents = selected ? events.filter(e => e.date === selected) : [];

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <CalIcon size={16} className="text-cyan-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Calendar</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-400 text-sm font-mono">
          <Clock size={13} />
          {today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prev} className="p-1 hover:bg-white/10 rounded-lg"><ChevronLeft size={18} /></button>
            <span className="font-semibold text-white tracking-wide">{monthName}</span>
            <button onClick={next} className="p-1 hover:bg-white/10 rounded-lg"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] text-zinc-500 uppercase py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const ds = getDayStr(d);
              const isToday = ds === todayStr;
              const isSel = ds === selected;
              const evts = dayEvents(d);
              return (
                <button
                  key={d}
                  onClick={() => setSelected(ds)}
                  className={`aspect-square rounded-lg text-sm relative flex flex-col items-center justify-center transition-all
                    ${isToday ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'hover:bg-white/5 text-zinc-300'}
                    ${isSel ? 'ring-1 ring-emerald-500 bg-emerald-500/10' : ''}
                  `}
                >
                  {d}
                  {evts.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {evts.slice(0, 3).map(e => <div key={e.id} className="w-1 h-1 rounded-full" style={{ backgroundColor: e.color }} />)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-56 border-l border-white/5 flex flex-col bg-black/20">
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs text-zinc-400">{selected || 'Select a day'}</span>
            {selected && (
              <button onClick={() => setShowAdd(!showAdd)} className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400"><Plus size={14} /></button>
            )}
          </div>
          {showAdd && selected && (
            <div className="p-3 border-b border-white/5 space-y-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Event title" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none text-white" />
              <input value={newTime} onChange={e => setNewTime(e.target.value)} placeholder="Time (e.g. 14:00)" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none text-white" />
              <div className="flex gap-1">
                {COLORS.map(c => <button key={c} onClick={() => setNewColor(c)} className={`w-5 h-5 rounded-full border-2 ${newColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
              </div>
              <button onClick={addEvent} className="w-full py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-500 transition">Add Event</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {selectedEvents.length === 0 ? (
              <div className="text-center text-zinc-600 text-xs mt-6">No events</div>
            ) : selectedEvents.map(e => (
              <div key={e.id} className="bg-neutral-900/60 rounded-lg p-2 flex items-center gap-2 group">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate">{e.title}</div>
                  {e.time && <div className="text-[10px] text-zinc-500">{e.time}</div>}
                </div>
                <button onClick={() => removeEvent(e.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500/20 rounded transition"><Trash2 size={11} className="text-rose-400" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
