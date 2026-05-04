import React, { useState, useEffect } from 'react';
import { ChevronLeft, Cpu, HardDrive, Wifi, Zap, Activity, Database, Globe, Clock } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

function StatCard({ icon: Icon, label, value, color, bar }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bar?: number;
}) {
  return (
    <div className="p-4 rounded-2xl flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: color + '20' }}>
            <Icon size={16} style={{ color }} strokeWidth={2} />
          </div>
          <span className="text-white/60 text-[13px]">{label}</span>
        </div>
        <span className="text-white font-semibold text-[15px]">{value}</span>
      </div>
      {bar !== undefined && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${bar}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
          />
        </div>
      )}
    </div>
  );
}

export default function MobileDashboard({ onBack }: MobileAppProps) {
  const { kernelRules, autonomyLog, currentObjective } = useMobile();
  const [uptime, setUptime] = useState(0);
  const [cpuLoad, setCpuLoad] = useState(0);
  const [memUsage, setMemUsage] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      setUptime(Math.floor((Date.now() - start) / 1000));
      setCpuLoad(Math.round(20 + Math.random() * 40));
      if ('memory' in performance) {
        const m = (performance as any).memory;
        setMemUsage(Math.round((m.usedJSHeapSize / m.jsHeapSizeLimit) * 100));
      } else {
        setMemUsage(Math.round(30 + Math.random() * 30));
      }
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const fmtUptime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">Dashboard</h1>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/70 text-[12px]">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* DAEMON Status */}
        <div className="p-4 rounded-2xl"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)' }}>
              <Zap size={18} className="text-emerald-400" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white font-semibold text-[15px]">DAEMON Neural</p>
              <p className="text-emerald-400/70 text-[12px]">{currentObjective || 'Monitoring system'}</p>
            </div>
            <div className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-400"
              style={{ background: 'rgba(16,185,129,0.15)' }}>
              {kernelRules.autonomyEnabled ? 'ACTIVE' : 'STANDBY'}
            </div>
          </div>
          {autonomyLog.length > 0 && (
            <div className="space-y-1 font-mono text-[11px] text-emerald-400/50">
              {autonomyLog.slice(-3).map((log, i) => (
                <p key={i} className="truncate">{'> '}{log}</p>
              ))}
            </div>
          )}
        </div>

        {/* System Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Cpu} label="CPU" value={`${cpuLoad}%`} color="#10b981" bar={cpuLoad} />
          <StatCard icon={Database} label="Memory" value={`${memUsage}%`} color="#6366f1" bar={memUsage} />
          <StatCard icon={HardDrive} label="Storage" value="2.1 GB" color="#f59e0b" bar={42} />
          <StatCard icon={Wifi} label="Network" value="Online" color="#06b6d4" />
        </div>

        {/* Uptime */}
        <div className="p-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Clock size={18} className="text-white/40" />
          <div>
            <p className="text-white/60 text-[12px]">Session Uptime</p>
            <p className="text-white font-semibold text-[15px]">{fmtUptime(uptime)}</p>
          </div>
        </div>

        {/* System Info */}
        <div className="space-y-1">
          <p className="section-header pl-0">System</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              ['OS', 'NexusOS Mobile 1.0.0'],
              ['Runtime', 'Browser / PWA'],
              ['AI Model', kernelRules.modelId || 'claude-sonnet-4-6'],
              ['Platform', navigator.platform || 'Mobile'],
            ].map(([k, v], i) => (
              <div key={i} className="flex items-center px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p className="text-white/50 text-[13px] w-24 flex-shrink-0">{k}</p>
                <p className="text-white text-[13px] font-medium truncate">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
