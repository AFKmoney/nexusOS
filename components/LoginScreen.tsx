import React from 'react';
import { Zap, Users, Lock } from 'lucide-react';

type LoginScreenProps = {
  profiles: Array<{
    id: string;
    name: string;
    themeColor: string;
    isAdmin?: boolean;
  }>;
  login: (profileId: string) => void;
};

export default function LoginScreen({
  profiles,
  login
}: LoginScreenProps) {
  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans" style={{ backgroundColor: '#050505', color: 'white' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 50%, rgba(16,185,129,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(6,95,70,0.08) 0%, transparent 50%)',
      }} />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-black/80" />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.01) 3px, rgba(255,255,255,0.01) 4px)',
      }} />

      <div className="z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <Zap className="text-emerald-500" size={32} />
        </div>
        <h1 className="text-3xl font-extralight text-white tracking-[0.25em] uppercase mb-2 drop-shadow-lg" style={{ color: 'white' }}>NexusOS</h1>
        <div className="text-xs text-zinc-600 tracking-[0.2em] uppercase mb-12">Select Profile</div>

        <div className="flex gap-8">
          {profiles.map(p => (
            <div
              key={p.id}
              onClick={() => login(p.id)}
              className="flex flex-col items-center gap-4 cursor-pointer group"
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-xl backdrop-blur-md border border-white/10 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                style={{ backgroundColor: `${p.themeColor}20`, color: p.themeColor }}
              >
                <Users size={28} />
              </div>
              <div className="text-center">
                <div className="text-white font-medium text-base tracking-wide group-hover:text-emerald-300 transition-colors drop-shadow-md">{p.name}</div>
                {p.isAdmin && <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-1">Administrator</div>}
                {p.id === 'daemon' && <div className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase mt-1 animate-pulse">DAEMON AI</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-[10px] font-mono text-zinc-500 tracking-widest flex items-center gap-2">
          <Lock size={10} /> ENCRYPTED BOOT · <span className="text-emerald-600">VERIFIED</span>
        </div>
      </div>
    </div>
  );
}