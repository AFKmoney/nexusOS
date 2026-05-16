import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, Download, Star, Zap, Shield, Cpu, Globe, Trash2, CheckCircle2 } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

const CATEGORIES = ['All', 'Productivity', 'Dev Tools', 'Security', 'Media', 'Utilities'];

export default function MobileAppStore({ onBack }: MobileAppProps) {
  const { registry, installedApps, installApp, uninstallApp, openApp } = useMobile();
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = registry.filter(a =>
    (cat === 'All' || (a as any).category === cat) &&
    (a.name.toLowerCase().includes(query.toLowerCase()) || (a.description || '').toLowerCase().includes(query.toLowerCase()))
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
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button key={c} className="flex-none px-4 py-1.5 rounded-full text-[13px] font-medium transition-all border border-transparent"
            style={{
              background: cat === c ? 'var(--nx-accent)' : 'rgba(255,255,255,0.07)',
              color: cat === c ? '#000' : 'rgba(255,255,255,0.5)',
              borderColor: cat === c ? 'white' : 'transparent'
            }}
            onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* App List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Available Applications</p>
          <span className="text-[10px] text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full">{filtered.length} Apps</span>
        </div>
        
        <div className="space-y-3">
          {filtered.map(app => {
            const Icon = app.icon;
            const isInstalled = installedApps.includes(app.id);
            const iconBg = (app as any).iconBg || 'linear-gradient(135deg, #374151 0%, #111827 100%)';
            
            return (
              <div key={app.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.05] transition-all">
                <div className="w-14 h-14 rounded-[18px] flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{ background: iconBg }}>
                  <Icon size={26} className="text-white" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[15px] truncate">{app.name}</p>
                  <p className="text-white/40 text-[11px] mt-0.5 line-clamp-1">{app.description || 'Neural OS Application'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center text-emerald-400/60">
                      <Star size={10} fill="currentColor" />
                      <span className="text-[10px] font-bold ml-1">4.9</span>
                    </div>
                    <span className="text-white/10 text-[10px]">|</span>
                    <span className="text-[10px] text-zinc-500 font-medium">SYSTEM CORE</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {!isInstalled ? (
                    <button
                      className="px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest bg-emerald-500 text-black active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      onClick={() => installApp(app.id)}
                    >
                      Install
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 active:bg-white/10"
                        onClick={() => openApp(app.id)}
                      >
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      </button>
                      <button
                        className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 active:bg-rose-500/20"
                        onClick={() => uninstallApp(app.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
