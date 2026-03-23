import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Settings } from 'lucide-react';

export default function PomodoroApp() {
  const [mode, setMode] = useState<'work'|'break'|'long'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [longBreakMin, setLongBreakMin] = useState(15);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const durations = { work: workMin * 60, break: breakMin * 60, long: longBreakMin * 60 };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setRunning(false);
            if (mode === 'work') {
              const newSessions = sessions + 1;
              setSessions(newSessions);
              if (newSessions % 4 === 0) { setMode('long'); return longBreakMin * 60; }
              else { setMode('break'); return breakMin * 60; }
            } else { setMode('work'); return workMin * 60; }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, sessions, workMin, breakMin, longBreakMin]);

  const reset = () => { setRunning(false); setTimeLeft(durations[mode]); };
  const switchMode = (m: typeof mode) => { setMode(m); setTimeLeft(durations[m]); setRunning(false); };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 1 - timeLeft / durations[mode];

  const modeColors = { work: 'text-red-400', break: 'text-emerald-400', long: 'text-blue-400' };
  const modeBg = { work: 'from-red-500/10', break: 'from-emerald-500/10', long: 'from-blue-500/10' };
  const modeRing = { work: 'stroke-red-500', break: 'stroke-emerald-500', long: 'stroke-blue-500' };

  const circumference = 2 * Math.PI * 90;

  return (
    <div className={`h-full flex flex-col items-center justify-center bg-gradient-to-b ${modeBg[mode]} to-[#050508] text-zinc-100 relative`}>
      {/* Mode Tabs */}
      <div className="flex gap-2 mb-8">
        {([['work', 'Focus', Brain], ['break', 'Break', Coffee], ['long', 'Long Break', Timer]] as const).map(([m, label, Icon]) => (
          <button key={m} onClick={() => switchMode(m)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${mode === m ? `${modeColors[m]} bg-white/10` : 'text-zinc-600 hover:text-zinc-400'}`}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="relative w-52 h-52 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle cx="100" cy="100" r="90" fill="none" className={modeRing[mode]} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-extralight text-white font-mono">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className={`text-xs uppercase tracking-widest mt-1 ${modeColors[mode]}`}>
            {mode === 'work' ? 'Focus Time' : mode === 'break' ? 'Short Break' : 'Long Break'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button onClick={reset} className="p-2 text-zinc-500 hover:text-white transition"><RotateCcw size={18} /></button>
        <button onClick={() => setRunning(!running)} className={`p-4 rounded-full transition ${running ? 'bg-zinc-800 hover:bg-zinc-700' : `bg-white/10 hover:bg-white/15`}`}>
          {running ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-0.5" />}
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-zinc-500 hover:text-white transition"><Settings size={18} /></button>
      </div>

      {/* Session Counter */}
      <div className="mt-6 flex items-center gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition ${i < (sessions % 4) ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
        ))}
        <span className="text-xs text-zinc-600 ml-2">#{sessions} sessions</span>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-4 bg-zinc-900/95 border border-white/10 rounded-xl p-4 space-y-3 w-64">
          {[
            { label: 'Work', val: workMin, set: setWorkMin },
            { label: 'Break', val: breakMin, set: setBreakMin },
            { label: 'Long Break', val: longBreakMin, set: setLongBreakMin },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{s.label}</span>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="120" value={s.val} onChange={e => { s.set(+e.target.value); if (!running) setTimeLeft(+e.target.value * 60); }}
                  className="w-14 bg-zinc-800 rounded px-2 py-1 text-xs text-white border border-white/10 text-center outline-none" />
                <span className="text-[10px] text-zinc-600">min</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
