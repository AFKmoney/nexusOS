import React, { useState } from 'react';
import { ChevronLeft, Clipboard, Copy, Trash2, Check, Plus } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

export default function MobileClipboardManager({ onBack }: MobileAppProps) {
  const { clipboard, clipboardHistory, setClipboard, clearClipboard } = useMobile();
  const [copied, setCopied] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const add = () => {
    if (!newText.trim()) return;
    setClipboard(newText.trim());
    setNewText('');
  };

  const all = clipboard ? [clipboard, ...clipboardHistory.filter(h => h.text !== clipboard.text)] : clipboardHistory;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">Clipboard</h1>
        {all.length > 0 && (
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={clearClipboard}>
            <Trash2 size={17} className="text-red-400/60" />
          </button>
        )}
      </div>

      {/* Add entry */}
      <div className="px-4 py-3 flex-shrink-0 flex gap-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <input
          className="mobile-input flex-1"
          placeholder="Add text to clipboard..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          style={{ fontSize: '14px', padding: '10px 14px' }}
        />
        <button className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
          onClick={add}>
          <Plus size={18} className="text-emerald-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/20 gap-3">
            <Clipboard size={36} strokeWidth={1.5} />
            <p className="text-[14px]">Clipboard is empty</p>
          </div>
        ) : (
          all.map((entry, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
              style={{
                background: i === 0 && clipboard ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === 0 && clipboard ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              {i === 0 && clipboard && (
                <div className="px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-400 flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(16,185,129,0.15)' }}>LATEST</div>
              )}
              <p className="text-white/80 text-[14px] flex-1 line-clamp-4 leading-relaxed">{entry.text}</p>
              <button
                className="p-2 rounded-xl flex-shrink-0 active:scale-90"
                style={{ background: copied === entry.text ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)' }}
                onClick={() => copy(entry.text)}
              >
                {copied === entry.text
                  ? <Check size={15} className="text-emerald-400" />
                  : <Copy size={15} className="text-white/50" />
                }
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
