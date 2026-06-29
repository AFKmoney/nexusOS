import React, { useEffect, useState } from 'react';
import { useOS } from '../store/osStore';
import { sounds } from '../kernel/sounds';
import { Zap } from 'lucide-react';
import BiosScreen from './BiosScreen';

const BOOT_MESSAGES = [
  'DAEMON Core initializing...',
  'Loading kernel: VFS, Memory, EventBus, IPC',
  'ProcessManager → started',
  'FileSystem → /home mounted',
  'ErrorGuard → 5-layer validation active',
  'ToolForge v2 → 65+ native actions loaded',
  'SkillForge v2 → AI self-evolution engine ready',
  'AutoPilot → goal queue + self-prompting ready',
  'AgentOrchestrator v2 → parallel multi-agent ready',
  'AppGenerator → full-filesystem app generation ready',
  'EpisodicMemory → conversation recall ready',
  'Function Calling → native tool-use enabled',
  'PolicyEngine v1.1 → Full Autonomy mode ready',
  'Neural Spine → manifest snapshot compiled',
  'ThemeEngine → accent applied',
  'PermissionSystem → sandbox enforced',
  'DAEMON.CORE → Link check initiated',
];

export default function BootScreen() {
  const { setBooted } = useOS();
  const [bootPhase, setBootPhase] = useState(0);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [showBios, setShowBios] = useState(false);

  useEffect(() => {
    if (bootPhase < BOOT_MESSAGES.length) {
      const t = setTimeout(() => {
        const nextMessage = BOOT_MESSAGES[bootPhase];
        if (nextMessage) {
          setBootLines(prev => [...prev, nextMessage]);
        }
        setBootPhase(p => p + 1);
        setProgress(((bootPhase + 1) / BOOT_MESSAGES.length) * 100);
      }, 120 + Math.random() * 80);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      sounds.boot();
      setTimeout(() => {
        setBooted(true);
        setTimeout(() => {
          useOS.getState().addNotification({
            title: 'NexusOS',
            message: 'System ready. All modules loaded.',
            type: 'success'
          });
        }, 2000);
      }, 300);
    }, 600);

    return () => clearTimeout(t);
  }, [bootPhase, setBooted]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') setShowBios(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-mono relative overflow-hidden" style={{ backgroundColor: '#000', width: '100vw', height: '100vh' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.03) 2px, rgba(16,185,129,0.03) 4px)',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 60%)',
      }} />

      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
          <Zap className="text-emerald-500 animate-pulse" size={36} />
        </div>
        <div className="text-white font-black tracking-[0.4em] text-2xl text-center" style={{ color: 'white' }}>
          NEXUS<span className="text-emerald-500">OS</span>
        </div>
        <div className="text-zinc-600 text-xs text-center tracking-[0.3em] mt-1 uppercase">AI-Native Operating System</div>
      </div>

      <div className="w-72 mb-6">
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="w-80 h-44 overflow-hidden">
        {bootLines.map((line, i) => (
          <div key={i} className="text-[10px] font-mono text-emerald-400/60 mb-0.5" style={{
            animation: 'fadeIn 0.2s ease-out',
            opacity: i === bootLines.length - 1 ? 1 : 0.5,
          }}>
            <span className="text-emerald-600 mr-1.5">▸</span>{line}
          </div>
        ))}
        {bootPhase < BOOT_MESSAGES.length && (
          <div className="text-[10px] text-emerald-600 animate-pulse mt-1">▋</div>
        )}
        {bootPhase >= BOOT_MESSAGES.length && (
          <div className="text-[11px] text-emerald-400 font-bold mt-2 animate-pulse tracking-widest">
            ⚡ BOOTING...
          </div>
        )}
      </div>

      <div className="absolute bottom-6 text-[9px] text-zinc-800 font-mono tracking-widest">
        DAEMON.CORE v3.0 · F2 for BIOS
      </div>

      {showBios && <BiosScreen onExit={() => setShowBios(false)} />}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
