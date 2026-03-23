import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Check, Flame, Calendar } from 'lucide-react';
import { uuid } from '../utils/uuid';

interface Habit { id: string; name: string; color: string; streak: number; history: Record<string, boolean>; created: number; }
const LS_KEY = 'nexus_habits';
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function HabitTrackerApp() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(habits)); }, [habits]);

  const todayKey = new Date().toISOString().split('T')[0];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { key: d.toISOString().split('T')[0], label: d.toLocaleDateString([], { weekday: 'short' }) };
  });

  const addHabit = () => {
    const name = prompt('Habit name:');
    if (!name) return;
    setHabits(prev => [...prev, { id: uuid(), name, color: COLORS[prev.length % COLORS.length], streak: 0, history: {}, created: Date.now() }]);
  };

  const toggleDay = (habitId: string, dayKey: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const newHist = { ...h.history, [dayKey]: !h.history[dayKey] };
      // Recalculate streak
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (newHist[key]) streak++;
        else break;
      }
      return { ...h, history: newHist, streak };
    }));
  };

  const removeHabit = (id: string) => setHabits(prev => prev.filter(h => h.id !== id));

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-violet-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Habit Tracker</span>
        </div>
        <button onClick={addHabit} className="flex items-center gap-1 px-3 py-1 bg-violet-500/20 text-violet-400 rounded-lg text-xs hover:bg-violet-500/30 transition">
          <Plus size={12} /> Add
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* Header row */}
        <div className="flex items-center mb-3 pl-40">
          {last7Days.map(d => (
            <div key={d.key} className={`w-10 text-center text-[10px] font-bold ${d.key === todayKey ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {d.label}
            </div>
          ))}
          <div className="w-16 text-center text-[10px] text-zinc-600 font-bold">Streak</div>
        </div>

        {habits.map(h => (
          <div key={h.id} className="flex items-center mb-2 group">
            <div className="w-40 flex items-center gap-2 pr-2 shrink-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
              <span className="text-xs text-zinc-300 truncate flex-1">{h.name}</span>
              <button onClick={() => removeHabit(h.id)} className="p-0.5 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={10} /></button>
            </div>
            {last7Days.map(d => (
              <button key={d.key} onClick={() => toggleDay(h.id, d.key)} className="w-10 flex items-center justify-center">
                <div className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center ${h.history[d.key] ? 'border-transparent' : 'border-white/10 hover:border-white/20'}`}
                  style={h.history[d.key] ? { backgroundColor: h.color + '30', borderColor: h.color } : {}}>
                  {h.history[d.key] && <Check size={12} style={{ color: h.color }} />}
                </div>
              </button>
            ))}
            <div className="w-16 flex items-center justify-center gap-1">
              {h.streak > 0 && <Flame size={10} className="text-orange-400" />}
              <span className={`text-xs font-mono ${h.streak > 0 ? 'text-orange-400' : 'text-zinc-700'}`}>{h.streak}d</span>
            </div>
          </div>
        ))}

        {habits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Target size={32} className="opacity-20 mb-2" />
            <p className="text-sm">No habits yet. Add one to start tracking!</p>
          </div>
        )}
      </div>
    </div>
  );
}
