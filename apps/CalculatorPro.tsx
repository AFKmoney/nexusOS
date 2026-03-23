import React, { useState, useRef, useCallback } from 'react';
import { Calculator, Delete, CornerDownLeft, History, Percent, Divide, X, Minus, Plus, Equal } from 'lucide-react';

function evaluateMath(expr: string): number {
  const sanitized = expr.replace(/[^0-9+\-*/().% ]/g, '');
  const processed = sanitized.replace(/%/g, '/100');
  const tokens = processed.match(/(?:\d+\.?\d*|\.\d+|[+\-*/()])/g);
  if (!tokens) throw new Error('Invalid expression');

  let pos = 0;

  function parseExpression(): number {
    let left = parseTerm();
    while (pos < tokens!.length) {
      const op = tokens![pos];
      if (op === '+' || op === '-') {
        pos++;
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < tokens!.length) {
      const op = tokens![pos];
      if (op === '*' || op === '/') {
        pos++;
        const right = parseFactor();
        left = op === '*' ? left * right : left / right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseFactor(): number {
    if (pos >= tokens!.length) throw new Error('Unexpected end of expression');

    const token = tokens![pos++];

    if (token === '(') {
      const value = parseExpression();
      if (pos >= tokens!.length || tokens![pos++] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      return value;
    }

    if (token === '-') return -parseFactor();
    if (token === '+') return parseFactor();

    const num = parseFloat(token);
    if (isNaN(num)) throw new Error(`Invalid token: ${token}`);
    return num;
  }

  const result = parseExpression();
  if (pos < tokens!.length) {
    throw new Error('Unexpected tokens at end of expression');
  }

  return result;
}

export default function CalculatorProApp() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [newNumber, setNewNumber] = useState(true);

  const inputDigit = (d: string) => {
    if (newNumber) { setDisplay(d); setNewNumber(false); }
    else { setDisplay(prev => prev === '0' ? d : prev + d); }
  };

  const inputDot = () => {
    if (newNumber) { setDisplay('0.'); setNewNumber(false); return; }
    if (!display.includes('.')) setDisplay(prev => prev + '.');
  };

  const inputOp = (op: string) => {
    setEquation(prev => prev + display + ' ' + op + ' ');
    setNewNumber(true);
  };

  const calculate = () => {
    const expr = equation + display;
    try {
      const result = evaluateMath(expr);
      const rStr = String(parseFloat(result.toFixed(10)));
      setHistory(prev => [`${expr} = ${rStr}`, ...prev].slice(0, 30));
      setDisplay(rStr);
      setEquation('');
      setNewNumber(true);
    } catch { setDisplay('Error'); setEquation(''); setNewNumber(true); }
  };

  const clear = () => { setDisplay('0'); setEquation(''); setNewNumber(true); };
  const backspace = () => { setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0'); };
  const toggleSign = () => { setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev); };
  const percent = () => { setDisplay(String(parseFloat(display) / 100)); setNewNumber(true); };

  const Btn = ({ label, onClick, className = '', span = 1 }: { label: React.ReactNode; onClick: () => void; className?: string; span?: number }) => (
    <button
      onClick={onClick}
      className={`h-14 rounded-xl text-lg font-medium transition-all active:scale-95 hover:brightness-125 ${className}`}
      style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
    >{label}</button>
  );

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-emerald-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Calculator</span>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 hover:bg-white/10 rounded-lg transition">
          <History size={14} className={showHistory ? 'text-emerald-400' : 'text-zinc-500'} />
        </button>
      </div>

      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {history.length === 0 ? (
            <div className="text-center text-zinc-600 mt-8 text-sm">No history yet</div>
          ) : history.map((h, i) => (
            <div key={i} className="text-xs font-mono text-zinc-400 py-1 border-b border-white/5">{h}</div>
          ))}
        </div>
      ) : (
        <>
          {/* Display */}
          <div className="px-5 py-4 text-right">
            <div className="text-xs text-zinc-500 font-mono h-5 truncate">{equation || ' '}</div>
            <div className="text-4xl font-light tracking-wider text-white truncate">{display}</div>
          </div>

          {/* Buttons Grid */}
          <div className="p-3 grid grid-cols-4 gap-2 mt-auto">
            <Btn label="AC" onClick={clear} className="bg-zinc-700 text-white" />
            <Btn label={<Percent size={16} />} onClick={percent} className="bg-zinc-700 text-white" />
            <Btn label="⌫" onClick={backspace} className="bg-zinc-700 text-white" />
            <Btn label={<Divide size={16} />} onClick={() => inputOp('/')} className="bg-emerald-600 text-white" />

            <Btn label="7" onClick={() => inputDigit('7')} className="bg-zinc-800 text-white" />
            <Btn label="8" onClick={() => inputDigit('8')} className="bg-zinc-800 text-white" />
            <Btn label="9" onClick={() => inputDigit('9')} className="bg-zinc-800 text-white" />
            <Btn label={<X size={16} />} onClick={() => inputOp('*')} className="bg-emerald-600 text-white" />

            <Btn label="4" onClick={() => inputDigit('4')} className="bg-zinc-800 text-white" />
            <Btn label="5" onClick={() => inputDigit('5')} className="bg-zinc-800 text-white" />
            <Btn label="6" onClick={() => inputDigit('6')} className="bg-zinc-800 text-white" />
            <Btn label={<Minus size={16} />} onClick={() => inputOp('-')} className="bg-emerald-600 text-white" />

            <Btn label="1" onClick={() => inputDigit('1')} className="bg-zinc-800 text-white" />
            <Btn label="2" onClick={() => inputDigit('2')} className="bg-zinc-800 text-white" />
            <Btn label="3" onClick={() => inputDigit('3')} className="bg-zinc-800 text-white" />
            <Btn label={<Plus size={16} />} onClick={() => inputOp('+')} className="bg-emerald-600 text-white" />

            <Btn label="±" onClick={toggleSign} className="bg-zinc-800 text-white" />
            <Btn label="0" onClick={() => inputDigit('0')} className="bg-zinc-800 text-white" />
            <Btn label="." onClick={inputDot} className="bg-zinc-800 text-white" />
            <Btn label={<Equal size={16} />} onClick={calculate} className="bg-emerald-500 text-white" />
          </div>
        </>
      )}
    </div>
  );
}
