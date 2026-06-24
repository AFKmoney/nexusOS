import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { processManager, ProcessInfo } from '../kernel/processManager';
import { Activity, XCircle, Cpu, HardDrive, RefreshCw } from 'lucide-react';

export default function TaskManager() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [totalMem, setTotalMem] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const { closeWindow, windows } = useOS();

  useEffect(() => {
    const update = () => {
      setProcesses(processManager.listAll());
      setTotalMem(processManager.getTotalMemory());
    };
    update();
    const t = setInterval(() => {
      update();
      setRefreshTick(n => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [windows.length]);

  const handleKill = (windowId: string) => {
    closeWindow(windowId);
  };

  const getUptime = (windowId: string) => processManager.getUptime(windowId);

  // Real CPU usage based on V2 ProcessManager
  const cpuUsage = Math.min(100, processes.reduce((acc, p) => acc + p.cpuEstimate, 0));
  const memUsageGB = (totalMem / 1024 / 1024).toFixed(2);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-zinc-300 font-mono text-sm overflow-hidden">
      {/* Header Stats */}
      <div className="flex gap-4 p-4 bg-zinc-900 border-b border-white/5 shrink-0">
        <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 flex gap-4 items-center relative overflow-hidden group">
           <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
           <Cpu className="text-emerald-400 group-hover:scale-110 transition-transform" size={32} />
           <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">CPU Load</div>
              <div className="text-2xl font-light text-white">{cpuUsage}%</div>
           </div>
        </div>
        <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 flex gap-4 items-center relative overflow-hidden group">
           <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
           <HardDrive className="text-cyan-400 group-hover:scale-110 transition-transform" size={32} />
           <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Memory Allocated</div>
              <div className="text-2xl font-light text-white">{memUsageGB} GB</div>
           </div>
        </div>
        <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 flex gap-4 items-center relative overflow-hidden group">
           <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
           <Activity className="text-purple-400 group-hover:scale-110 transition-transform" size={32} />
           <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Active Threads</div>
              <div className="text-2xl font-light text-white">{processes.length * 4 + 12}</div>
           </div>
        </div>
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-white font-bold tracking-widest uppercase text-xs flex items-center gap-2">
               <Activity size={14} className="text-emerald-500" />
               Process Table
            </h2>
            <button className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">
               <RefreshCw size={12} className={refreshTick % 2 === 0 ? 'text-emerald-400' : 'text-zinc-600'} /> Auto-Sync
            </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-white/5 bg-zinc-900/50">
              <th className="p-3 font-medium">PID</th>
              <th className="p-3 font-medium">Process Name</th>
              <th className="p-3 font-medium">Status / Priority</th>
              <th className="p-3 font-medium text-right">CPU</th>
              <th className="p-3 font-medium text-right">Uptime</th>
              <th className="p-3 font-medium text-right">Memory</th>
              <th className="p-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {processes.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-8 text-zinc-600">No active processes monitored.</td>
              </tr>
            )}
            {processes.map(p => (
              <tr key={p.windowId} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="p-3 text-zinc-500 text-xs">#{p.pid}</td>
                <td className="p-3 text-white font-medium flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                  {p.name}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                      p.state === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      p.state === 'minimized' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' :
                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {p.state}
                    </span>
                    <span className={`text-[9px] uppercase font-bold tracking-widest ${
                      p.priority === 'real-time' ? 'text-purple-400' :
                      p.priority === 'high' ? 'text-red-400' :
                      p.priority === 'idle' ? 'text-zinc-500' : 'text-blue-400'
                    }`}>
                      PRIO: {p.priority}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-right text-xs text-blue-400 font-bold">{p.cpuEstimate}%</td>
                <td className="p-3 text-right text-xs text-zinc-400">{getUptime(p.windowId)}</td>
                <td className="p-3 text-right text-xs text-cyan-400">{(p.memoryEstimate / 1024).toFixed(1)} MB</td>
                <td className="p-3 text-center">
                   <button 
                      onClick={() => handleKill(p.windowId)}
                      className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      title="Kill Process"
                   >
                     <XCircle size={14} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
