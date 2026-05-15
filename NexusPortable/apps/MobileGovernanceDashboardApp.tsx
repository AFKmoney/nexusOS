import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle,
  CheckCircle2, XCircle, Clock, Activity, Layers,
  RotateCcw, Power, PowerOff, Play, Pause,
  ChevronDown, ChevronRight, Eye, Zap, Package,
  Terminal, BarChart2, Lock, Unlock, Filter, Brain, BatteryLow, ChevronLeft
} from 'lucide-react';
import { useOS } from '../../store/osStore';
import { humanOverride, OverrideMode } from '../../kernel/humanOverride';
import { usageTracker } from '../../kernel/usageTracker';
import { missionLearning } from '../../kernel/missionLearning';
import { memory } from '../../kernel/memory';
import { autonomyHealthMonitor, AutonomyMetrics } from '../../kernel/autonomyHealthMonitor';
import { proposalEngine, Proposal, ProposalStatus } from '../../kernel/proposalEngine';
import { autonomyEventLog, AutonomyEvent } from '../../kernel/autonomyEventLog';
import { stagingManager, StagedArtifact } from '../../kernel/stagingManager';
import { trustTierEngine, TrustTier, TRUST_TIER_RANK, TIER_POLICIES } from '../../kernel/trustTierEngine';
import type { MobileAppProps } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relTime(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 5_000) return 'just now';
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  return `${Math.floor(delta / 3_600_000)}h ago`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

