import React, { useState, useEffect } from 'react';
import { Accessibility, Sun, Moon, Type, ZoomIn, ZoomOut, Monitor, Eye } from 'lucide-react';
import { useOS } from '../store/osStore';

export default function AccessibilityPanel() {
  const { uiScale, setUiScale } = useOS();
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    if (highContrast) document.documentElement.classList.add('high-contrast');
    else document.documentElement.classList.remove('high-contrast');
    if (reducedMotion) document.documentElement.classList.add('reduced-motion');
    else document.documentElement.classList.remove('reduced-motion');
  }, [highContrast, fontSize, reducedMotion]);

  const Toggle = ({ label, value, onChange, icon: Icon }: { label: string; value: boolean; onChange: (v: boolean) => void; icon: any }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-zinc-500" />
        <span className="text-xs text-zinc-300">{label}</span>
      </div>
      <button onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="h-full overflow-auto p-5 bg-[#050508] text-zinc-100">
      <div className="flex items-center gap-2 mb-6">
        <Accessibility size={18} className="text-emerald-400" />
        <span className="font-bold text-sm tracking-widest uppercase">Accessibility</span>
      </div>

      <div className="space-y-4">
        {/* Display */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Display</div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">UI Scale</span>
              <span className="text-xs text-emerald-400 font-mono">{Math.round(uiScale * 100)}%</span>
            </div>
            <input type="range" min="0.5" max="2" step="0.1" value={uiScale} onChange={e => setUiScale(+e.target.value)} className="w-full accent-emerald-500" />
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">Font Size</span>
              <span className="text-xs text-emerald-400 font-mono">{fontSize}px</span>
            </div>
            <input type="range" min="10" max="24" step="1" value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-full accent-emerald-500" />
          </div>
          <Toggle label="High Contrast" value={highContrast} onChange={setHighContrast} icon={Eye} />
          <Toggle label="Reduce Animations" value={reducedMotion} onChange={setReducedMotion} icon={Monitor} />
        </div>

        {/* Presets */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Quick Presets</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Default', scale: 1, size: 14 },
              { label: 'Large', scale: 1.2, size: 18 },
              { label: 'Compact', scale: 0.8, size: 12 },
              { label: 'Extra Large', scale: 1.5, size: 20 },
            ].map(p => (
              <button key={p.label} onClick={() => { setUiScale(p.scale); setFontSize(p.size); }}
                className={`py-2 px-3 rounded-lg text-xs transition border ${uiScale === p.scale ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-white/5'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
