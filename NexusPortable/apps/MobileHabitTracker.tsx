import React, { useState } from 'react';
import { ChevronLeft, Plus, X, CheckCircle2, Circle, Target } from 'lucide-react';
import type { MobileAppProps } from '../types';

interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  streak: number;
  completedDays: string[]; // YYYY-MM-DD
}

const STORAGE_KEY = 'nx_habits';
const today = () => new Date().toISOString().split('T')[0]!;
const load = (): Habit[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; } };
const save = (h: Habit[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(h));

const EMOJIS = ['💪', '🏃', '📚', '💧', '🧘', '✍️', '🎯', '🌱', '🛌', '🍎'];
const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function MobileHabitTracker({ onBack }: MobileAppProps) {
  const [habits, setHabits] = useState<Habit[]>(load);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('💪');
  const [newColor, setNewColor] = useState('#10b981');

  const upd = (h: Habit[]) => { setHabits(h); save(h); };

  const toggleToday = (id: string) => {
    const t = today();
    upd(habits.map(h => {
      if (h.id !== id) return h;
      const done = h.completedDays.includes(t);
      const days = done ? h.completedDays.filter(d => d !== t) : [...h.completedDays, t];
      return { ...h, completedDays: days, streak: days.length };
    }));
  };

  const addHabit = () => {
    if (!newName.trim()) return;
    const habit: Habit = { id: Date.now().toString(), name: newName.trim(), emoji: newEmoji, color: newColor, streak: 0, completedDays: [] };
    upd([...habits, habit]);
    setAdding(false); setNewName(''); setNewEmoji('💪'); setNewColor('#10b981');
  };

  const del = (id: string) => upd(habits.filter(h => h.id !== id));

  const t = today();
  const completedToday = habits.filter(h => h.completedDays.includes(t)).length;

  // Last 7 days for mini calendar
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0]!;
  });

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">Habits</h1>
        <span className="text-white/40 text-[13px]">{completedToday}/{habits.length} today</span>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
          onClick={() => setAdding(true)}>
          <Plus size={18} className="text-emerald-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Progress ring */}
        {habits.length > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl mb-2"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#10b981" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 * (1 - completedToday / Math.max(habits.length, 1))} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-[13px] font-bold">{Math.round((completedToday / Math.max(habits.length, 1)) * 100)}%</span>
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-[15px]">Today's Progress</p>
              <p className="text-white/50 text-[12px]">{completedToday} of {habits.length} habits done</p>
            </div>
          </div>
        )}

        {/* Habit list */}
        {habits.map(habit => {
          const doneToday = habit.completedDays.includes(t);
          return (
            <div key={habit.id} className="p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${doneToday ? habit.color + '30' : 'rgba(255,255,255,0.06)'}` }}>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleToday(habit.id)}>
                  {doneToday
                    ? <CheckCircle2 size={24} style={{ color: habit.color }} />
                    : <Circle size={24} className="text-white/30" />
                  }
                </button>
                <span className="text-xl">{habit.emoji}</span>
                <div className="flex-1">
                  <p className={`text-[15px] font-medium ${doneToday ? 'line-through opacity-60' : 'text-white'}`}>{habit.name}</p>
                  <p className="text-white/40 text-[11px] mt-0.5">🔥 {habit.streak} day streak</p>
                </div>
                <button className="p-1 active:opacity-60" onClick={() => del(habit.id)}>
                  <X size={14} className="text-white/25" />
                </button>
              </div>
              {/* Mini 7-day calendar */}
              <div className="flex gap-1.5 mt-3 pl-7">
                {last7.map(day => (
                  <div key={day} className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: habit.completedDays.includes(day) ? habit.color : 'rgba(255,255,255,0.08)' }}>
                    <span className="text-[8px] font-medium" style={{ color: habit.completedDays.includes(day) ? '#000' : 'rgba(255,255,255,0.3)' }}>
                      {new Date(day + 'T12:00').toLocaleDateString([], { weekday: 'narrow' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {habits.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-12 text-white/20 gap-3">
            <Target size={40} strokeWidth={1.5} />
            <p className="text-[14px]">No habits yet</p>
            <button className="text-emerald-400/60 text-[14px]" onClick={() => setAdding(true)}>Add your first habit</button>
          </div>
        )}

        {/* Add habit form */}
        {adding && (
          <div className="p-4 rounded-2xl space-y-3"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <input
              className="mobile-input"
              placeholder="Habit name (e.g. Exercise 30 min)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
              autoFocus
              style={{ fontSize: '16px' }}
            />
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button key={e} className="w-9 h-9 rounded-xl text-xl flex items-center justify-center"
                  style={{ background: newEmoji === e ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)' }}
                  onClick={() => setNewEmoji(e)}>{e}</button>
              ))}
            </div>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} className="w-7 h-7 rounded-full border-2"
                  style={{ background: c, borderColor: newColor === c ? 'white' : 'transparent' }}
                  onClick={() => setNewColor(c)} />
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={addHabit}>Add Habit</button>
              <button className="btn-secondary px-4" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