const OVERRIDE_META: Record<OverrideMode, { label: string; cls: string; Icon: React.FC<{ size?: number; className?: string }> }> = {
  active:    { label: 'ACTIVE',    cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20',  Icon: ShieldCheck },
  paused:    { label: 'PAUSED',    cls: 'text-amber-400  border-amber-500/40  bg-amber-950/20',     Icon: Pause       },
  'safe-mode': { label: 'SAFE MODE', cls: 'text-orange-400 border-orange-500/40 bg-orange-950/20', Icon: ShieldAlert  },
  disabled:  { label: 'DISABLED',  cls: 'text-rose-400   border-rose-500/40   bg-rose-950/20',     Icon: ShieldOff   },
};

const HEALTH_CLS: Record<string, string> = {
  healthy:  'text-emerald-400',
  degraded: 'text-amber-400',
  critical: 'text-rose-400',
  disabled: 'text-zinc-500',
};

const PROPOSAL_STATUS_CLS: Record<ProposalStatus, string> = {
  'draft':              'text-zinc-400',
  'validating':         'text-cyan-400',
  'validation-failed':  'text-rose-400',
  'pending-approval':   'text-amber-400',
  'approved':           'text-emerald-400',
  'denied':             'text-rose-500',
  'executing':          'text-cyan-300 animate-pulse',
  'succeeded':          'text-emerald-500',
  'failed':             'text-rose-500',
  'rolled-back':        'text-purple-400',
};

const TIER_CLS: Record<TrustTier, string> = {
  'doc':        'text-zinc-400 border-zinc-700   bg-zinc-900/40',
  'ui':         'text-cyan-400 border-cyan-700/40 bg-cyan-950/20',
  'app-logic':  'text-amber-400 border-amber-600/40 bg-amber-950/20',
  'kernel':     'text-rose-400 border-rose-600/40 bg-rose-950/20',
};

const STAGE_STATUS_CLS: Record<string, string> = {
  draft:    'text-zinc-400',
  staged:   'text-cyan-400',
  sealed:   'text-amber-400',
  promoted: 'text-emerald-400',
  reverted: 'text-purple-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count }: { icon: React.FC<{ size?: number; className?: string }>; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-4">
      <Icon size={14} className="shrink-0 text-cyan-500/50" />
      <span>{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-[10px] font-mono text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function MetricRow({ label, value, cls = 'text-zinc-300' }: { label: string; value: string | number; cls?: string }) {
  return (
    <div className="flex justify-between items-center text-xs font-mono py-1 border-b border-white/[0.03] last:border-0">
      <span className="text-zinc-500 uppercase tracking-tighter">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

function ConfidenceBar({ score, health }: { score: number; health: string }) {
  const barCls =
    health === 'healthy' ? 'bg-emerald-500' :
    health === 'degraded' ? 'bg-amber-500' :
    health === 'critical' ? 'bg-rose-500' : 'bg-zinc-600';

  return (
    <div className="bg-black/20 rounded-xl p-3 border border-white/5">
      <div className="flex items-center justify-between text-[10px] font-mono mb-2 uppercase tracking-widest">
        <span className="text-zinc-500">System Confidence</span>
        <span className={HEALTH_CLS[health] ?? 'text-zinc-300'}>{pct(score)}</span>
      </div>
      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barCls} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────

function StatusPanel({ mode, metrics }: { mode: OverrideMode; metrics: AutonomyMetrics }) {
  const meta = OVERRIDE_META[mode] ?? OVERRIDE_META.active;
  const { Icon } = meta;

  const onKillSwitch = () => humanOverride.killSwitch('User triggered kill switch');
  const onPause      = () => humanOverride.pause('User paused');
  const onResume     = () => humanOverride.resume('User resumed');
  const onSafeMode   = () => humanOverride.enterSafeMode('User entered safe mode', { activatedBy: 'user' });

  return (
    <div className={`rounded-2xl border p-5 ${meta.cls} backdrop-blur-md transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={20} className="shrink-0" />
          <span className="font-black tracking-[0.15em] text-sm uppercase">NEXUS.AUTONOMY</span>
        </div>
        <span className={`text-[9px] font-black tracking-[0.2em] px-3 py-1 rounded-full border bg-black/20 ${meta.cls}`}>
          {meta.label}
        </span>
      </div>

      <ConfidenceBar score={metrics.confidenceScore} health={metrics.healthStatus} />

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-4">
        <MetricRow label="Health"   value={metrics.healthStatus.toUpperCase()} cls={HEALTH_CLS[metrics.healthStatus] ?? 'text-zinc-300'} />
        <MetricRow label="Proposals" value={metrics.proposalsTotal} />
        <MetricRow label="Success"  value={pct(metrics.successRate)} cls={metrics.successRate >= 0.8 ? 'text-emerald-400' : 'text-amber-400'} />
        <MetricRow label="Rollbacks" value={metrics.proposalsRolledBack} cls={metrics.proposalsRolledBack > 0 ? 'text-purple-400' : 'text-zinc-400'} />
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        {mode === 'active' && (
          <>
            <button onClick={onPause}    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 active:scale-95 transition-all">
              <Pause size={14} /> Pause
            </button>
            <button onClick={onSafeMode} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 active:scale-95 transition-all">
              <ShieldAlert size={14} /> Safe
            </button>
          </>
        )}
        {(mode === 'paused' || mode === 'safe-mode') && (
          <button onClick={onResume} className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-bold uppercase tracking-widest rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 active:scale-95 transition-all">
            <Play size={16} /> Resume Autonomy
          </button>
        )}
        {mode !== 'disabled' && (
          <button onClick={onKillSwitch} className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 active:scale-95 transition-all mt-1">
            <PowerOff size={14} /> Kill Switch
          </button>
        )}
        {mode === 'disabled' && (
          <button onClick={onResume} className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-bold uppercase tracking-widest rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 active:scale-95 transition-all">
            <Power size={16} /> Re-enable System
          </button>
        )}
      </div>
    </div>
  );
}

function ProposalRow({ proposal }: { proposal: Proposal }) {
  const [expanded, setExpanded] = useState(false);
  const statusCls = PROPOSAL_STATUS_CLS[proposal.status] ?? 'text-zinc-400';
  const { tier } = trustTierEngine.classify(proposal.actionClass, proposal.scope);
  const tierCls = TIER_CLS[tier];

  const onApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    proposalEngine.approve(proposal.id);
  };
  const onDeny = (e: React.MouseEvent) => {
    e.stopPropagation();
    proposalEngine.deny(proposal.id, 'Denied by user');
  };

  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.02]">
      <button
        className="w-full flex items-center gap-3 px-4 py-4 active:bg-white/5 transition-colors text-left"
        onClick={() => setExpanded(x => !x)}
      >
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCls.split(' ')[0]} animate-pulse`} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-zinc-100 truncate mb-1">{proposal.title}</p>
          <div className="flex items-center gap-2">
             <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded border ${tierCls}`}>{tier.toUpperCase()}</span>
             <span className={`text-[9px] font-bold tracking-[0.1em] uppercase ${statusCls}`}>{proposal.status}</span>
          </div>
        </div>
        {expanded ? <ChevronDown size={16} className="text-zinc-600" /> : <ChevronRight size={16} className="text-zinc-600" />}
      </button>
      
      {proposal.status === 'pending-approval' && !expanded && (
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onApprove} className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
            Approve
          </button>
          <button onClick={onDeny} className="flex-1 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
            Deny
          </button>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 bg-black/20 border-t border-white/5 text-[11px] font-mono space-y-2 pt-3 text-zinc-400">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-zinc-600 uppercase text-[9px]">Risk:</span> <span className={proposal.riskLevel === 'high' || proposal.riskLevel === 'critical' ? 'text-rose-400' : 'text-amber-400'}>{proposal.riskLevel}</span></div>
            <div><span className="text-zinc-600 uppercase text-[9px]">Created:</span> {relTime(proposal.createdAt)}</div>
          </div>
          <div><span className="text-zinc-600 uppercase text-[9px]">Target:</span> <span className="text-zinc-300 break-all">{proposal.targetPath ?? '—'}</span></div>
          <div><span className="text-zinc-600 uppercase text-[9px]">Impact:</span> <span className="text-zinc-300">{proposal.affectedSubsystems.join(', ') || 'Global'}</span></div>
          <div className="p-2 rounded bg-white/5 border border-white/5 italic text-[10px]">
            <span className="text-zinc-600 non-italic block mb-1 uppercase text-[8px] font-bold">Rollback Plan:</span>
            {proposal.rollbackPlan}
          </div>
          {proposal.status === 'pending-approval' && (
            <div className="flex gap-2 mt-4">
              <button onClick={onApprove} className="flex-1 py-3 rounded-xl bg-emerald-500 text-black text-[11px] font-black uppercase tracking-widest active:scale-95">
                Approve
              </button>
              <button onClick={onDeny} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-rose-400 text-[11px] font-black uppercase tracking-widest active:scale-95">
                Deny
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProposalsPanel({ proposals }: { proposals: Proposal[] }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'done'>('all');

  const filtered = proposals.filter(p => {
    if (filter === 'pending') return p.status === 'pending-approval';
    if (filter === 'active')  return p.status === 'executing' || p.status === 'validating' || p.status === 'approved';
    if (filter === 'done')    return p.status === 'succeeded' || p.status === 'failed' || p.status === 'rolled-back' || p.status === 'denied';
    return true;
  }).slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);

  const pendingCount = proposals.filter(p => p.status === 'pending-approval').length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {(['all', 'pending', 'active', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all shrink-0 ${
              filter === f
                ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
          >
            {f === 'pending' && pendingCount > 0 ? `${f} (${pendingCount})` : f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-xs text-zinc-600 text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
            <Layers size={32} className="mx-auto mb-3 opacity-20" />
            No proposals found.
          </div>
        ) : filtered.map(p => <ProposalRow key={p.id} proposal={p} />)}
      </div>
    </div>
  );
}

const EVENT_KIND_CLS: Record<string, string> = {
  'proposal-created':         'text-cyan-400',
  'proposal-validated':       'text-emerald-400',
  'proposal-rejected':        'text-rose-400',
  'proposal-approved':        'text-emerald-400',
  'proposal-denied':          'text-rose-500',
  'execution-started':        'text-cyan-300',
  'execution-succeeded':      'text-emerald-400',
  'execution-failed':         'text-rose-400',
  'rollback-triggered':       'text-purple-400',
  'rollback-succeeded':       'text-purple-300',
  'rollback-failed':          'text-rose-500',
  'override-activated':       'text-amber-400',
  'override-deactivated':     'text-emerald-300',
  'policy-decision':          'text-zinc-400',
  'health-degraded':          'text-orange-400',
  'health-recovered':         'text-emerald-400',
  'safe-mode-entered':        'text-orange-400',
  'safe-mode-exited':         'text-emerald-300',
  'staging-artifact-added':   'text-sky-400',
  'staging-artifact-sealed':  'text-sky-300',
  'staging-deploy-started':   'text-cyan-400',
  'staging-deploy-complete':  'text-emerald-400',
  'staging-deploy-failed':    'text-rose-400',
  'staging-revert-started':   'text-purple-400',
  'staging-revert-complete':  'text-purple-300',
  'staging-revert-failed':    'text-rose-500',
  'trust-tier-override':      'text-amber-300',
};

function AuditLogPanel({ events }: { events: AutonomyEvent[] }) {
  const [subsystemFilter, setSubsystemFilter] = useState<string>('all');
  const subsystems = Array.from(new Set(events.map(e => e.subsystem)));

  const filtered = (subsystemFilter === 'all' ? events : events.filter(e => e.subsystem === subsystemFilter))
    .slice()
    .reverse()
    .slice(0, 100);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {['all', ...subsystems].map(s => (
          <button
            key={s}
            onClick={() => setSubsystemFilter(s)}
            className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg border transition-all shrink-0 ${
              subsystemFilter === s
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/5 border-white/5 text-zinc-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(e => (
          <div key={e.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px]">
            <div className="flex justify-between mb-1">
              <span className={`font-black uppercase tracking-widest ${EVENT_KIND_CLS[e.kind] || 'text-zinc-400'}`}>{e.kind}</span>
              <span className="text-zinc-600">{relTime(e.timestamp)}</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">{e.summary}</p>
            <div className="mt-2 text-[8px] text-zinc-700 uppercase tracking-tighter">Subsystem: {e.subsystem}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthMetricsPanel({ metrics }: { metrics: AutonomyMetrics }) {
  const bars: Array<{ label: string; value: number; goodIsHigh: boolean }> = [
    { label: 'Success Rate',     value: metrics.successRate,           goodIsHigh: true  },
    { label: 'Rollback Rate',    value: metrics.rollbackRate,          goodIsHigh: false },
    { label: 'Validation Fails', value: metrics.validationFailureRate, goodIsHigh: false },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {bars.map(({ label, value, goodIsHigh }) => {
          const good = goodIsHigh ? value >= 0.8 : value <= 0.2;
          const warn = goodIsHigh ? value >= 0.5 : value <= 0.5;
          const barCls = good ? 'bg-emerald-500' : warn ? 'bg-amber-500' : 'bg-rose-500';
          const valCls = good ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-rose-400';
          return (
            <div key={label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest mb-3">
                <span className="text-zinc-500">{label}</span>
                <span className={valCls}>{pct(value)}</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${barCls}`} style={{ width: `${value * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ['Succeeded',  metrics.proposalsSucceeded,  'text-emerald-400'],
          ['Failed',     metrics.proposalsFailed,      'text-rose-400'],
          ['Denied',     metrics.proposalsDenied,      'text-zinc-400'],
          ['Overrides',  metrics.overrideActivations,  'text-amber-400'],
        ].map(([label, val, cls]) => (
          <div key={String(label)} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center text-center">
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">{String(label)}</span>
            <span className={`text-lg font-mono ${String(cls)}`}>{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StagingPanel({ artifacts }: { artifacts: StagedArtifact[] }) {
  const recent = artifacts.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);

  return (
    <div className="space-y-3">
      {recent.length === 0 ? (
        <div className="text-xs text-zinc-600 text-center py-12 border-2 border-dashed border-white/5 rounded-3xl opacity-30">
          <Package size={32} className="mx-auto mb-3" />
          No staged artifacts detected.
        </div>
      ) : (
        recent.map(a => (
          <div key={a.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full shrink-0 ${STAGE_STATUS_CLS[a.status]?.split(' ')[0]}`} />
            <div className="flex-1 min-w-0 font-mono">
              <p className="text-xs text-zinc-200 truncate">{a.kind}:{a.key}</p>
              <p className="text-[10px] text-zinc-600 uppercase mt-0.5">v{a.version} · {relTime(a.createdAt)}</p>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-black/20 border border-white/5 ${STAGE_STATUS_CLS[a.status]}`}>{a.status}</span>
          </div>
        ))
      )}
    </div>
  );
}

function TrustTierPanel() {
  const tiers = trustTierEngine.getTiersAscending();
  const [override, setOverride] = useState<TrustTier | null>(trustTierEngine.getGlobalTierOverride());

  const applyOverride = (tier: TrustTier | null) => {
    trustTierEngine.setGlobalTierOverride(tier, tier ? `User set global tier override to '${tier}'` : 'User cleared override');
    setOverride(tier);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tiers.map(tier => {
          const policy = TIER_POLICIES[tier];
          const cls = TIER_CLS[tier];
          return (
            <div key={tier} className={`p-4 rounded-2xl border bg-black/20 ${cls} backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tier}</span>
                <span className="text-[10px] font-mono opacity-60">Level 0{TRUST_TIER_RANK[tier]}</span>
              </div>
              <p className="text-[11px] font-mono opacity-80 leading-relaxed mb-3">{policy.approvalGate}</p>
              <div className="flex gap-2">
                {policy.requireFullTestSuite && <span className="px-2 py-0.5 rounded bg-black/40 text-[8px] font-black uppercase tracking-widest">full-tests-req</span>}
                {!policy.allowSelfDeploy && <span className="px-2 py-0.5 rounded bg-black/40 text-[8px] font-black uppercase tracking-widest">no-self-deploy</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 mt-6">
        <SectionHeader icon={Zap} title="Global Override" />
        <div className="grid grid-cols-3 gap-2">
           {tiers.map(t => (
             <button key={t} onClick={() => applyOverride(override === t ? null : t)} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${override === t ? TIER_CLS[t] : 'bg-black/40 border-white/5 text-zinc-600'}`}>
               {t}
             </button>
           ))}
           {override && <button onClick={() => applyOverride(null)} className="col-span-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20 text-rose-400 mt-1">Clear Override</button>}
        </div>
      </div>
    </div>
  );
}

function NeuralFieldPanel() {
  const powerMode = useOS(s => s.powerMode);
  const predicted = usageTracker.getPredictedApps(5);
  const coherence = usageTracker.getFieldCoherence();
  const memCount  = memory.getRecent(100).length;

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
        <SectionHeader icon={Brain} title="Field Coherence" />
        <div className="flex items-end gap-3 mb-4">
          <span className="text-4xl font-mono text-emerald-400">{pct(coherence)}</span>
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest pb-1">Nominal Synchronization</span>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Synaptic Density', value: `${memCount} nodes`, bar: Math.min(1, memCount / 100) },
            { label: 'Power State', value: powerMode.toUpperCase(), bar: powerMode === 'normal' ? 1 : 0.4, cls: powerMode === 'normal' ? 'bg-emerald-500' : 'bg-amber-500' },
          ].map(m => (
            <div key={m.label}>
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase mb-2">
                <span>{m.label}</span>
                <span>{m.value}</span>
              </div>
              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${m.cls || 'bg-cyan-500'}`} style={{ width: `${m.bar * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
        <SectionHeader icon={Activity} title="Predictive Resonance" />
        <div className="space-y-4">
          {predicted.map(p => (
            <div key={p.appId} className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-zinc-200 uppercase">{p.appId}</span>
                <span className="text-cyan-400">{pct(p.score)}</span>
              </div>
              <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${Math.min(100, p.score * 120)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MobileGovernanceDashboardApp({ onBack }: MobileAppProps) {
  const governance = useOS(s => s.governance);

  const [mode, setMode]         = useState<OverrideMode>(humanOverride.currentMode);
  const [metrics, setMetrics]   = useState<AutonomyMetrics>(autonomyHealthMonitor.getMetrics());
  const [proposals, setProposals] = useState<Proposal[]>(proposalEngine.getAll());
  const [events, setEvents]     = useState<AutonomyEvent[]>(autonomyEventLog.getAll());
  const [artifacts, setArtifacts] = useState<StagedArtifact[]>(stagingManager.getAll());
  const [tab, setTab]           = useState<'proposals' | 'log' | 'health' | 'staging' | 'tiers' | 'rnf'>('proposals');

  useEffect(() => {
    const unsubs = [
      humanOverride.subscribe((s: any) => setMode(s.mode)),
      autonomyHealthMonitor.subscribe((m: any) => setMetrics(m)),
      proposalEngine.subscribe((p: any) => setProposals(p)),
      autonomyEventLog.subscribe((e: any) => setEvents(e)),
      stagingManager.subscribe((a: any) => setArtifacts(a)),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const pendingCount = proposals.filter(p => p.status === 'pending-approval').length;
  const TAB_META: Array<{ id: typeof tab; label: string; Icon: any; badge?: number }> = [
    { id: 'proposals', label: 'Proposals', Icon: Layers, badge: pendingCount },
    { id: 'log',       label: 'Audit Log', Icon: Terminal },
    { id: 'health',    label: 'Metrics',   Icon: BarChart2 },
    { id: 'staging',   label: 'Staging',   Icon: Package },
    { id: 'tiers',     label: 'Tiers',     Icon: ShieldCheck },
    { id: 'rnf',       label: 'RNF',       Icon: Brain },
  ];

  return (
    <div className="h-full bg-[#050505] text-zinc-300 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 shrink-0 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:bg-white/10"><ChevronLeft size={24} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-black uppercase tracking-[0.15em] text-white truncate">Governance</h1>
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Autonomous Evolution Node</p>
        </div>
        <div className={`px-2 py-1 rounded-lg border text-[9px] font-black tracking-widest ${OVERRIDE_META[mode]?.cls || ''}`}>
          {OVERRIDE_META[mode]?.label || mode.toUpperCase()}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Status Strip */}
        <div className="px-4 py-6">
          <StatusPanel mode={mode} metrics={metrics} />
        </div>

        {/* Tab Selector */}
        <div className="sticky top-0 z-20 bg-[#050505]/80 backdrop-blur-xl border-y border-white/5 flex gap-1 px-4 overflow-x-auto scrollbar-hide py-2">
          {TAB_META.map(({ id, label, Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                tab === id
                  ? 'bg-white/10 border-white/10 text-white shadow-lg shadow-white/5'
                  : 'bg-transparent border-transparent text-zinc-600'
              }`}
            >
              <Icon size={14} className={tab === id ? 'text-cyan-400' : 'text-zinc-700'} />
              <span>{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[8px] flex items-center justify-center animate-pulse">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="px-4 py-6 pb-24">
          {tab === 'proposals' && <ProposalsPanel proposals={proposals} />}
          {tab === 'log'       && <AuditLogPanel  events={events} />}
          {tab === 'health'    && <HealthMetricsPanel metrics={metrics} />}
          {tab === 'staging'   && <StagingPanel artifacts={artifacts} />}
          {tab === 'tiers'     && <TrustTierPanel />}
          {tab === 'rnf'       && <NeuralFieldPanel />}
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-0 inset-x-0 h-12 bg-black/60 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-6 text-[9px] font-black uppercase tracking-widest text-zinc-600 pointer-events-none">
        <div className="flex gap-4">
          <span>Staged: <span className="text-cyan-400">{governance.stagedArtifactCount}</span></span>
          <span>Pending: <span className="text-amber-400">{governance.pendingApprovals}</span></span>
        </div>
        <span>Confidence: <span className="text-emerald-400">{pct(governance.confidenceScore)}</span></span>
      </div>
    </div>
  );
}
