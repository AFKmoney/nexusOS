import React, { useState } from 'react';
import { ChevronLeft, Delete } from 'lucide-react';
import type { MobileAppProps } from '../types';

export default function MobileCalculator({ onBack }: MobileAppProps) {
  const [display, setDisplay] = useState('0');
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [justCalc, setJustCalc] = useState(false);

  const push = (val: string) => {
    if (justCalc && /\d/.test(val)) {
      setDisplay(val); setExpr(''); setResult(null); setJustCalc(false); return;
    }
    setJustCalc(false);
    if (val === '.') {
      const parts = display.split(/[\+\-\×\÷]/);
      if (parts[parts.length - 1].includes('.')) return;
    }
    setDisplay(d => d === '0' && /\d/.test(val) ? val : d + val);
    setExpr(e => e === '' && /[\+\-\×\÷]/.test(val) ? result ?? display + val : e + val);
  };

  const calculate = () => {
    try {
      const raw = display.replace(/×/g, '*').replace(/÷/g, '/');
      const res = Function('"use strict"; return (' + raw + ')')() as number;
      const str = Number.isFinite(res) ? (+res.toFixed(10)).toString() : 'Error';
      setResult(str);
      setDisplay(str);
      setExpr('');
      setJustCalc(true);
    } catch {
      setDisplay('Error');
      setExpr('');
    }
  };

  const clear = () => { setDisplay('0'); setExpr(''); setResult(null); setJustCalc(false); };
  const backspace = () => {
    if (display === 'Error') { clear(); return; }
    const next = display.length > 1 ? display.slice(0, -1) : '0';
    setDisplay(next);
    setExpr(e => e.slice(0, -1));
  };
  const negate = () => setDisplay(d => d.startsWith('-') ? d.slice(1) : d === '0' ? '0' : '-' + d);
  const pct = () => {
    try { setDisplay(d => String(parseFloat(d) / 100)); } catch {}
  };

  type BtnDef = { label: string; action: () => void; style: 'op' | 'fn' | 'num' | 'eq' };
  const buttons: BtnDef[] = [
    { label: 'AC', action: clear, style: 'fn' },
    { label: '+/-', action: negate, style: 'fn' },
    { label: '%', action: pct, style: 'fn' },
    { label: '÷', action: () => push('÷'), style: 'op' },
    { label: '7', action: () => push('7'), style: 'num' },
    { label: '8', action: () => push('8'), style: 'num' },
    { label: '9', action: () => push('9'), style: 'num' },
    { label: '×', action: () => push('×'), style: 'op' },
    { label: '4', action: () => push('4'), style: 'num' },
    { label: '5', action: () => push('5'), style: 'num' },
    { label: '6', action: () => push('6'), style: 'num' },
    { label: '-', action: () => push('-'), style: 'op' },
    { label: '1', action: () => push('1'), style: 'num' },
    { label: '2', action: () => push('2'), style: 'num' },
    { label: '3', action: () => push('3'), style: 'num' },
    { label: '+', action: () => push('+'), style: 'op' },
    { label: '⌫', action: backspace, style: 'num' },
    { label: '0', action: () => push('0'), style: 'num' },
    { label: '.', action: () => push('.'), style: 'num' },
    { label: '=', action: calculate, style: 'eq' },
  ];

  const colors: Record<BtnDef['style'], string> = {
    fn: 'rgba(255,255,255,0.2)',
    op: 'rgba(16,185,129,0.85)',
    num: 'rgba(255,255,255,0.1)',
    eq: 'rgba(16,185,129,1)',
  };
  const textColors: Record<BtnDef['style'], string> = {
    fn: 'rgba(255,255,255,0.85)',
    op: '#fff',
    num: '#fff',
    eq: '#000',
  };

  const displayFontSize = display.length > 10 ? '2rem' : display.length > 7 ? '2.8rem' : '3.5rem';

  return (
    <div className="h-full flex flex-col" style={{ background: '#1a1a1a' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.3)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white/70 font-medium text-[15px]">Calculator</h1>
      </div>

      {/* Display */}
      <div className="flex-1 flex flex-col justify-end px-6 pb-4">
        {expr ? (
          <p className="text-white/30 text-[17px] text-right mb-1 font-light truncate">{expr}</p>
        ) : null}
        <p
          className="text-white text-right font-light transition-all leading-none"
          style={{ fontSize: displayFontSize, fontWeight: 200 }}
        >
          {display}
        </p>
      </div>

      {/* Keypad */}
      <div className="px-4 pb-4 grid grid-cols-4 gap-3 flex-shrink-0">
        {buttons.map((btn, i) => (
          <button
            key={i}
            className="flex items-center justify-center rounded-full font-medium transition-all active:scale-90 active:brightness-110"
            style={{
              height: 76,
              background: colors[btn.style],
              color: textColors[btn.style],
              fontSize: '24px',
              boxShadow: btn.style === 'eq' ? '0 0 20px rgba(16,185,129,0.4)' : 'none',
            }}
            onClick={btn.action}
          >
            {btn.label === '⌫' ? <Delete size={22} /> : btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
