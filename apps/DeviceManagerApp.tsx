import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { Cpu, HardDrive, Monitor, Server, RefreshCw } from 'lucide-react';

export default function DeviceManagerApp() {
  const [hwInfo, setHwInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = async () => {
    try {
      if (window.electron && window.electron.invoke) {
        const data = await window.electron.invoke('get-os-info');
        setHwInfo(data);
      } else {
        setHwInfo({ error: 'Native Electron IPC not available. Running in web mode.' });
      }
    } catch (e: any) {
      setHwInfo({ error: e.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInfo();
    const t = setInterval(fetchInfo, 5000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#111] text-zinc-500 font-mono text-sm uppercase tracking-widest">
        <RefreshCw className="animate-spin mr-3" size={16} /> Probing Hardware...
      </div>
    );
  }

  if (hwInfo?.error) {
    return (
      <div className="flex items-center justify-center p-8 h-full bg-[#111] text-red-500 font-mono text-sm text-center leading-relaxed">
        Hardware connection failed.<br/>{hwInfo.error}<br/><br/>
        <span className="text-zinc-500 text-xs">Ensure NexusOS is running via Electron wrapper for physical hardware access.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-zinc-300 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
               <Server size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">Physical Device Manager</div>
              <div className="text-xs text-zinc-500">Node.js Hardware Bridge Active</div>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
         {/* CPU INFO */}
         <div className="mb-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
               <Cpu size={14} className="text-emerald-500" /> Core Processing
            </h3>
            <div className="grid grid-cols-2 gap-3">
               <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Architecture</div>
                  <div className="text-sm font-bold text-white uppercase">{hwInfo.arch}</div>
               </div>
               <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Logical Cores</div>
                  <div className="text-sm font-bold text-white">{hwInfo.cpus?.length || 0} Threads</div>
               </div>
            </div>
            {hwInfo.cpus?.[0] && (
                <div className="p-4 bg-black/40 border border-white/5 rounded-xl mt-3 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                     <Cpu size={16} className="text-emerald-400" />
                   </div>
                   <div>
                     <div className="text-sm font-bold text-white leading-tight">{hwInfo.cpus[0].model}</div>
                     <div className="text-xs text-zinc-500">Base Clock: {hwInfo.cpus[0].speed} MHz</div>
                   </div>
                </div>
            )}
         </div>

         {/* MEMORY INFO */}
         <div className="mb-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
               <HardDrive size={14} className="text-blue-500" /> Physical Memory
            </h3>
            <div className="p-4 bg-black/40 border border-white/5 rounded-xl relative overflow-hidden">
                <div className="flex justify-between items-end mb-2 relative z-10">
                   <div>
                     <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Available RAM</div>
                     <div className="text-xl font-light text-white">
                        {(hwInfo.freeMem / 1024 / 1024 / 1024).toFixed(2)} <span className="text-sm font-bold text-zinc-600">GB</span>
                     </div>
                   </div>
                   <div className="text-right">
                     <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total Installed</div>
                     <div className="text-sm font-bold text-white">{(hwInfo.totalMem / 1024 / 1024 / 1024).toFixed(2)} GB</div>
                   </div>
                </div>
                {/* Visual Bar */}
                <div className="w-full h-1.5 bg-zinc-900 rounded-full mt-3 overflow-hidden border border-white/5 relative z-10">
                   <div 
                      className="h-full bg-blue-500 transition-all duration-1000"
                      style={{ width: `${100 - (hwInfo.freeMem / hwInfo.totalMem) * 100}%` }}
                   />
                </div>
            </div>
         </div>

         {/* HOST OS INFO */}
         <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
               <Monitor size={14} className="text-purple-500" /> Host Environment
            </h3>
            <div className="grid grid-cols-2 gap-3">
               <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Platform</div>
                  <div className="text-sm font-bold text-white uppercase">{hwInfo.platform}</div>
                  <div className="text-[10px] text-zinc-600 truncate mt-0.5">{hwInfo.release}</div>
               </div>
               <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">System Uptime</div>
                  <div className="text-sm font-bold text-white">{(hwInfo.uptime / 60 / 60).toFixed(1)} Hours</div>
                  <div className="text-[10px] text-zinc-600 truncate mt-0.5">{hwInfo.hostname}</div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
