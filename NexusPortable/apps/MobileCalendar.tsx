import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { MobileAppProps } from '../types';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface CalEvent {
  date: string;
  title: string;
  color: string;
}

const SAMPLE_EVENTS: CalEvent[] = [
  { date: new Date().toDateString(), title: 'Team Standup', color: '#10b981' },
  { date: new Date(Date.now() + 86400000).toDateString(), title: 'Design Review', color: '#6366f1' },
  { date: new Date(Date.now() + 86400000 * 3).toDateString(), title: 'Sprint Planning', color: '#f59e0b' },
];

export default function MobileCalendar({ onBack }: MobileAppProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);
  const [events] = useState<CalEvent[]>(SAMPLE_EVENTS);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const dayEvents = (d: number) => events.filter(e => e.date === new Date(year, month, d).toDateString());

  const selectedEvents = events.filter(e => e.date === selected.toDateString());

  const isToday = (d: number) => {
    const t = new Date();
    return d === t.getDate() && month === t.getMonth() && year === t.getFullYear();
  };
  const isSelected = (d: number) => d === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <button className="p-1 active:opacity-60" onClick={prevMonth}>
            <ChevronLeft size={18} className="text-white/60" />
          </button>
          <h1 className="text-white font-semibold text-[16px] flex-1 text-center">
            {MONTHS[month]} {year}
          </h1>
          <button className="p-1 active:opacity-60" onClick={nextMonth}>
            <ChevronRight size={18} className="text-white/60" />
          </button>
        </div>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Plus size={18} className="text-emerald-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 px-4 pt-4 pb-2">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center text-[12px] font-medium text-white/30 pb-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 px-4 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const hasEvents = dayEvents(d).length > 0;
            const sel = isSelected(d);
            const tod = isToday(d);
            return (
              <button
                key={d}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all active:scale-90"
                style={{
                  background: sel ? 'var(--nx-accent)' : tod ? 'rgba(16,185,129,0.12)' : 'transparent',
                  border: tod && !sel ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                }}
                onClick={() => setSelected(new Date(year, month, d))}
              >
                <span
                  className="text-[14px] font-medium"
                  style={{ color: sel ? '#000' : tod ? 'var(--nx-accent)' : 'rgba(255,255,255,0.85)' }}
                >
                  {d}
                </span>
                <div className="flex gap-0.5">
                  {dayEvents(d).slice(0,3).map((ev, j) => (
                    <div key={j} className="w-1 h-1 rounded-full" style={{ background: sel ? '#000' : ev.color }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Events for selected day */}
        <div className="px-4 mt-4 pb-6">
          <p className="text-white/50 text-[12px] font-semibold uppercase tracking-wider mb-2">
            {selected.toDateString() === today.toDateString() ? 'Today' : selected.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          {selectedEvents.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-white/20">
              <span className="text-[14px]">No events</span>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${ev.color}` }}>
                  <div className="flex-1">
                    <p className="text-white text-[14px] font-medium">{ev.title}</p>
                    <p className="text-white/40 text-[12px] mt-0.5">All day</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
