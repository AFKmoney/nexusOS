import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle,
  CheckCircle2, XCircle, Clock, Activity, Layers,
  RotateCcw, Power, PowerOff, Play, Pause,
  ChevronDown, ChevronRight, Eye, Zap, Package,
  Terminal, BarChart2, Lock, Unlock, Filter,
} from 'lucide-react';
import { useOS } from '../store/osStore';
import { humanOverride, OverrideMode } from '../kernel/humanOverride';
import { autonomyHealthMonitor, AutonomyMetrics } from '../kernel/autonomyHealthMonitor';
import { proposalEngine, Proposal, ProposalStatus } from '../kernel/proposalEngine';
import { autonomyEventLog, AutonomyEvent } from '../kernel/autonomyEventLog';
import { stagingManager, StagedArtifact } from '../kernel/stagingManager';
import { trustTierEngine, TrustTier, TRUST_TIER_RANK, TIER_POLICIES } from '../kernel/trustTierEngine';

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

// ─── Status colour helpers ────────────────────────────────────────────────────

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
    <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-widest mb-3">
      <Icon size={12} className="shrink-0" />
      <span>{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-[10px] text-zinc-600 normal-case tracking-normal">{count}</span>
      )}
    </div>
  );
}

function MetricRow({ label, value, cls = 'text-zinc-300' }: { label: string; value: string | number; cls?: string }) {
  return (
    <div className="flex justify-between items-center text-sm font-mono">
      <span className="text-zinc-500">{label}</span>
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
    <div>
      <div className="flex items-center justify-between text-xs font-mono mb-1">
        <span className="text-zinc-500">Confidence</span>
        <span className={HEALTH_CLS[health] ?? 'text-zinc-300'}>{pct(score)}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barCls}`}
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

  const onKillSwitch = () => humanOverride.killSwitch('User triggered kill switch from Governance Dashboard');
  const onPause      = () => humanOverride.pause('User paused from Governance Dashboard');
  const onResume     = () => humanOverride.resume('User resumed from Governance Dashboard');
  const onSafeMode   = () => humanOverride.enterSafeMode('User entered safe mode from Governance Dashboard', { activatedBy: 'user' });

  return (
    <div className={`rounded-2xl border p-4 ${meta.cls}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="shrink-0" />
          <span className="font-bold tracking-widest text-sm uppercase">NEXUS.AUTONOMY</span>
        </div>
        <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${meta.cls}`}>
          {meta.label}
        </span>
      </div>

      <ConfidenceBar score={metrics.confidenceScore} health={metrics.healthStatus} />

      <div className="grid grid-cols-2 gap-1.5 mt-3 text-xs font-mono">
        <MetricRow label="Health"   value={metrics.healthStatus.toUpperCase()} cls={HEALTH_CLS[metrics.healthStatus]} />
        <MetricRow label="Proposals" value={metrics.proposalsTotal} />
        <MetricRow label="Success"  value={pct(metrics.successRate)} cls={metrics.successRate >= 0.8 ? 'text-emerald-400' : 'text-amber-400'} />
        <MetricRow label="Rollbacks" value={metrics.proposalsRolledBack} cls={metrics.proposalsRolledBack > 0 ? 'text-purple-400' : 'text-zinc-400'} />
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {mode === 'active' && (
          <>
            <button onClick={onPause}    className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-400 hover:bg-amber-950/70 transition-colors">
              <Pause size={11} /> Pause
            </button>
            <button onClick={onSafeMode} className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-orange-950/40 border border-orange-500/30 text-orange-400 hover:bg-orange-950/70 transition-colors">
              <ShieldAlert size={11} /> Safe Mode
            </button>
          </>
        )}
        {(mode === 'paused' || mode === 'safe-mode') && (
          <button onClick={onResume} className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/70 transition-colors">
            <Play size={11} /> Resume
          </button>
        )}
        {mode !== 'disabled' && (
          <button onClick={onKillSwitch} className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-950/70 transition-colors ml-auto">
            <PowerOff size={11} /> Kill Switch
          </button>
        )}
        {mode === 'disabled' && (
          <button onClick={onResume} className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/70 transition-colors">
            <Power size={11} /> Re-enable
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
    proposalEngine.deny(proposal.id, 'Denied by user from Governance Dashboard');
  };

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-black/30 hover:bg-black/50 transition-colors text-left"
        onClick={() => setExpanded(x => !x)}
      >
        {expanded ? <ChevronDown size={12} className="text-zinc-500 shrink-0" /> : <ChevronRight size={12} className="text-zinc-500 shrink-0" />}
        <span className="flex-1 text-xs font-mono text-zinc-200 truncate">{proposal.title}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierCls} mr-2`}>{tier}</span>
        <span className={`text-[10px] font-bold tracking-widest mr-2 ${statusCls}`}>{proposal.status.toUpperCase()}</span>
        {proposal.status === 'pending-approval' && (
          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
            <button onClick={onApprove} className="px-2 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-[10px] hover:bg-emerald-950/80 transition-colors">
              Approve
            </button>
            <button onClick={onDeny} className="px-2 py-0.5 rounded-md bg-rose-950/50 border border-rose-500/30 text-rose-400 text-[10px] hover:bg-rose-950/80 transition-colors">
              Deny
            </button>
          </div>
        )}
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-zinc-900/40 border-t border-white/5 text-xs font-mono space-y-1.5 text-zinc-400">
          <div><span className="text-zinc-600">ID:</span> {proposal.id.slice(0, 16)}…</div>
          <div><span className="text-zinc-600">Risk:</span> <span className={proposal.riskLevel === 'high' || proposal.riskLevel === 'critical' ? 'text-rose-400' : 'text-amber-400'}>{proposal.riskLevel}</span></div>
          <div><span className="text-zinc-600">Target:</span> {proposal.targetPath ?? '—'}</div>
          <div><span className="text-zinc-600">Subsystems:</span> {proposal.affectedSubsystems.join(', ') || '—'}</div>
          <div><span className="text-zinc-600">Rollback:</span> {proposal.rollbackPlan}</div>
          {proposal.rejectionReason && <div><span className="text-zinc-600">Rejection:</span> <span className="text-rose-400">{proposal.rejectionReason}</span></div>}
          {proposal.errorMessage && <div><span className="text-zinc-600">Error:</span> <span className="text-rose-400">{proposal.errorMessage}</span></div>}
          <div><span className="text-zinc-600">Created:</span> {relTime(proposal.createdAt)}</div>
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
    <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
      <SectionHeader icon={Layers} title="Proposals" count={proposals.length} />

      <div className="flex gap-1.5 mb-3 flex-wrap">
        {(['all', 'pending', 'active', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-[10px] rounded-full border font-mono transition-colors ${
              filter === f
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
                : 'bg-black/30 border-white/5 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f === 'pending' && pendingCount > 0 ? `pending (${pendingCount})` : f}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <div className="text-xs text-zinc-600 text-center py-4">No proposals match this filter.</div>
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
  const [showFilter, setShowFilter] = useState(false);

  const subsystems = Array.from(new Set(events.map(e => e.subsystem)));

  const filtered = (subsystemFilter === 'all' ? events : events.filter(e => e.subsystem === subsystemFilter))
    .slice()
    .reverse()
    .slice(0, 100);

  return (
    <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={Terminal} title="Audit Log" count={events.length} />
        <button
          onClick={() => setShowFilter(x => !x)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Filter by subsystem"
        >
          <Filter size={12} />
        </button>
      </div>

      {showFilter && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['all', ...subsystems].map(s => (
            <button
              key={s}
              onClick={() => setSubsystemFilter(s)}
              className={`px-2 py-0.5 text-[9px] rounded-full border font-mono transition-colors ${
                subsystemFilter === s
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
                  : 'bg-black/30 border-white/5 text-zinc-600 hover:text-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-[11px]">
        {filtered.length === 0 ? (
          <div className="text-zinc-600 text-center py-4">No events yet.</div>
        ) : filtered.map(e => (
          <div key={e.id} className="flex items-start gap-2 py-0.5 border-b border-white/[0.03] last:border-0">
            <span className="text-zinc-600 shrink-0 tabular-nums">{relTime(e.timestamp)}</span>
            <span className={`shrink-0 ${EVENT_KIND_CLS[e.kind] ?? 'text-zinc-400'}`}>[{e.kind}]</span>
            <span className="text-zinc-400 truncate">{e.summary}</span>
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
    <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
      <SectionHeader icon={BarChart2} title="Health Metrics" />
      <div className="space-y-3">
        {bars.map(({ label, value, goodIsHigh }) => {
          const good = goodIsHigh ? value >= 0.8 : value <= 0.2;
          const warn = goodIsHigh ? value >= 0.5 : value <= 0.5;
          const barCls = good ? 'bg-emerald-500' : warn ? 'bg-amber-500' : 'bg-rose-500';
          const valCls = good ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-rose-400';
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-zinc-500">{label}</span>
                <span className={valCls}>{pct(value)}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barCls}`} style={{ width: `${value * 100}%` }} />
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
          {[
            ['Succeeded',  metrics.proposalsSucceeded,  'text-emerald-400'],
            ['Failed',     metrics.proposalsFailed,      'text-rose-400'],
            ['Denied',     metrics.proposalsDenied,      'text-zinc-400'],
            ['Overrides',  metrics.overrideActivations,  'text-amber-400'],
          ].map(([label, val, cls]) => (
            <div key={String(label)} className="flex justify-between">
              <span className="text-zinc-600">{label}</span>
              <span className={String(cls)}>{String(val)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StagingPanel({ artifacts }: { artifacts: StagedArtifact[] }) {
  const active = artifacts.filter(a => a.status === 'staged' || a.status === 'sealed');
  const recent = artifacts.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);

  return (
    <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={Package} title="Staged Artifacts" count={artifacts.length} />
        {active.length > 0 && (
          <span className="text-[10px] text-amber-400 font-mono ml-auto">{active.length} pending</span>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="text-xs text-zinc-600 text-center py-4">No staged artifacts.</div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {recent.map(a => (
            <div key={a.id} className="flex items-center gap-2 text-[11px] font-mono px-2 py-1.5 rounded-lg bg-black/20 border border-white/[0.04]">
              <span className={`shrink-0 ${STAGE_STATUS_CLS[a.status] ?? 'text-zinc-400'}`}>{a.status}</span>
              <span className="text-zinc-400 truncate flex-1">{a.kind}:{a.key}</span>
              <span className="text-zinc-600 shrink-0">v{a.version}</span>
              <span className="text-zinc-700 shrink-0">{relTime(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrustTierPanel() {
  const tiers = trustTierEngine.getTiersAscending();
  const [override, setOverride] = useState<TrustTier | null>(trustTierEngine.getGlobalTierOverride());

  const applyOverride = (tier: TrustTier | null) => {
    trustTierEngine.setGlobalTierOverride(
      tier,
      tier ? `User set global tier override to '${tier}'` : 'User cleared global tier override'
    );
    setOverride(tier);
  };

  return (
    <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
      <SectionHeader icon={Zap} title="Trust Tiers (Phase 8)" />

      <div className="space-y-2 mb-4">
        {tiers.map(tier => {
          const policy = TIER_POLICIES[tier];
          const cls = TIER_CLS[tier];
          const rank = TRUST_TIER_RANK[tier];
          return (
            <div key={tier} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-xs font-mono ${cls}`}>
              <span className="text-zinc-700 w-3">{rank}</span>
              <span className="font-bold w-20">{tier}</span>
              <span className="text-zinc-500 flex-1 truncate">{policy.approvalGate}</span>
              {policy.requireFullTestSuite && <span className="text-rose-400/70 text-[10px]">full-tests</span>}
              {!policy.allowSelfDeploy && <span className="text-amber-400/70 text-[10px]">no-self-deploy</span>}
            </div>
          );
        })}
      </div>

      {override !== null && (
        <div className="text-xs font-mono text-amber-400 bg-amber-950/20 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
          Override active: <strong>{override}</strong>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] text-zinc-600 font-mono self-center mr-1">Override:</span>
        {tiers.map(tier => (
          <button
            key={tier}
            onClick={() => applyOverride(override === tier ? null : tier)}
            className={`px-2 py-0.5 text-[10px] rounded-full border font-mono transition-colors ${
              override === tier ? TIER_CLS[tier] : 'bg-black/30 border-white/5 text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {tier}
          </button>
        ))}
        {override !== null && (
          <button
            onClick={() => applyOverride(null)}
            className="px-2 py-0.5 text-[10px] rounded-full border border-rose-500/30 text-rose-400 bg-rose-950/20 font-mono hover:bg-rose-950/50 transition-colors"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GovernanceDashboard() {
  const governance = useOS(s => s.governance);

  const [mode, setMode]         = useState<OverrideMode>(humanOverride.currentMode);
  const [metrics, setMetrics]   = useState<AutonomyMetrics>(autonomyHealthMonitor.getMetrics());
  const [proposals, setProposals] = useState<Proposal[]>(proposalEngine.getAll());
  const [events, setEvents]     = useState<AutonomyEvent[]>(autonomyEventLog.getAll());
  const [artifacts, setArtifacts] = useState<StagedArtifact[]>(stagingManager.getAll());
  const [tab, setTab]           = useState<'proposals' | 'log' | 'health' | 'staging' | 'tiers'>('proposals');

  useEffect(() => {
    const unsubs = [
      humanOverride.subscribe(s => setMode(s.mode)),
      autonomyHealthMonitor.subscribe(m => setMetrics(m)),
      proposalEngine.subscribe(p => setProposals(p)),
      autonomyEventLog.subscribe(e => setEvents(e)),
      stagingManager.subscribe(a => setArtifacts(a)),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const pendingCount = proposals.filter(p => p.status === 'pending-approval').length;

  const TAB_META: Array<{ id: typeof tab; label: string; badge?: number }> = [
    { id: 'proposals', label: 'Proposals', badge: pendingCount || undefined },
    { id: 'log',       label: 'Audit Log', badge: undefined },
    { id: 'health',    label: 'Health',    badge: undefined },
    { id: 'staging',   label: 'Staging',   badge: artifacts.filter(a => a.status === 'staged' || a.status === 'sealed').length || undefined },
    { id: 'tiers',     label: 'Trust Tiers', badge: undefined },
  ];

  return (
    <div className="h-full bg-[#050505] text-zinc-300 font-mono flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <h1 className="text-sm font-bold tracking-widest uppercase text-white">Governance Dashboard</h1>
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${OVERRIDE_META[mode]?.cls ?? ''}`}>
            {OVERRIDE_META[mode]?.label ?? mode.toUpperCase()}
          </span>
        </div>
        <p className="text-[10px] text-zinc-600 ml-7">Phase 5 · Phase 8 · Inspect, approve, and control autonomous evolution</p>
      </div>

      {/* ── Status strip ───────────────────────────────────────────────────── */}
      <div className="px-5 py-3 shrink-0">
        <StatusPanel mode={mode} metrics={metrics} />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-0.5 px-5 border-b border-white/5 shrink-0">
        {TAB_META.map(({ id, label, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-[11px] font-mono relative border-b-2 transition-colors ${
              tab === id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-black text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {tab === 'proposals' && <ProposalsPanel proposals={proposals} />}
        {tab === 'log'       && <AuditLogPanel  events={events} />}
        {tab === 'health'    && <HealthMetricsPanel metrics={metrics} />}
        {tab === 'staging'   && <StagingPanel artifacts={artifacts} />}
        {tab === 'tiers'     && <TrustTierPanel />}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-2 border-t border-white/5 shrink-0 flex items-center gap-4 text-[10px] text-zinc-600 font-mono">
        <span>staged: <span className="text-sky-400">{governance.stagedArtifactCount}</span></span>
        <span>pending: <span className="text-amber-400">{governance.pendingApprovals}</span></span>
        <span>health: <span className={HEALTH_CLS[governance.healthStatus]}>{governance.healthStatus}</span></span>
        <span className="ml-auto">confidence: <span className={HEALTH_CLS[governance.healthStatus]}>{pct(governance.confidenceScore)}</span></span>
      </div>
    </div>
  );
}
