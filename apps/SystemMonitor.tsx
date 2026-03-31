
import React, { useEffect, useRef, useState } from 'react';
import { useOS } from '../store/osStore';
import { autonomy } from '../kernel/autonomy';
import { processManager } from '../kernel/processManager';
import { Cpu, Brain, AlertTriangle, Power, RefreshCw, Terminal, Target, Activity, HardDrive, Wifi, Zap, ArrowUp, ArrowDown, MessageSquare, ChevronRight, ShieldCheck } from 'lucide-react';

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    return (
        <div className="h-8 flex items-end gap-0.5 w-full opacity-50">
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

export default function MonitorApp() {
  const { 
      kernelRules, updateKernelRules, 
      systemReset, autonomyState, autonomyLog, currentObjective, currentSelfPrompt
  } = useOS();

  const logEndRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({ cpu: 12, mem: 45, netUp: 0, netDown: 0 });
  const [history, setHistory] = useState<{cpu: number[], mem: number[], net: number[]}>({
      cpu: new Array(20).fill(0),
      mem: new Array(20).fill(0),
      net: new Array(20).fill(0)
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
      }, 1000);
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
    <div className="h-full bg-[#050505] p-6 text-zinc-300 font-mono text-base overflow-hidden flex flex-col selection:bg-cyan-900/30">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${kernelRules.autonomyEnabled ? 'bg-emerald-950/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-zinc-900/30 border-zinc-800'}`}>
             <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <Brain className={kernelRules.autonomyEnabled ? "text-emerald-400 animate-pulse" : "text-zinc-600"} size={20} />
                        <div>
                            <div className="font-bold text-white tracking-widest uppercase text-sm">NEXUS.AUTONOMY</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                                MODE: <span className={
                                    autonomyState === 'ANALYZING' ? "text-blue-400 animate-pulse" :
                                    autonomyState === 'PROMPTING' ? "text-purple-400 animate-pulse" :
                                    autonomyState === 'EXECUTING' ? "text-emerald-400" : "text-zinc-500"
                                }>{autonomyState}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={toggleAutonomy} className={`p-2 rounded-lg transition-all ${kernelRules.autonomyEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        <Power size={18} />
                    </button>
                </div>
                
                {kernelRules.autonomyEnabled ? (
                    <div className="space-y-2">
                        <div className="bg-black/40 p-3 rounded border border-emerald-900/30 text-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                            <div className="font-bold text-emerald-700 uppercase text-xs mb-1 flex items-center gap-1">
                                <Target size={14} /> Neural Objective
                            </div>
                            <div className="text-emerald-100 truncate">{currentObjective}</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 font-bold uppercase">
                            <ShieldCheck size={14} className="text-emerald-500" /> System Self-Modification Enabled
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-zinc-600 italic py-2">Neural Engine standby.</div>
                )}
             </div>
             <div className="text-xs text-zinc-600 pt-2 border-t border-zinc-800/50 mt-2">
                 Kernel Integration: v2.0.0 // Active-Loop: 25s
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-lg flex flex-col justify-between h-28 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                  <div className="flex justify-between items-start z-10">
                      <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold uppercase"><Cpu size={18} /> CPU</div>
                      <span className="text-xl font-bold text-white">{stats.cpu}%</span>
                  </div>
                  <Sparkline data={history.cpu} color="bg-blue-500" />
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-lg flex flex-col justify-between h-28 relative overflow-hidden group hover:border-pink-500/30 transition-colors">
                  <div className="flex justify-between items-start z-10">
                      <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold uppercase"><Zap size={18} /> RAM</div>
                      <span className="text-xl font-bold text-white">{stats.mem}%</span>
                  </div>
                  <Sparkline data={history.mem} color="bg-pink-500" />
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-lg flex flex-col justify-between h-28 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                  <div className="flex justify-between items-start z-10">
                      <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold uppercase"><Wifi size={18} /> NET</div>
                      <div className="text-right">
                          <div className="text-sm text-zinc-400 flex items-center gap-1 justify-end"><ArrowDown size={14}/> {stats.netDown}</div>
                      </div>
                  </div>
                  <Sparkline data={history.net} color="bg-cyan-500" />
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-lg flex flex-col justify-between h-28 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                  <div className="flex justify-between items-start z-10">
                      <div className="flex items-center gap-2 text-zinc-500 text-sm font-bold uppercase"><HardDrive size={18} /> VFS</div>
                      <span className="text-xl font-bold text-white">14%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-4">
                      <div className="h-full bg-purple-500 w-[14%]" />
                  </div>
              </div>
          </div>
      </div>

      <div className="flex-1 flex flex-col bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-inner min-h-0">
          <div className="bg-zinc-900/80 p-2 text-xs font-bold text-zinc-500 flex items-center justify-between border-b border-zinc-800 px-4">
              <span className="flex items-center gap-2"><Terminal size={16} /> NEURAL EVENT STREAM</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> ACTIVE</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2 custom-scrollbar">
              {autonomyLog.map((log, i) => (
                  <div key={i} className={`flex gap-3 border-b border-white/5 pb-1 ${
                      log.includes('ERR') ? 'text-red-400' :
                      log.includes('EXEC') ? 'text-emerald-400 font-bold' :
                      log.includes('STRATEGY') ? 'text-blue-400' :
                      'text-zinc-400'
                  }`}>
                      <span className="opacity-30 shrink-0 select-none w-14">{new Date().toLocaleTimeString().split(' ')[0]}</span>
                      <span className="break-all flex gap-2">
                           {log.includes('EXEC') && <ChevronRight size={16} className="mt-0.5 text-emerald-500" />}
                           {log}
                      </span>
                  </div>
              ))}
              <div ref={logEndRef} />
          </div>
      </div>

      <div className="mt-4 flex justify-between items-center text-sm text-zinc-600 shrink-0">
          <div>NEXUS OS KERNEL v2.0.0</div>
          <div className="flex gap-4">
              <button onClick={() => systemReset(false)} className="hover:text-white transition-colors flex items-center gap-1">
                  <RefreshCw size={14} /> WARM_BOOT
              </button>
              <button onClick={() => confirm("Total System Wipe?") && systemReset(true)} className="hover:text-red-400 transition-colors flex items-center gap-1">
                  <AlertTriangle size={14} /> FORMAT
              </button>
          </div>
      </div>
    </div>
  );
}
