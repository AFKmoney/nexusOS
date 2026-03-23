import React, { useEffect, useState } from 'react';
import { useOS } from '../store/osStore';
import { localBrain } from '../services/localBrain';
import { memory } from '../kernel/memory';
import { toolForge } from '../kernel/toolForge';
import { daemonBridge } from '../kernel/daemonBridge';
import { errorGuard } from '../kernel/errorGuard';
import {
  Cpu, Zap, Brain, Shield, Terminal, Clock, BarChart2, Activity,
  Box, ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, Gauge,
  HardDrive, Wifi, WifiOff, Monitor
} from 'lucide-react';

export default function DashboardApp() {
  const { registry, windows, autonomyLog, autonomyState, uiScale } = useOS();
  const [modelStatus, setModelStatus] = useState('Checking...');
  const [memories, setMemories] = useState(0);
  const [tools, setTools] = useState<string[]>([]);
  const [uptime, setUptime] = useState('—');
  const [time, setTime] = useState(new Date());
  const [guardStats, setGuardStats] = useState({ total: 0, corrected: 0, autoFixed: 0, failed: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setGuardStats(errorGuard.getStats());
      setIsOnline(navigator.onLine);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setModelStatus(localBrain.isReady() ? `✓ ${localBrain.getActiveModel().name}` : '⏳ No model loaded');
    const allMem = memory.getRecent(100);
    setMemories(allMem.length);
    toolForge.getAllTools().then(allTools => {
      setTools(allTools.map(t => t.name));
    });
    setUptime(daemonBridge.getUptime());
    setGuardStats(errorGuard.getStats());
  }, []);

  const successRate = guardStats.total > 0
    ? Math.round(((guardStats.total - guardStats.failed) / guardStats.total) * 100)
    : 100;

  const recentLogs = autonomyLog.slice(-5).reverse();

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-3">
          <BarChart2 size={18} className="text-emerald-400" />
          <span className="font-bold tracking-widest text-sm uppercase text-white">DAEMON Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs">
            {isOnline ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-rose-400" />}
            <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>{isOnline ? 'Online' : 'Offline'}</span>
          </span>
          <span className="text-zinc-500 text-sm font-mono">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
        {/* ── Top Stats Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Apps', value: registry.length, icon: Box, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Windows', value: windows.length, icon: Monitor, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Memory', value: memories, icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Tools', value: tools.length, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} backdrop-blur-sm border border-white/5 rounded-2xl p-3 flex items-center gap-3`}>
              <s.icon size={20} className={s.color} />
              <div>
                <div className="text-xl font-bold leading-tight">{s.value}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Two-column panel row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {/* DAEMON Core Status */}
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Shield size={12} className="text-emerald-500" />
              DAEMON CORE
            </div>
            <div className="space-y-2 text-sm font-mono">
              {[
                ['Model', modelStatus, localBrain.isReady() ? 'text-emerald-400' : 'text-amber-400'],
                ['Uptime', uptime, 'text-emerald-300'],
                ['Autonomy', autonomyState, autonomyState === 'IDLE' ? 'text-zinc-400' : 'text-emerald-400 animate-pulse'],
                ['Boot Count', String(daemonBridge.getBootCount()), 'text-cyan-300'],
                ['UI Scale', `${Math.round(uiScale * 100)}%`, 'text-violet-300'],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-zinc-400">{label}</span>
                  <span className={cls as string}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── ErrorGuard Stats Panel ──────────────────────────────────── */}
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldAlert size={12} className="text-rose-400" />
              ERROR GUARD
            </div>
            <div className="space-y-2">
              {/* Success Rate Bar */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-400">Success Rate</span>
                <span className={`text-sm font-bold ${successRate >= 90 ? 'text-emerald-400' : successRate >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {successRate}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${successRate >= 90 ? 'bg-emerald-500' : successRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${successRate}%` }}
                />
              </div>
              {/* Detailed Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                <div className="flex items-center gap-1.5">
                  <Gauge size={12} className="text-zinc-500" />
                  <span className="text-zinc-400">Total</span>
                  <span className="ml-auto text-white">{guardStats.total}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-zinc-400">Corrected</span>
                  <span className="ml-auto text-emerald-400">{guardStats.corrected}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw size={12} className="text-cyan-500" />
                  <span className="text-zinc-400">Auto-Fix</span>
                  <span className="ml-auto text-cyan-400">{guardStats.autoFixed}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-rose-500" />
                  <span className="text-zinc-400">Failed</span>
                  <span className="ml-auto text-rose-400">{guardStats.failed}</span>
                </div>
              </div>
              {guardStats.total === 0 && (
                <div className="text-[10px] text-zinc-600 mt-2 text-center">No AI generations yet this session</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Forged Tools ──────────────────────────────────────────────── */}
        {tools.length > 0 && (
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Zap size={12} className="text-amber-400" />
              FORGED TOOLS ({tools.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {tools.map(t => (
                <span key={t} className="px-2 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Autonomy Feed ────────────────────────────────────────────── */}
        <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Terminal size={12} className="text-cyan-400" />
            AUTONOMY FEED
          </div>
          <div className="space-y-1 font-mono text-xs">
            {recentLogs.length === 0 ? (
              <span className="text-zinc-600">No activity yet. DAEMON is booting...</span>
            ) : recentLogs.map((log, i) => (
              <div key={i} className="text-emerald-400/80 truncate">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
