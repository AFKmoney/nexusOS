import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Coffee, Zap, Bell, Settings2 } from 'lucide-react';
import { useOS } from '../store/osStore';

export default function PomodoroApp() {
  const { addNotification } = useOS();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [sessionCount, setSessionCount] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft]);

  const handleComplete = () => {
    setIsActive(false);
    if (mode === 'work') {
      setSessionCount(s => s + 1);
      addNotification({ title: 'Focus Complete', message: 'Take a cognitive reset.', type: 'info' });
      setMode('break');
      setTimeLeft(5 * 60);
    } else {
      addNotification({ title: 'Break Over', message: 'Neural focus re-engaging.', type: 'success' });
      setMode('work');
      setTimeLeft(25 * 60);
    }
    // Browser audio notification fallback
    try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'work' ? (1 - timeLeft / (25 * 60)) * 100 : (1 - timeLeft / (5 * 60)) * 100;

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Pulse */}
      <div className={`absolute inset-0 opacity-10 transition-colors duration-1000 ${isActive ? (mode === 'work' ? 'bg-red-500' : 'bg-emerald-500') : 'bg-transparent'}`} />
      
      <div className="z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        
        {/* Progress Ring Layout */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
            <circle 
              cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" 
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
              strokeLinecap="round"
              className={`transition-all duration-1000 ${mode === 'work' ? 'text-emerald-500' : 'text-blue-400'}`} 
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-6xl font-black font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mt-2">
              {mode === 'work' ? 'Neural Focus' : 'Cognitive Reset'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 w-full">
          <div className="flex items-center gap-4">
            <button 
              onClick={resetTimer}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl active:scale-95 ${isActive ? 'bg-zinc-800 text-white border border-white/10' : 'bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)]'}`}
            >
              {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
            </button>
            <button 
              onClick={() => { setMode(mode === 'work' ? 'break' : 'work'); resetTimer(); }}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              {mode === 'work' ? <Coffee size={20} /> : <Zap size={20} />}
            </button>
          </div>

          <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            {Array.from({length: 4}).map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-3 rounded-full transition-all duration-500 ${i < sessionCount % 4 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-800'}`} 
              />
            ))}
          </div>
          
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            Session {sessionCount + 1} // Cycle 4-Stage
          </div>
        </div>
      </div>

      {/* Decorative */}
      <div className="absolute bottom-8 flex gap-8 opacity-20">
        <div className="flex items-center gap-2 text-[10px] font-mono"><Bell size={12}/> Notifications ON</div>
        <div className="flex items-center gap-2 text-[10px] font-mono"><Settings2 size={12}/> Auto-Loop OFF</div>
      </div>
    </div>
  );
}
