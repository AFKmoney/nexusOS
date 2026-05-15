import React, { useEffect, useRef, useState } from 'react';
import { 
  ChevronLeft, Brain, Power, Target, Cpu, Zap, Wifi, HardDrive, 
  ArrowUp, ArrowDown, Terminal, RefreshCw, AlertTriangle, ShieldCheck, ChevronRight 
} from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { autonomy } from '../../kernel/autonomy';
import { processManager } from '../../kernel/processManager';
import type { MobileAppProps } from '../types';

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    return (
        <div className="h-6 flex items-end gap-0.5 w-full opacity-40">
            {data.map((val, i) => (
                <div 
                    key={i} 
                    className={`flex-1 rounded-t-sm ${color}`} 
                    style={{ height: `${val}%` }} 
                />
            ))}
        </div>
    );
};

export default function MobileMonitorApp({ onBack }: MobileAppProps) {
  const { 
      kernelRules, updateKernelRules, 
      systemReset, autonomyState, autonomyLog, currentObjective 
  } = useMobile();

  const logEndRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({ cpu: 12, mem: 45, netUp: 0, netDown: 0 });
  const [history, setHistory] = useState<{cpu: number[], mem: number[], net: number[]}>({
      cpu: new Array(15).fill(0),
      mem: new Array(15).fill(0),
      net: new Array(15).fill(0)
  });

  useEffect(() => {
      const interval = setInterval(() => {
          const procs = processManager.listAll();
          const baseCpu = procs.reduce((acc, p) => acc + p.cpuEstimate, 0);
          const newCpu = Math.min(100, Math.floor(baseCpu + (autonomyState !== 'IDLE' ? 15 : 2)));
          
          const maxMem = (window.performance as any)?.memory?.jsHeapSizeLimit || 2000000;
          const usedMem = processManager.getTotalMemory();
          const newMem = Math.max(1, Math.min(100, Math.floor((usedMem / (maxMem / 1024)) * 100)));

          const newNetDown = Math.floor(Math.random() * 500);
          const newNetUp = Math.floor(Math.random() * 100);
          
          setStats({ cpu: newCpu, mem: newMem, netDown: newNetDown, netUp: newNetUp });
          setHistory(prev => ({
              cpu: [...prev.cpu.slice(1), newCpu],
              mem: [...prev.mem.slice(1), newMem],
              net: [...prev.net.slice(1), (newNetDown / 10)]
          }));
      }, 2000);
      return () => clearInterval(interval);
  }, [autonomyState]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [autonomyLog]);

  const toggleAutonomy = () => {
    const nextState = !kernelRules.autonomyEnabled;
    updateKernelRules({ autonomyEnabled: nextState });
    if (nextState) autonomy.start();
    else autonomy.stop();
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-900/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/40 border-b border-white/5 z-10">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-[16px]">System Monitor</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => systemReset(false)} className="p-2 text-zinc-500 active:text-white">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Autonomy Status */}
        <div className="px-4 pt-4">
          <div className={`p-5 rounded-2xl border transition-all ${kernelRules.autonomyEnabled ? 'bg-emerald-950/10 border-emerald-500/30' : 'bg-white/5 border-white/5'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kernelRules.autonomyEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/20'}`}>
                  <Brain className={kernelRules.autonomyEnabled ? "animate-pulse" : ""} size={22} />
                </div>
                <div>
                  <div className="font-bold text-white text-[15px] tracking-tight">NEXUS.AUTONOMY</div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-widest mt-0.5 font-bold">
                    MODE: <span className={
                        autonomyState === 'ANALYZING' ? "text-blue-400" :
                        autonomyState === 'PROMPTING' ? "text-purple-400" :
                        autonomyState === 'EXECUTING' ? "text-emerald-400" : "text-zinc-500"
                    }>{autonomyState}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={toggleAutonomy} 
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${kernelRules.autonomyEnabled ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/40'}`}
              >
                <Power size={20} />
              </button>
            </div>

            {kernelRules.autonomyEnabled ? (
              <div className="space-y-3">
                <div className="bg-black/60 p-4 rounded-xl border border-emerald-900/30 text-sm">
                  <div className="font-bold text-emerald-500/70 uppercase text-[10px] mb-2 flex items-center gap-1.5 tracking-wider">
                    <Target size={12} /> Neural Objective
                  </div>
                  <div className="text-emerald-50/90 leading-relaxed font-mono text-[13px]">{currentObjective}</div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-bold uppercase tracking-wider pl-1">
                  <ShieldCheck size={14} className="text-emerald-500" /> Self-Modification Active
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-white/30 italic">Neural Engine is currently in standby mode.</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 px-4 mt-4">
          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 active:bg-white/10 transition-colors">
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2 text-white/40 text-[12px] font-bold uppercase tracking-wider"><Cpu size={16} /> CPU</div>
              <span className="text-lg font-bold text-white">{stats.cpu}%</span>
            </div>
            <Sparkline data={history.cpu} color="bg-blue-500" />
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 active:bg-white/10 transition-colors">
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2 text-white/40 text-[12px] font-bold uppercase tracking-wider"><Zap size={16} /> RAM</div>
              <span className="text-lg font-bold text-white">{stats.mem}%</span>
            </div>
            <Sparkline data={history.mem} color="bg-pink-500" />
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 active:bg-white/10 transition-colors">
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2 text-white/40 text-[12px] font-bold uppercase tracking-wider"><Wifi size={16} /> NET</div>
              <div className="text-right">
                <div className="text-[12px] text-white/60 flex items-center gap-1 justify-end font-mono"><ArrowDown size={12}/> {stats.netDown}</div>
              </div>
            </div>
            <Sparkline data={history.net} color="bg-cyan-500" />
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 active:bg-white/10 transition-colors">
            <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-2 text-white/40 text-[12px] font-bold uppercase tracking-wider"><HardDrive size={16} /> VFS</div>
              <span className="text-lg font-bold text-white">14%</span>
            </div>
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-purple-500 w-[14%]" />
            </div>
          </div>
        </div>

        {/* Event Stream */}
        <div className="px-4 mt-6">
          <div className="flex flex-col bg-black rounded-2xl border border-white/5 overflow-hidden">
            <div className="bg-white/5 p-3 text-[11px] font-bold text-white/40 flex items-center justify-between border-b border-white/5 px-4 tracking-widest uppercase">
              <span className="flex items-center gap-2"><Terminal size={14} /> Neural Event Stream</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Active</span>
            </div>
            <div className="h-64 overflow-y-auto p-4 font-mono text-[12px] space-y-2.5 custom-scrollbar bg-black/40">
              {autonomyLog.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/10 italic">Waiting for events...</div>
              ) : (
                autonomyLog.map((log, i) => (
                  <div key={i} className={`flex gap-3 border-b border-white/5 pb-2 last:border-0 ${
                      log.includes('ERR') ? 'text-red-400' :
                      log.includes('EXEC') ? 'text-emerald-400 font-bold' :
                      log.includes('STRATEGY') ? 'text-blue-400' :
                      'text-zinc-500'
                  }`}>
                      <span className="opacity-20 shrink-0 select-none text-[10px] mt-0.5">{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className="break-all flex gap-1.5">
                           {log.includes('EXEC') && <ChevronRight size={14} className="mt-0.5 text-emerald-500 shrink-0" />}
                           {log}
                      </span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 px-6 flex justify-between items-center text-[11px] text-white/20 font-mono tracking-tighter uppercase shrink-0">
          <div>Kernel v2.0.0 // Mobile Opt</div>
          <button 
            onClick={() => confirm("Format Virtual Drive?") && systemReset(true)} 
            className="flex items-center gap-1.5 active:text-red-400 transition-colors"
          >
            <AlertTriangle size={12} /> Format System
          </button>
        </div>
      </div>
    </div>
  );
}
