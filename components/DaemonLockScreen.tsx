import React, { useEffect, useState } from 'react';
import { useOS } from '../store/osStore';
import { Terminal, Lock } from 'lucide-react';

export const DaemonLockScreen: React.FC = () => {
  const { daemonLocked, daemonLockLog } = useOS();
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (!daemonLocked) return;
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, [daemonLocked]);

  if (!daemonLocked) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center font-mono font-bold select-none cursor-wait overflow-hidden">
      {/* Visual Glitch Effects */}
      <div className={`absolute inset-0 bg-red-500/5 mix-blend-overlay pointer-events-none transition-opacity ${glitch ? 'opacity-100' : 'opacity-0'}`} style={{ transform: glitch ? 'translate(4px, -2px)' : 'none' }} />
      <div className={`absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none transition-opacity ${glitch ? 'opacity-100' : 'opacity-0'}`} style={{ transform: glitch ? 'translate(-4px, 2px)' : 'none' }} />

      <div className="flex flex-col items-center max-w-2xl w-full p-8 relative">
        <Lock size={64} className="text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />
        <h1 className="text-3xl text-red-500 tracking-[0.3em] mb-2 uppercase">DAEMON Override INITIATED</h1>
        <p className="text-zinc-500 mb-8 tracking-widest text-sm uppercase">UI Locked. Executing critical kernel repair.</p>
        
        <div className="w-full bg-black/50 border border-red-500/20 rounded shadow-[0_0_30px_rgba(239,68,68,0.1)] p-4 h-64 overflow-y-auto flex flex-col justify-end">
          <div className="flex flex-col gap-1 w-full text-xs text-red-400">
            {daemonLockLog.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-zinc-600">[{new Date().toISOString().split('T')[1].slice(0, 8)}]</span>
                <span className="text-red-400/80">{log}</span>
              </div>
            ))}
            <div className="flex gap-2 animate-pulse mt-2">
              <span className="text-zinc-600">[{new Date().toISOString().split('T')[1].slice(0, 8)}]</span>
              <span className="text-emerald-500 flex items-center gap-2"><Terminal size={12}/> REBUILDING NEURAL PATHWAYS <span className="animate-bounce">...</span></span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-zinc-600 text-[10px] tracking-widest uppercase flex items-center gap-2">
          Do not power off your neural conduit
        </div>
      </div>

      {/* Cyberpunk Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(translate(0, 0), rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%)', backgroundSize: '100% 4px' }} />
    </div>
  );
};
