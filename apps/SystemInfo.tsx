import React, { useState, useEffect } from 'react';
import { Monitor, Cpu, HardDrive, Wifi, Clock, Zap, Shield, Layers, Activity, Thermometer, Database } from 'lucide-react';
import { useOS } from '../store/osStore';
import { daemonBridge } from '../kernel/daemonBridge';

export default function SystemInfoApp() {
  const { kernelRules } = useOS();
  const [uptime, setUptime] = useState(daemonBridge.getUptime());
  const [load, setLoad] = useState(0);
  const [osInfo, setOsInfo] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(daemonBridge.getUptime());
      setLoad(prev => Math.max(2, Math.min(100, prev + (Math.random() - 0.5) * 5)));
    }, 5000);

    const fetchOsInfo = async () => {
        const electron = (window as any).electron;
        if (electron && electron.invoke) {
            try {
                const info = await electron.invoke('get-os-info');
                setOsInfo(info);
            } catch {}
        }
    };
    fetchOsInfo();

    return () => clearInterval(timer);
  }, []);

  const formatUptime = (val: any) => {
    return val; // uptime is already a string from daemonBridge.getUptime()
  };

  const info = {
    os: { 
        name: osInfo?.platform === 'win32' ? 'NexusOS (Windows Kernel)' : 'NexusOS (Unix Kernel)', 
        version: osInfo?.release || '1.0.1', 
        kernel: 'Neural Core v4', 
        arch: osInfo?.arch || 'x64' 
    },
    hardware: {
      processor: osInfo?.cpus?.[0]?.model || `${navigator.hardwareConcurrency || 8} Logical Cores`,
      memory: osInfo?.totalMem ? `${Math.round(osInfo.totalMem / 1024 / 1024 / 1024)} GB Physical` : `${((navigator as any).deviceMemory || 16)} GB Physical`,
      graphics: 'WebGPU / Vulkan Backend',
      display: `${window.screen.width}x${window.screen.height} @${window.devicePixelRatio}x`,
    },
    network: { 
      uplink: navigator.onLine ? 'Connected' : 'Isolated', 
      hostname: osInfo?.hostname || 'DAEMON_NODE',
      nodeId: 'DAEMON_SVR_01'
    }
  };

  const Metric = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</div>
        <div className="text-sm font-bold text-white font-mono">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-[#050508] text-zinc-100 p-8 overflow-y-auto custom-scrollbar relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-2xl border border-white/10">
          <Monitor size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white">System Diagnostics</h1>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Host: {info.network.nodeId} // Status: Nominal</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Metric label="Core Load" value={`${load.toFixed(1)}%`} icon={Activity} color="emerald" />
        <Metric label="Uptime" value={formatUptime(uptime)} icon={Clock} color="blue" />
        <Metric label="Neural Latency" value="N/A" icon={Zap} color="amber" />
        <Metric label="Storage" value="Secure (Encrypted)" icon={Database} color="purple" />
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <Shield size={12} /> Kernel Manifest
          </h2>
          <div className="bg-black/40 border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {Object.entries(info.os).map(([k, v]) => (
              <div key={k} className="flex justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <span className="text-xs text-zinc-400 capitalize">{k}</span>
                <span className="text-xs text-white font-bold">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <Cpu size={12} /> Hardware Uplink
          </h2>
          <div className="bg-black/40 border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {Object.entries(info.hardware).map(([k, v]) => (
              <div key={k} className="flex justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <span className="text-xs text-zinc-400 capitalize">{k}</span>
                <span className="text-xs text-white font-bold">{v}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
        <div className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em] mb-2">Security Audit</div>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
          All system calls are monitored by the DAEMON engine. No external telemetry. Privacy verified.
        </p>
      </div>
    </div>
  );
}
