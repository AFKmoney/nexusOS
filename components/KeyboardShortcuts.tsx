import React from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: 'Ctrl + Space', desc: 'Global Search' },
    { keys: 'Ctrl + T', desc: 'Open Terminal' },
    { keys: 'Ctrl + E', desc: 'Open File Explorer' },
    { keys: 'Ctrl + N', desc: 'Open Notepad' },
    { keys: 'Ctrl + D', desc: 'Open Dashboard' },
  ]},
  { category: 'Window Management', items: [
    { keys: 'Ctrl + W', desc: 'Close Active Window' },
    { keys: 'Ctrl + L', desc: 'Lock Screen' },
    { keys: 'Double-click Title', desc: 'Maximize/Restore' },
    { keys: 'Right-click Desktop', desc: 'Context Menu' },
  ]},
  { category: 'Editing', items: [
    { keys: 'Ctrl + C', desc: 'Copy' },
    { keys: 'Ctrl + V', desc: 'Paste' },
    { keys: 'Ctrl + X', desc: 'Cut' },
    { keys: 'Ctrl + Z', desc: 'Undo' },
    { keys: 'Ctrl + S', desc: 'Save (in editors)' },
  ]},
  { category: 'System', items: [
    { keys: 'Ctrl + ?', desc: 'This Help Overlay' },
    { keys: 'Click Taskbar Clock', desc: 'Calendar' },
    { keys: 'Click NEXUS', desc: 'Start Menu' },
  ]},
];

export default function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl w-[520px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-zinc-900/95 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-emerald-400" />
            <span className="font-bold text-sm text-white tracking-widest uppercase">Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition"><X size={14} className="text-zinc-400" /></button>
        </div>
        <div className="p-5 space-y-5">
          {SHORTCUTS.map(cat => (
            <div key={cat.category}>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{cat.category}</div>
              <div className="space-y-1">
                {cat.items.map(s => (
                  <div key={s.keys} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white/5 transition">
                    <span className="text-xs text-zinc-300">{s.desc}</span>
                    <div className="flex gap-1">
                      {s.keys.split(' + ').map((k, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-zinc-600 text-[10px] mx-0.5">+</span>}
                          <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-white/10 rounded text-[10px] text-zinc-300 font-mono">{k.trim()}</kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
