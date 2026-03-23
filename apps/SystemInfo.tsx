import React from 'react';
import { Monitor, Cpu, HardDrive, Wifi, Clock, Zap, Shield, Layers } from 'lucide-react';

export default function SystemInfoApp() {
  const info = {
    os: { name: 'NexusOS', version: '4.2.0', kernel: 'Neural Core v3', arch: 'WebAssembly x86_64' },
    hardware: {
      cpu: `${navigator.hardwareConcurrency || 8} cores`,
      memory: `${((navigator as any).deviceMemory || 8)} GB`,
      gpu: 'WebGL 2.0 Renderer',
      display: `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`,
    },
    network: { status: navigator.onLine ? 'Online' : 'Offline', protocol: 'HTTPS/2', userAgent: navigator.userAgent.slice(0, 80) },
    runtime: { 
      uptime: `${Math.floor(performance.now() / 60000)} min`, 
      language: navigator.language, 
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled ? 'Yes' : 'No',
    },
  };

  const Section = ({ title, icon: Icon, data }: { title: string; icon: any; data: Record<string, string> }) => (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-emerald-400" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{title}</span>
      </div>
      <div className="bg-white/5 rounded-xl border border-white/5 divide-y divide-white/5">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-2">
            <span className="text-xs text-zinc-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
            <span className="text-xs text-white font-mono">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-auto p-5 bg-[#050508] text-zinc-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/10 rounded-xl"><Monitor size={20} className="text-emerald-400" /></div>
        <div>
          <div className="text-lg font-bold text-white">{info.os.name}</div>
          <div className="text-xs text-zinc-500">v{info.os.version} • {info.os.kernel}</div>
        </div>
      </div>
      <Section title="System" icon={Zap} data={info.os} />
      <Section title="Hardware" icon={Cpu} data={info.hardware} />
      <Section title="Network" icon={Wifi} data={info.network} />
      <Section title="Runtime" icon={Clock} data={info.runtime} />
    </div>
  );
}
