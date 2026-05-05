import React from 'react';
import { ChevronLeft, Cpu, HardDrive, Globe, Monitor, Smartphone, Info } from 'lucide-react';
import type { MobileAppProps } from '../types';

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="mb-4">
      <p className="section-header pl-0">{title}</p>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        {rows.map(([k, v], i) => (
          <div key={k} className="flex items-center px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <p className="text-white/50 text-[13px] flex-1">{k}</p>
            <p className="text-white text-[13px] font-medium text-right max-w-[55%] truncate">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MobileSystemInfo({ onBack }: MobileAppProps) {
  const ua = navigator.userAgent;
  const conn = (navigator as any).connection;
  const mem = (performance as any).memory;

  const rows: Record<string, [string, string][]> = {
    'NexusOS': [
      ['Name', 'NexusOS Mobile'],
      ['Version', '2.0.5'],
      ['Edition', 'Mobile / PWA'],
      ['Neural Engine', 'DAEMON v2.0'],
      ['Build', import.meta.env.MODE ?? 'production'],
    ],
    'Runtime': [
      ['Platform', navigator.platform || 'Unknown'],
      ['Language', navigator.language],
      ['Cores', String(navigator.hardwareConcurrency ?? '?')],
      ['Online', navigator.onLine ? 'Yes' : 'No'],
      ['Cookies', navigator.cookieEnabled ? 'Enabled' : 'Disabled'],
    ],
    'Memory': mem ? [
      ['JS Heap Used', (mem.usedJSHeapSize / 1048576).toFixed(1) + ' MB'],
      ['JS Heap Total', (mem.totalJSHeapSize / 1048576).toFixed(1) + ' MB'],
      ['JS Heap Limit', (mem.jsHeapSizeLimit / 1048576).toFixed(1) + ' MB'],
    ] : [['Memory API', 'Not available']],
    'Display': [
      ['Screen', `${screen.width}×${screen.height}`],
      ['Viewport', `${window.innerWidth}×${window.innerHeight}`],
      ['Pixel Ratio', String(window.devicePixelRatio)],
      ['Color Depth', String(screen.colorDepth) + ' bit'],
    ],
    'Network': conn ? [
      ['Type', conn.effectiveType ?? '?'],
      ['Downlink', conn.downlink ? conn.downlink + ' Mbps' : '?'],
      ['RTT', conn.rtt ? conn.rtt + ' ms' : '?'],
      ['Save Data', conn.saveData ? 'Yes' : 'No'],
    ] : [['Connection', navigator.onLine ? 'Online' : 'Offline']],
    'Storage': [
      ['localStorage', (() => { try { return (JSON.stringify(localStorage).length / 1024).toFixed(1) + ' KB used'; } catch { return 'N/A'; } })()],
      ['Session', 'Browser session'],
      ['IndexedDB', 'Available'],
      ['Cache API', 'caches' in window ? 'Available' : 'N/A'],
    ],
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">System Info</h1>
      </div>

      {/* Header banner */}
      <div className="flex items-center gap-4 px-5 py-5 flex-shrink-0"
        style={{ background: 'rgba(16,185,129,0.05)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Cpu size={28} className="text-emerald-400" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-white text-lg font-bold">NexusOS Mobile</h2>
          <p className="text-white/50 text-[13px]">v2.0.5 · Sovereign Neural OS</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400/70 text-[11px]">All systems nominal</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        {Object.entries(rows).map(([title, rowList]) => (
          <Section key={title} title={title} rows={rowList} />
        ))}
        <p className="text-white/15 text-[11px] text-center mt-2 mb-4">
          NexusOS Mobile v2.0.5 · Built with React 19 + Zustand 5
        </p>
      </div>
    </div>
  );
}
