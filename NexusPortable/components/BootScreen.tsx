import React, { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Initializing kernel...');

  const phases = [
    'Initializing kernel...',
    'Loading neural engine...',
    'Mounting VFS...',
    'Binding DAEMON...',
    'NexusOS ready.',
  ];

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 7;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(onDone, 500);
      }
      setProgress(Math.min(p, 100));
      const phaseIdx = Math.min(Math.floor((p / 100) * phases.length), phases.length - 1);
      setPhase(phases[phaseIdx]!);
    }, 180);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[999]"
      style={{ background: 'var(--nx-surface)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <div
          className="w-20 h-20 rounded-[28px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)',
            border: '1px solid rgba(16,185,129,0.3)',
            boxShadow: '0 0 40px rgba(16,185,129,0.2)',
          }}
        >
          <Cpu size={40} style={{ color: 'var(--nx-accent)' }} strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h1
            className="text-white text-3xl font-bold tracking-tight"
            style={{ textShadow: '0 0 20px rgba(16,185,129,0.4)' }}
          >
            NexusOS
          </h1>
          <p className="text-white/30 text-[13px] mt-1 tracking-wider uppercase">Mobile Edition</p>
        </div>
      </div>

      {/* Progress */}
      <div className="w-48">
        <div
          className="w-full h-0.5 rounded-full overflow-hidden mb-4"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--nx-accent), rgba(16,185,129,0.6))',
              boxShadow: '0 0 8px rgba(16,185,129,0.6)',
            }}
          />
        </div>
        <p className="text-white/30 text-[11px] text-center">{phase}</p>
      </div>

      {/* Version */}
      <p className="absolute bottom-12 text-white/15 text-[11px]">v1.0.0 · Sovereign Neural OS</p>
    </div>
  );
}
