import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, Flame, Calendar, Trash2, Plus, Sparkles } from 'lucide-react';
import { useOS } from '../store/osStore';
import { uuid } from '../utils/uuid';

interface Habit { id: string; name: string; streak: number; completedToday: boolean; history: string[]; }
const LS_KEY = 'nexus_habits_v2';

export default function HabitTracker() {
  const { addNotification } = useOS();
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', name: 'Neural Focus Session', streak: 5, completedToday: false, history: [] },
      { id: '2', name: 'Code Architecture Review', streak: 12, completedToday: true, history: [] },
    ];
  });

  const [newHabit, setNewHabit] = useState('');

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(habits));
  }, [habits]);

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const completed = !h.completedToday;
        return { 
          ...h, 
          completedToday: completed,
          streak: completed ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));
  };

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    setHabits(prev => [...prev, { 
      id: uuid(), 
      name: newHabit, 
      streak: 0, 
      completedToday: false, 
      history: [] 
    }]);
    setNewHabit('');
    addNotification({ title: 'Protocol Initialized', message: `New habit "${newHabit}" added to tracking.`, type: 'success' });
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Target size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Neural Protocols</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest">Behavioral Optimization Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5 shadow-inner">
            <Flame size={14} className="text-orange-500" />
            <span className="text-[10px] font-black font-mono">{habits.reduce((acc, h) => acc + h.streak, 0)} TOTAL STREAK</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
        <div className="max-w-2xl mx-auto space-y-4">
          
          {/* Input Area */}
          <form onSubmit={addHabit} className="relative group mb-8">
            <input 
              className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-5 pr-16 text-sm outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700 shadow-inner"
              placeholder="Define new protocol..."
              value={newHabit}
              onChange={e => setNewHabit(e.target.value)}
            />
            <button type="submit" className="absolute right-3 top-2.5 p-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all shadow-lg active:scale-90">
              <Plus size={20} />
            </button>
          </form>

          {/* List */}
          <div className="grid grid-cols-1 gap-3">
            {habits.map(h => (
              <div 
                key={h.id}
                onClick={() => toggleHabit(h.id)}
                className={`group flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer ${h.completedToday ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${h.completedToday ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-black/40 text-zinc-600 border border-white/5'}`}>
                    {h.completedToday ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </div>
                  <div>
                    <div className={`text-sm font-bold transition-all ${h.completedToday ? 'text-emerald-400' : 'text-zinc-300 group-hover:text-white'}`}>{h.name}</div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">Protocol Tracking active</div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <div className={`flex items-center gap-1.5 text-xs font-black font-mono ${h.streak > 0 ? 'text-orange-500' : 'text-zinc-700'}`}>
                      <Flame size={14} fill={h.streak > 0 ? 'currentColor' : 'none'} />
                      {h.streak} DAYS
                    </div>
                    <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">Consistency Level</div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteHabit(h.id); }}
                    className="p-2 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {habits.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
              <Sparkles size={48} className="mb-4" />
              <div className="text-sm font-black uppercase tracking-widest">No active protocols</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
