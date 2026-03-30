import React, { useState, useEffect } from 'react';
import { Accessibility, Sun, Moon, Type, ZoomIn, ZoomOut, Eye, ShieldCheck, Zap } from 'lucide-react';
import { useOS } from '../store/osStore';

export default function AccessibilityPanel() {
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
    setHighContrast(!highContrast);
    addNotification({ title: 'Visual Mode', message: `High Contrast ${!highContrast ? 'Enabled' : 'Disabled'}`, type: 'info' });
  };

  const Toggle = ({ label, value, onToggle, icon: Icon, desc }: any) => (
    <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
          <Icon size={18} />
        </div>
        <div>
          <div className="text-sm font-bold text-zinc-200">{label}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">{desc}</div>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center gap-4 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
          <Accessibility size={20} />
        </div>
        <div>
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">Universal Access</h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">System Interaction Overrides</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-black/20">
        <div className="max-w-2xl mx-auto space-y-8">
          
          <section>
            <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Eye size={12} /> Visual Modulation
            </h2>
            <div className="space-y-3">
              <Toggle 
                label="High Contrast" 
                desc="Enhance text legibility and border visibility" 
                value={highContrast} 
                onToggle={toggleHighContrast} 
                icon={Sun} 
              />
              <Toggle 
                label="Reduced Motion" 
                desc="Minimize system-wide animations and transitions" 
                value={reducedMotion} 
                onToggle={() => setReducedMotion(!reducedMotion)} 
                icon={Zap} 
              />
              <Toggle 
                label="Screen Reader Proxy" 
                desc="Enable neural-text-to-speech system hooks" 
                value={screenReader} 
                onToggle={() => setScreenReader(!screenReader)} 
                icon={Accessibility} 
              />
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Type size={12} /> Interface Scaling
            </h2>
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 text-center">
              <div className="text-4xl font-black mb-2 text-white font-mono">{Math.round(uiScale * 100)}%</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-8">Current Resolution Multiplier</div>
              
              <div className="flex items-center gap-6">
                <button onClick={() => setUiScale(Math.max(0.5, uiScale - 0.1))} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"><ZoomOut size={24}/></button>
                <input 
                  type="range" min="0.5" max="2" step="0.1" 
                  value={uiScale} 
                  onChange={e => setUiScale(+e.target.value)} 
                  className="flex-1 accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
                />
                <button onClick={() => setUiScale(Math.min(2, uiScale + 0.1))} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"><ZoomIn size={24}/></button>
              </div>
              
              <button 
                onClick={() => setUiScale(1.0)}
                className="mt-8 px-6 py-2 border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Reset to Native
              </button>
            </div>
          </section>

          <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-4">
            <ShieldCheck className="text-blue-400 shrink-0" size={20} />
            <p className="text-xs text-zinc-500 leading-relaxed italic">
              "Accessibility is not a feature, it's a protocol. DAEMON ensures that every node in the nexus is usable by any entity, regardless of sensory input constraints."
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
