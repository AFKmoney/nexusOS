import React, { useState } from 'react';
import { Calculator, Delete, RotateCcw, Equal, Percent, Hash, Activity } from 'lucide-react';

export default function CalculatorPro() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const handleDigit = (digit: string) => {
    setDisplay(prev => prev === '0' ? digit : prev + digit);
  };

  const handleOp = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const fullEq = equation + display;
      // Use Function constructor instead of eval for slight safety boost in local context
      const result = new Function(`return ${fullEq.replace('×', '*').replace('÷', '/')}`)();
      const resStr = result.toString();
      setHistory(prev => [fullEq + ' = ' + resStr, ...prev].slice(0, 10));
      setDisplay(resStr);
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => { setDisplay('0'); setEquation(''); };

  const Btn = ({ label, onClick, color = 'bg-white/5', textColor = 'text-white' }: any) => (
    <button 
      onClick={onClick}
      className={`h-14 rounded-2xl ${color} ${textColor} text-lg font-bold hover:brightness-125 active:scale-95 transition-all shadow-lg border border-white/5`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      <div className="h-16 px-6 border-b border-white/5 flex items-center gap-3 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="p-2 bg-zinc-500/20 rounded-lg">
          <Calculator size={20} className="text-zinc-400" />
        </div>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">Computation Core</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Calc */}
        <div className="flex-1 flex flex-col p-6">
          <div className="h-32 bg-black/40 rounded-3xl border border-white/5 p-6 flex flex-col justify-end items-end mb-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Activity size={80} /></div>
            <div className="text-xs font-mono text-zinc-500 mb-1">{equation}</div>
            <div className="text-4xl font-black font-mono tracking-tighter truncate w-full text-right">{display}</div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Btn label="AC" onClick={clear} color="bg-red-500/20" textColor="text-red-400" />
            <Btn label="+/-" onClick={() => setDisplay(d => (parseFloat(d) * -1).toString())} />
            <Btn label="%" onClick={() => setDisplay(d => (parseFloat(d) / 100).toString())} />
            <Btn label="÷" onClick={() => handleOp('÷')} color="bg-emerald-500/20" textColor="text-emerald-400" />
            
            <Btn label="7" onClick={() => handleDigit('7')} />
            <Btn label="8" onClick={() => handleDigit('8')} />
            <Btn label="9" onClick={() => handleDigit('9')} />
            <Btn label="×" onClick={() => handleOp('×')} color="bg-emerald-500/20" textColor="text-emerald-400" />
            
            <Btn label="4" onClick={() => handleDigit('4')} />
            <Btn label="5" onClick={() => handleDigit('5')} />
            <Btn label="6" onClick={() => handleDigit('6')} />
            <Btn label="-" onClick={() => handleOp('-')} color="bg-emerald-500/20" textColor="text-emerald-400" />
            
            <Btn label="1" onClick={() => handleDigit('1')} />
            <Btn label="2" onClick={() => handleDigit('2')} />
            <Btn label="3" onClick={() => handleDigit('3')} />
            <Btn label="+" onClick={() => handleOp('+')} color="bg-emerald-500/20" textColor="text-emerald-400" />
            
            <Btn label="0" onClick={() => handleDigit('0')} className="col-span-2" />
            <Btn label="." onClick={() => handleDigit('.')} />
            <Btn label="=" onClick={calculate} color="bg-emerald-500" textColor="text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
          </div>
        </div>

        {/* History Sidebar */}
        <div className="w-64 border-l border-white/5 bg-black/20 p-4 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <RotateCcw size={12} /> Computation Logs
          </div>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5 text-[10px] font-mono text-zinc-400 break-all">
                {h}
              </div>
            ))}
            {!history.length && <div className="text-[9px] text-zinc-700 italic">No cycles performed</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
