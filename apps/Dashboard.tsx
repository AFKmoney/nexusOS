import React, { useEffect, useState } from 'react';
import { useOS } from '../store/osStore';
import { localBrain } from '../services/localBrain';
import { memory } from '../kernel/memory';
import { toolForge } from '../kernel/toolForge';
import { daemonBridge } from '../kernel/daemonBridge';
import { errorGuard } from '../kernel/errorGuard';
import { aiGateway, FAILOVER_DEGRADED_WINDOW_MS } from '../services/aiProviders';
import type { ProviderHealth } from '../services/aiProviders';
import {
  Cpu, Zap, Brain, Shield, Terminal, Clock, BarChart2, Activity,
  Box, ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, Gauge,
  HardDrive, Wifi, WifiOff, Monitor, Server, KeyRound
} from 'lucide-react';

interface ProviderRow {
  id: string;
  name: string;
  hasKey: boolean;
  enabled: boolean;
  isActive: boolean;
  isLocal: boolean;
  health: ProviderHealth;
  cooldownRemaining: number; // ms, 0 if not degraded
}

const LOCAL_PROVIDER_IDS = new Set(['lmstudio', 'ollama']);

function buildProviderRows(now: number): ProviderRow[] {
  const providers = aiGateway.getProviders();
  const activeId = aiGateway.getActiveProviderId();
  const healthMap = aiGateway.getHealthSnapshot();
  return providers.map((p) => {
    const health: ProviderHealth = healthMap[p.id] || { failureCount: 0, degradedUntil: 0 };
    const cooldownRemaining = Math.max(0, health.degradedUntil - now);
    return {
      id: p.id,
      name: p.name,
      hasKey: !!p.apiKey,
      enabled: p.enabled,
      isActive: p.id === activeId,
      isLocal: LOCAL_PROVIDER_IDS.has(p.id),
      health,
      cooldownRemaining,
    };
  });
}

type ProviderStatus = 'active' | 'healthy' | 'degraded' | 'inactive' | 'no-key';

function statusOf(row: ProviderRow): ProviderStatus {
  if (!row.enabled) return 'inactive';
  if (!row.hasKey && !row.isLocal) return 'no-key';
  if (row.cooldownRemaining > 0) return 'degraded';
  if (row.isActive) return 'active';
  return 'healthy';
}

const STATUS_LABEL: Record<ProviderStatus, string> = {
  active: 'ACTIVE',
  healthy: 'HEALTHY',
  degraded: 'DEGRADED',
  inactive: 'DISABLED',
  'no-key': 'NO KEY',
};

const STATUS_CLASS: Record<ProviderStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  healthy: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  degraded: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  inactive: 'bg-zinc-500/10 text-zinc-400 border-white/10',
  'no-key': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
};

export default function DashboardApp() {
  const { registry, windows, autonomyLog, autonomyState, uiScale } = useOS();
  const [modelStatus, setModelStatus] = useState('Checking...');
  const [memories, setMemories] = useState(0);
  const [tools, setTools] = useState<string[]>([]);
  const [uptime, setUptime] = useState('—');
  const [time, setTime] = useState(new Date());
  const [guardStats, setGuardStats] = useState({ total: 0, corrected: 0, autoFixed: 0, failed: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [providerRows, setProviderRows] = useState<ProviderRow[]>(() => buildProviderRows(Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTime(new Date(now));
      setGuardStats(errorGuard.getStats());
      setIsOnline(navigator.onLine);
      setProviderRows(buildProviderRows(now));

      // Update tools asynchronously loaded
      toolForge.getAllTools().then(allTools => {
        setTools(allTools.map(t => t.name));
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setModelStatus(localBrain.isReady() ? `✓ ${localBrain.getActiveModel()?.name ?? (localBrain.getLMStudioModelName() || 'Model Active')}` : '⏳ No model loaded');
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

        {/* ── AI Providers Health ──────────────────────────────────────── */}
        <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Server size={12} className="text-emerald-400" />
            AI PROVIDERS HEALTH
            <span className="text-[9px] text-zinc-600 normal-case tracking-normal ml-auto">
              {providerRows.filter(r => statusOf(r) !== 'inactive').length} configured
              · {providerRows.filter(r => statusOf(r) === 'degraded').length} degraded
            </span>
          </div>

          {providerRows.length === 0 ? (
            <div className="text-xs text-zinc-600 py-3 text-center">No providers registered. Add one in Settings → AI Providers.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {providerRows
                .slice()
                .sort((a, b) => {
                  // Sort: active first, then degraded, then healthy, then inactive
                  const order: Record<ProviderStatus, number> = { active: 0, degraded: 1, healthy: 2, 'no-key': 3, inactive: 4 };
                  return order[statusOf(a)] - order[statusOf(b)];
                })
                .map((row) => {
                  const status = statusOf(row);
                  const cooldownSec = Math.ceil(row.cooldownRemaining / 1000);
                  const cooldownPct = row.cooldownRemaining > 0
                    ? Math.min(100, (row.cooldownRemaining / FAILOVER_DEGRADED_WINDOW_MS) * 100)
                    : 0;
                  return (
                    <div
                      key={row.id}
                      className={`bg-black/40 rounded-xl p-3 border ${
                        row.isActive ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {row.isLocal ? (
                            <HardDrive size={12} className="text-cyan-400 shrink-0" />
                          ) : row.hasKey ? (
                            <KeyRound size={12} className="text-emerald-400 shrink-0" />
                          ) : (
                            <KeyRound size={12} className="text-zinc-600 shrink-0" />
                          )}
                          <span className="text-sm text-zinc-200 truncate font-medium">{row.name}</span>
                        </div>
                        <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${STATUS_CLASS[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                        <span className="truncate">{row.id}</span>
                        <span className="shrink-0 ml-2">
                          {row.health.failureCount > 0 && (
                            <span className="text-rose-400">{row.health.failureCount} fail{row.health.failureCount > 1 ? 's' : ''}</span>
                          )}
                          {row.health.failureCount === 0 && row.enabled && (row.hasKey || row.isLocal) && (
                            <span className="text-emerald-500/60">stable</span>
                          )}
                        </span>
                      </div>

                      {row.cooldownRemaining > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[9px] text-rose-300/80 mb-1">
                            <span>cooldown</span>
                            <span className="font-mono">{cooldownSec}s</span>
                          </div>
                          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500/70 rounded-full transition-all duration-700"
                              style={{ width: `${cooldownPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {row.health.lastError && row.cooldownRemaining > 0 && (
                        <div className="mt-2 text-[10px] text-rose-300/70 line-clamp-2 font-mono">
                          {row.health.lastError.slice(0, 120)}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
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
