import React, { useState, useEffect } from 'react';
import { Accessibility, Sun, Type, ZoomIn, ZoomOut, Eye, ShieldCheck, Zap, ChevronLeft } from 'lucide-react';
import { useOS } from '../../store/osStore';
import type { MobileAppProps } from '../types';

export default function MobileAccessibilityPanel({ onBack }: MobileAppProps) {
  const { uiScale, setUiScale, addNotification } = useOS();
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReader, setScreenReader] = useState(false);

  useEffect(() => {
    if (highContrast) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');
    
    if (reducedMotion) document.body.classList.add('reduced-motion');
    else document.body.classList.remove('reduced-motion');
  }, [highContrast, reducedMotion]);

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    addNotification({ 
      title: 'Visual Mode', 
      message: `High Contrast ${next ? 'Enabled' : 'Disabled'}`, 
      type: 'info' 
    });
  };

  const ToggleRow = ({ label, value, onToggle, icon: Icon, desc }: { 
    label: string; 
    value: boolean; 
    onToggle: () => void; 
    icon: React.ElementType; 
    desc: string; 
  }) => (
    <div 
      className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl active:bg-white/[0.06] transition-all"
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-medium text-white">{label}</div>
          <div className="text-[11px] text-white/30 uppercase tracking-tighter">{desc}</div>
        </div>
      </div>
      <div
        className={`w-12 h-7 rounded-full transition-all relative shrink-0 ${value ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/10'}`}
      >
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${value ? 'left-6' : 'left-1'}`} />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button
          className="p-1.5 rounded-xl active:bg-white/10 transition-colors"
          onClick={onBack}
        >
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-[16px]">Universal Access</h1>
        </div>
        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
          <Accessibility size={20} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        
        <section>
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 px-2">
            <Eye size={12} /> Visual Modulation
          </h2>
          <div className="space-y-3">
            <ToggleRow 
              label="High Contrast" 
              desc="Enhance text legibility" 
              value={highContrast} 
              onToggle={toggleHighContrast} 
              icon={Sun} 
            />
            <ToggleRow 
              label="Reduced Motion" 
              desc="Minimize animations" 
              value={reducedMotion} 
              onToggle={() => setReducedMotion(!reducedMotion)} 
              icon={Zap} 
            />
            <ToggleRow 
              label="Screen Reader Proxy" 
              desc="Neural-text-to-speech" 
              value={screenReader} 
              onToggle={() => setScreenReader(!screenReader)} 
              icon={Accessibility} 
            />
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 px-2">
            <Type size={12} /> Interface Scaling
          </h2>
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 text-center">
            <div className="text-4xl font-black mb-1 text-white font-mono">{Math.round(uiScale * 100)}%</div>
            <div className="text-[10px] text-white/20 uppercase tracking-[0.2em] mb-8">Resolution Multiplier</div>

            <div className="flex items-center gap-4 px-2">
              <button 
                onClick={() => setUiScale(Math.max(0.5, uiScale - 0.1))} 
                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 active:bg-white/10 transition-all"
              >
                <ZoomOut size={20}/>
              </button>
              <div className="flex-1 relative flex items-center h-12">
                <input 
                  type="range" min="0.5" max="2" step="0.1" 
                  value={uiScale} 
                  onChange={e => setUiScale(+e.target.value)} 
                  className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer" 
                />
              </div>
              <button 
                onClick={() => setUiScale(Math.min(2, uiScale + 0.1))} 
                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 active:bg-white/10 transition-all"
              >
                <ZoomIn size={20}/>
              </button>
            </div>
            
            <button 
              onClick={() => setUiScale(1.0)}
              className="mt-8 w-full py-3 border border-white/10 text-white/30 active:text-white active:bg-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
            >
              Reset to Native (100%)
            </button>
          </div>
        </section>

        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
          <ShieldCheck className="text-emerald-400 shrink-0" size={20} />
          <p className="text-[12px] text-white/40 leading-relaxed italic">
            "Accessibility is a core protocol. DAEMON ensures every node in the nexus remains navigable for all entities."
          </p>
        </div>

      </div>
    </div>
  );
}
