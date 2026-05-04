import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import type { MobileAppProps } from '../types';

type Mode = 'work' | 'short' | 'long';
const DURATIONS: Record<Mode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const LABELS: Record<Mode, string> = { work: 'Focus', short: 'Short Break', long: 'Long Break' };
const COLORS: Record<Mode, string> = { work: '#10b981', short: '#6366f1', long: '#06b6d4' };

export default function MobilePomodoro({ onBack }: MobileAppProps) {
  const [mode, setMode] = useState<Mode>('work');
  const [remaining, setRemaining] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (mode === 'work') setSessions(s => s + 1);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setRemaining(DURATIONS[m]);
    setRunning(false);
  };

  const reset = () => { setRemaining(DURATIONS[mode]); setRunning(false); };

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const progress = 1 - remaining / DURATIONS[mode];
  const circumference = 2 * Math.PI * 110;
  const color = COLORS[mode];

  return (
    <div className="h-full flex flex-col items-center" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 w-full"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">Pomodoro</h1>
        <span className="text-white/40 text-[13px]">{sessions} sessions</span>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 px-6 py-4">
        {(['work','short','long'] as Mode[]).map(m => (
          <button key={m} className="flex-1 py-2 rounded-xl text-[13px] font-medium transition-all"
            style={{
              background: mode === m ? color + '20' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${mode === m ? color + '40' : 'rgba(255,255,255,0.07)'}`,
              color: mode === m ? color : 'rgba(255,255,255,0.4)',
            }}
            onClick={() => switchMode(m)}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <svg width={260} height={260} viewBox="0 0 260 260">
            <circle cx={130} cy={130} r={110} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
            <circle
              cx={130} cy={130} r={110}
              fill="none"
              stroke={color}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform="rotate(-90 130 130)"
              style={{ transition: 'stroke-dashoffset 1s linear', boxShadow: `0 0 12px ${color}60` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {mode === 'work' ? <Brain size={22} style={{ color }} className="mb-2" /> : <Coffee size={22} style={{ color }} className="mb-2" />}
            <span className="text-white text-5xl font-thin">{fmtTime(remaining)}</span>
            <span className="text-white/40 text-[13px] mt-1">{LABELS[mode]}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            onClick={reset}>
            <RotateCcw size={20} className="text-white/60" />
          </button>
          <button
            className="w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: color, boxShadow: `0 0 24px ${color}50` }}
            onClick={() => setRunning(r => !r)}
          >
            {running ? <Pause size={30} className="text-black" fill="black" /> : <Play size={30} className="text-black ml-1" fill="black" />}
          </button>
          <div className="w-12 h-12" />
        </div>
      </div>

      {/* Session dots */}
      <div className="flex gap-2 pb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full transition-all"
            style={{ background: i < (sessions % 4) ? color : 'rgba(255,255,255,0.15)' }} />
        ))}
      </div>
    </div>
  );
}
