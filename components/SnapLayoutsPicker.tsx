// components/SnapLayoutsPicker.tsx
import React from 'react';
import type { SnapZone } from '../kernel/windowManager/types.ts';

// Windows 11-style snap layouts popover. Shown on Maximize-button hover.
// Six single-zone pickers: halves, maximize, and the two top quarters.
const PICKS: { zone: SnapZone; hint: string }[] = [
  { zone: 'left-half', hint: '◀' },
  { zone: 'right-half', hint: '▶' },
  { zone: 'top-half', hint: '▲' },
  { zone: 'maximize', hint: '■' },
  { zone: 'top-left', hint: '◤' },
  { zone: 'top-right', hint: '◥' },
];

export const SnapLayoutsPicker: React.FC<{ onPick: (zone: SnapZone) => void }> = ({ onPick }) => {
  return (
    <div className="absolute top-full right-0 mt-2 w-44 bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/10 rounded-xl p-2 shadow-[0_20px_60px_rgba(0,0,0,0.7)] grid grid-cols-3 gap-1.5"
      style={{ zIndex: 9600 }}>
      {PICKS.map(p => (
        <button
          key={p.zone}
          onClick={() => onPick(p.zone)}
          className="aspect-square rounded-lg border border-white/10 hover:border-emerald-400/50 hover:bg-emerald-400/10 text-zinc-300 hover:text-emerald-300 transition-colors flex items-center justify-center text-lg font-bold"
          title={p.zone}
        >
          {p.hint}
        </button>
      ))}
    </div>
  );
};
