import React, { useState, useEffect } from 'react';
import { useOS } from '../../store/osStore';
import { Cpu, HardDrive, Monitor, Server, RefreshCw, ChevronLeft } from 'lucide-react';
import type { MobileAppProps } from '../types';

export default function MobileDeviceManagerApp({ onBack }: MobileAppProps) {
  const [hwInfo, setHwInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = async () => {
    try {
      if (window.electron && window.electron.invoke) {
        const data = await window.electron.invoke('get-os-info');
        setHwInfo(data);
      } else {
        setHwInfo({ error: 'Native Electron IPC not available.' });
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
      <div className="flex flex-col h-full bg-[#0A0A0A]">
         <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-zinc-900 border-b border-white/5">
            <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
              <ChevronLeft size={22} className="text-white" />
            </button>
            <h1 className="text-white font-semibold text-[16px]">Hardware Probe</h1>
         </div>
         <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 font-mono text-sm uppercase tracking-widest gap-4">
            <RefreshCw className="animate-spin text-emerald-400" size={32} />
            <span>Scanning Hardware...</span>
         </div>
      </div>
    );
  }

  if (hwInfo?.error) {
    return (
      <div className="flex flex-col h-full bg-[#0A0A0A]">
         <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-zinc-900 border-b border-white/5">
            <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
              <ChevronLeft size={22} className="text-white" />
            </button>
            <h1 className="text-white font-semibold text-[16px]">Device Error</h1>
         </div>
         <div className="flex-1 flex flex-col items-center justify-center p-8 text-red-500 font-mono text-sm text-center leading-relaxed">
            <Server size={48} className="mb-4 text-red-900/50" />
            <span className="font-bold">Hardware Connection Failed</span>
            <span className="mt-2 text-zinc-500 text-xs">{hwInfo.error}</span>
            <span className="mt-6 text-zinc-600 text-[10px] max-w-[200px]">Physical hardware access requires the NexusOS Electron environment.</span>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-zinc-300 font-sans overflow-hidden">
      {/* Mobile Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-zinc-900 border-b border-white/5 z-50 relative">
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
             <Server size={16} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-[16px] leading-tight">Device Manager</h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tight">Node.js Bridge Active</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6 pb-20">
         {/* CPU INFO */}
         <section>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
               <Cpu size={14} className="text-emerald-500" /> Core Processing
            </h3>
            <div className="space-y-3">
               <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
                  <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Architecture</div>
                  <div className="text-lg font-bold text-white uppercase">{hwInfo.arch}</div>
               </div>
               
               {hwInfo.cpus?.[0] && (
                  <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                       <Cpu size={20} className="text-emerald-400" />
                     </div>
                     <div className="overflow-hidden">
                       <div className="text-sm font-bold text-white truncate">{hwInfo.cpus[0].model}</div>
                       <div className="text-[10px] text-zinc-500 mt-0.5">{hwInfo.cpus.length} Threads @ {hwInfo.cpus[0].speed} MHz</div>
                     </div>
                  </div>
               )}
            </div>
         </section>

         {/* MEMORY INFO */}
         <section>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
               <HardDrive size={14} className="text-blue-500" /> Physical Memory
            </h3>
            <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-end mb-4">
                   <div>
                     <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Free</div>
                     <div className="text-2xl font-light text-white">
                        {(hwInfo.freeMem / 1024 / 1024 / 1024).toFixed(2)} <span className="text-xs font-bold text-zinc-600">GB</span>
                     </div>
                   </div>
                   <div className="text-right">
                     <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Total</div>
                     <div className="text-sm font-bold text-white">{(hwInfo.totalMem / 1024 / 1024 / 1024).toFixed(2)} GB</div>
                   </div>
                </div>
                {/* Visual Bar */}
                <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5">
                   <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                      style={{ width: `${Math.min(100, Math.max(0, 100 - (hwInfo.freeMem / hwInfo.totalMem) * 100))}%` }}
                   />
                </div>
                <p className="text-[9px] text-zinc-600 mt-2 text-center uppercase tracking-tighter">Usage Index: {Math.round(100 - (hwInfo.freeMem / hwInfo.totalMem) * 100)}%</p>
            </div>
         </section>

         {/* HOST OS INFO */}
         <section>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
               <Monitor size={14} className="text-purple-500" /> Environment
            </h3>
            <div className="grid grid-cols-1 gap-3">
               <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Platform</div>
                    <div className="text-sm font-bold text-white uppercase">{hwInfo.platform}</div>
                  </div>
                  <div className="text-[10px] text-zinc-500 bg-white/5 px-2 py-1 rounded-md">{hwInfo.release}</div>
               </div>
               
               <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Uptime</div>
                      <div className="text-sm font-bold text-white">{(hwInfo.uptime / 60 / 60).toFixed(1)} Hours</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Hostname</div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">{hwInfo.hostname}</div>
                    </div>
                  </div>
               </div>
            </div>
         </section>
      </div>
    </div>
  );
}
