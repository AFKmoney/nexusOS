import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Activity, Cpu, HardDrive, RefreshCw, XCircle, 
  MoreVertical, Shield, Clock, Search
} from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { processManager, ProcessInfo } from '../../kernel/processManager';
import type { MobileAppProps } from '../types';

export default function MobileTaskManagerApp({ onBack }: MobileAppProps) {
  const { closeApp } = useMobile();
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [totalMem, setTotalMem] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const update = () => {
      setProcesses(processManager.listAll());
      setTotalMem(processManager.getTotalMemory());
    };
    update();
    const t = setInterval(() => {
      update();
      setRefreshTick(n => n + 1);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const handleKill = (windowId: string, appId: string) => {
    // In mobile, windowId corresponds to the instance id in appStack
    // But closeApp takes appId. We should probably use a more specific close
    // For now, following mobileStore.ts convention:
    closeApp(appId);
    processManager.kill(windowId);
  };

  const cpuUsage = Math.min(100, processes.reduce((acc, p) => acc + p.cpuEstimate, 0));
  const memUsageMB = (totalMem / 1024).toFixed(1);

  const filteredProcesses = processes.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.appId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-[#080808] text-zinc-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-[16px]">Task Manager</h1>
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${refreshTick % 2 === 0 ? 'bg-emerald-500' : 'bg-emerald-900'} transition-colors duration-500`} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 py-4 shrink-0">
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-500/60 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Cpu size={14} /> CPU Load
          </div>
          <div className="text-2xl font-light text-emerald-400">{cpuUsage}%</div>
          <div className="w-full bg-emerald-500/10 h-1 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${cpuUsage}%` }} />
          </div>
        </div>
        <div className="bg-cyan-500/5 border border-cyan-500/10 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-cyan-500/60 text-[10px] font-bold uppercase tracking-wider mb-1">
            <HardDrive size={14} /> Memory
          </div>
          <div className="text-2xl font-light text-cyan-400">{memUsageMB} <span className="text-xs uppercase opacity-60">MB</span></div>
          <div className="w-full bg-cyan-500/10 h-1 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: `${Math.min(100, (totalMem/500000)*100)}%` }} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            type="text"
            placeholder="Search processes..."
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[14px] focus:bg-white/10 transition-all outline-none text-white"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-[11px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
            <Activity size={12} /> Active Processes ({filteredProcesses.length})
          </h2>
        </div>

        {filteredProcesses.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-white/10">
            <Activity size={48} strokeWidth={1} className="mb-4" />
            <p>No processes found</p>
          </div>
        ) : (
          filteredProcesses.map(p => (
            <div 
              key={p.windowId}
              className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-4 active:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 shrink-0">
                <Activity size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-[14px] font-semibold truncate">{p.name}</span>
                  <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/30 font-mono">#{p.pid}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[11px] text-white/40">
                    <Cpu size={10} className="text-emerald-500/50" />
                    <span>{p.cpuEstimate}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-white/40">
                    <HardDrive size={10} className="text-cyan-500/50" />
                    <span>{(p.memoryEstimate / 1024).toFixed(1)} MB</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-white/40">
                    <Clock size={10} className="text-purple-500/50" />
                    <span>{processManager.getUptime(p.windowId)}</span>
                  </div>
                </div>
              </div>
              <button 
                className="w-10 h-10 flex items-center justify-center text-red-500/40 active:text-red-500 active:bg-red-500/10 rounded-xl transition-all"
                onClick={() => handleKill(p.windowId, p.appId)}
              >
                <XCircle size={20} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
          <Shield size={12} /> Secure Kernel Subsystem
        </div>
        <div className="text-[10px] text-white/20 font-mono uppercase">
          {processes.length * 4 + 12} Threads
        </div>
      </div>
    </div>
  );
}
