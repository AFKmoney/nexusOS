import React, { useState } from 'react';
import { Cpu, ChevronRight, Zap, Shield, Globe, Terminal, FileText, Star } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

const FEATURES = [
  { icon: Cpu, color: '#10b981', title: 'DAEMON Neural Engine', desc: 'AI backbone that learns your habits and assists autonomously.' },
  { icon: Shield, color: '#6366f1', title: 'Secure Boot', desc: 'Every session starts clean with verified kernel integrity.' },
  { icon: Globe, color: '#06b6d4', title: 'Multi-Provider AI', desc: 'Anthropic, OpenAI, Gemini, Groq — all in one interface.' },
  { icon: Terminal, color: '#f59e0b', title: 'Full Terminal', desc: 'Real Unix shell emulation with 30+ built-in commands.' },
  { icon: FileText, color: '#ec4899', title: 'Virtual File System', desc: 'POSIX-compatible VFS with persistent localStorage backing.' },
  { icon: Star, color: '#8b5cf6', title: '17+ Built-in Apps', desc: 'Notes, Calendar, Music, Browser, Kanban, Weather and more.' },
];

export default function MobileWelcome({ onBack }: MobileAppProps) {
  const { currentUser, openApp } = useMobile();
  const [page, setPage] = useState(0);

  if (page === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-between px-6"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.12) 0%, var(--nx-surface) 70%)' }}
      >
        <div className="flex flex-col items-center pt-12 gap-4">
          <div
            className="w-24 h-24 rounded-[30px] flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 40px rgba(16,185,129,0.2)' }}
          >
            <Cpu size={48} className="text-emerald-400" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-white text-3xl font-bold">Welcome to NexusOS</h1>
            <p className="text-white/50 text-[15px] mt-2">Mobile Edition · v2.0.5</p>
          </div>
          <p className="text-white/60 text-[15px] text-center leading-relaxed mt-2">
            The Sovereign Neural Operating System — AI-native, secure, and fully sovereign.
          </p>
          {currentUser && (
            <div className="px-4 py-2.5 rounded-2xl mt-2"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-emerald-400 text-[14px] font-medium">
                Logged in as <strong>{currentUser.name}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="w-full pb-8 space-y-3">
          <button className="btn-primary w-full" onClick={() => setPage(1)}>
            Explore Features <ChevronRight size={18} />
          </button>
          <button className="btn-secondary w-full" onClick={() => { openApp('daemon_chat'); onBack(); }}>
            <Zap size={16} className="text-emerald-400" />
            Talk to DAEMON
          </button>
          <button className="w-full text-white/30 text-[14px] py-2" onClick={onBack}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button className="text-white/40 text-[14px]" onClick={() => setPage(0)}>← Back</button>
        <h1 className="text-white font-semibold text-[16px] flex-1 text-center">Features</h1>
        <div style={{ width: 44 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {FEATURES.map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="flex items-start gap-4 p-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: color + '20' }}>
              <Icon size={22} style={{ color }} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-white font-semibold text-[15px]">{title}</p>
              <p className="text-white/50 text-[13px] mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-6 pt-3 flex-shrink-0">
        <button className="btn-primary w-full" onClick={onBack}>
          Get Started <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
