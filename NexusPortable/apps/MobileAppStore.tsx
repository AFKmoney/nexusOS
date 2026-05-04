import React, { useState } from 'react';
import { ChevronLeft, Search, Download, Star, Zap, Shield, Cpu, Globe } from 'lucide-react';
import type { MobileAppProps } from '../types';

const FEATURED = [
  { id: 'a1', name: 'NeuralForge', desc: 'AI app builder', cat: 'Dev Tools', rating: 4.9, icon: Cpu, color: '#10b981', free: true },
  { id: 'a2', name: 'SecureVault', desc: 'Encrypted password manager', cat: 'Security', rating: 4.7, icon: Shield, color: '#6366f1', free: false },
  { id: 'a3', name: 'NetRunner', desc: 'Advanced web browser', cat: 'Productivity', rating: 4.5, icon: Globe, color: '#06b6d4', free: true },
  { id: 'a4', name: 'ZapFlow', desc: 'Task automation engine', cat: 'Productivity', rating: 4.8, icon: Zap, color: '#f59e0b', free: false },
];

const CATEGORIES = ['All', 'Productivity', 'Dev Tools', 'Security', 'Media', 'Utilities'];

export default function MobileAppStore({ onBack }: MobileAppProps) {
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const filtered = FEATURED.filter(a =>
    (cat === 'All' || a.cat === cat) &&
    (a.name.toLowerCase().includes(query.toLowerCase()) || a.desc.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">App Store</h1>
      </div>

      {/* Search */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={15} className="text-white/40" />
          <input className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder:text-white/30"
            placeholder="Search apps..." value={query} onChange={e => setQuery(e.target.value)}
            style={{ fontSize: '16px', userSelect: 'text', WebkitUserSelect: 'text' }} />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(c => (
          <button key={c} className="flex-none px-4 py-1.5 rounded-full text-[13px] font-medium transition-all"
            style={{
              background: cat === c ? 'var(--nx-accent)' : 'rgba(255,255,255,0.07)',
              color: cat === c ? '#000' : 'rgba(255,255,255,0.5)',
            }}
            onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* Featured */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <p className="section-header pl-0">Featured Apps</p>
        <div className="space-y-3">
          {filtered.map(app => {
            const Icon = app.icon;
            const inst = installed.has(app.id);
            return (
              <div key={app.id} className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-14 h-14 rounded-[16px] flex items-center justify-center flex-shrink-0"
                  style={{ background: app.color + '20', border: `1px solid ${app.color}30` }}>
                  <Icon size={26} style={{ color: app.color }} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-[15px]">{app.name}</p>
                  <p className="text-white/50 text-[12px] mt-0.5">{app.desc}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star size={11} className="text-yellow-400" fill="currentColor" />
                    <span className="text-white/40 text-[11px]">{app.rating}</span>
                    <span className="text-white/20 text-[11px]">·</span>
                    <span className="text-white/40 text-[11px]">{app.cat}</span>
                  </div>
                </div>
                <button
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold flex-shrink-0 active:scale-95 transition-all"
                  style={{
                    background: inst ? 'rgba(255,255,255,0.08)' : `${app.color}20`,
                    color: inst ? 'rgba(255,255,255,0.4)' : app.color,
                    border: `1px solid ${inst ? 'rgba(255,255,255,0.1)' : app.color + '40'}`,
                  }}
                  onClick={() => setInstalled(s => { const n = new Set(s); inst ? n.delete(app.id) : n.add(app.id); return n; })}
                >
                  {inst ? 'Open' : app.free ? 'Get' : '$2.99'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
