import React, { useState, useEffect } from 'react';
import { ChevronUp, Delete } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [time, setTime] = useState(new Date());
  const [pin, setPin] = useState('');
  const [showPad, setShowPad] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleDigit = (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        onUnlock();
        setPin('');
      }, 200);
    }
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div
      className="fixed inset-0 z-[980] flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #050508 0%, #0a0a12 100%)',
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      {/* Time + Date */}
      <div className="flex flex-col items-center pt-16 pb-8">
        <div className="text-white text-7xl font-thin tracking-tight">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-white/50 text-base mt-2">
          {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Swipe hint or PIN pad */}
      {!showPad ? (
        <div
          className="flex-1 flex flex-col items-center justify-end pb-16 gap-4"
          onClick={() => setShowPad(true)}
        >
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <ChevronUp size={28} className="text-white/30" />
            <span className="text-white/30 text-[14px]">Tap to unlock</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
          {/* PIN dots */}
          <div className={`flex items-center gap-4 ${shake ? 'animate-pulse' : ''}`}>
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className="w-3.5 h-3.5 rounded-full transition-all"
                style={{
                  background: i < pin.length ? 'var(--nx-accent)' : 'rgba(255,255,255,0.2)',
                  boxShadow: i < pin.length ? '0 0 8px rgba(16,185,129,0.6)' : 'none',
                  transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {keys.map((k, i) => {
              if (k === '') return <div key={i} />;
              const isBackspace = k === '⌫';
              return (
                <button
                  key={i}
                  className="h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-light transition-all active:scale-92"
                  style={{ background: isBackspace ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)' }}
                  onClick={() => isBackspace ? handleDelete() : handleDigit(k)}
                >
                  {isBackspace ? <Delete size={20} className="text-white/70" /> : k}
                </button>
              );
            })}
          </div>

          <button
            className="text-white/40 text-[14px] mt-2"
            onClick={() => { setShowPad(false); setPin(''); }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
