import React, { useState } from 'react';
import { ChevronLeft, Globe, ArrowLeft, ArrowRight, RotateCcw, Shield, Zap } from 'lucide-react';
import type { MobileAppProps } from '../types';

export default function MobileWebRunner({ onBack }: MobileAppProps) {
  const [url, setUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = url;
    if (!target.startsWith('http')) target = 'https://' + target;
    setActiveUrl(target);
    setLoading(true);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Address Bar */}
      <div className="px-4 py-3 bg-black/40 border-b border-white/5 backdrop-blur-xl flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button onClick={activeUrl ? () => setActiveUrl('') : onBack} className="p-1 text-white/60">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center px-3 gap-2">
            <Globe size={14} className="text-emerald-400/50" />
            <form onSubmit={handleSubmit} className="flex-1">
              <input 
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                placeholder="Enter URL or Neural Node..."
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </form>
            {loading && <Zap size={12} className="text-emerald-400 animate-pulse" />}
          </div>
        </div>
        
        {activeUrl && (
          <div className="flex items-center justify-between px-2">
             <div className="flex gap-4">
               <ArrowLeft size={18} className="text-white/20" />
               <ArrowRight size={18} className="text-white/20" />
               <RotateCcw size={18} className="text-white/40" onClick={() => { const u = activeUrl; setActiveUrl(''); setTimeout(() => setActiveUrl(u), 10); }} />
             </div>
             <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
               <Shield size={10} /> Secure Sandbox
             </div>
          </div>
        )}
      </div>

      {/* Browser View */}
      <div className="flex-1 bg-white relative">
        {!activeUrl ? (
          <div className="absolute inset-0 bg-[#050508] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-[28px] flex items-center justify-center mb-8 border border-emerald-500/20">
               <Globe size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-white font-black uppercase tracking-[0.2em] text-xl mb-3">Web Runner</h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-[240px]">
              Launch external web nodes and PWAs inside the secure Nexus environment.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-10 w-full max-w-[280px]">
              {['Google', 'GitHub', 'YouTube', 'X.com'].map(site => (
                <button 
                  key={site} 
                  className="p-3 bg-white/5 border border-white/5 rounded-2xl text-[12px] font-bold text-white/60 active:bg-white/10 transition-all"
                  onClick={() => { setUrl(`${site.toLowerCase()}.com`); setActiveUrl(`https://${site.toLowerCase()}.com`); }}
                >
                  {site}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <iframe 
            src={activeUrl}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
