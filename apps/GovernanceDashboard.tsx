import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useOS } from '../store/osStore';
import { humanOverride, type OverrideMode } from '../kernel/humanOverride';
import { autonomyHealthMonitor, type AutonomyMetrics } from '../kernel/autonomyHealthMonitor';
import { proposalEngine, type Proposal } from '../kernel/proposalEngine';
import { autonomyEventLog, type AutonomyEvent } from '../kernel/autonomyEventLog';
import { stagingManager, type StagedArtifact } from '../kernel/stagingManager';

import { StatusPanel } from './governance/StatusPanel';
import { ProposalsPanel } from './governance/ProposalsPanel';
import { AuditLogPanel } from './governance/AuditLogPanel';
import { HealthMetricsPanel } from './governance/HealthMetricsPanel';
import { StagingPanel } from './governance/StagingPanel';
import { TrustTierPanel } from './governance/TrustTierPanel';
import { NeuralFieldPanel } from './governance/NeuralFieldPanel';
import { OVERRIDE_META, HEALTH_CLS, pct } from './governance/helpers';

// ─────────────────────────────────────────────────────────────────────
// Governance Dashboard orchestrator
//
// Owns the 6 tab subscriptions and routes them to the panel components
// under apps/governance/. Before decomposition this file was 717 lines
// and contained every panel + helper + colour map inline. Now it is a
// thin shell that subscribes to kernel singletons and renders the
// active tab's panel.
// ─────────────────────────────────────────────────────────────────────

type TabId = 'proposals' | 'log' | 'health' | 'staging' | 'tiers' | 'rnf';

export default function GovernanceDashboard() {
  const governance = useOS((s) => s.governance);

  const [mode, setMode]           = useState<OverrideMode>(humanOverride.currentMode);
  const [metrics, setMetrics]     = useState<AutonomyMetrics>(autonomyHealthMonitor.getMetrics());
  const [proposals, setProposals] = useState<Proposal[]>(proposalEngine.getAll());
  const [events, setEvents]       = useState<AutonomyEvent[]>(autonomyEventLog.getAll());
  const [artifacts, setArtifacts] = useState<StagedArtifact[]>(stagingManager.getAll());
  const [tab, setTab]             = useState<TabId>('proposals');

  useEffect(() => {
    const unsubs = [
      humanOverride.subscribe((s) => setMode(s.mode)),
      autonomyHealthMonitor.subscribe((m) => setMetrics(m)),
      proposalEngine.subscribe((p) => setProposals(p)),
      autonomyEventLog.subscribe((e) => setEvents(e)),
      stagingManager.subscribe((a) => setArtifacts(a)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const pendingCount = proposals.filter((p) => p.status === 'pending-approval').length;
  const stagingBadge = artifacts.filter((a) => a.status === 'staged' || a.status === 'sealed').length || undefined;

  const TAB_META: Array<{ id: TabId; label: string; badge?: number }> = [
    { id: 'proposals', label: 'Proposals',   ...(pendingCount ? { badge: pendingCount } : {}) },
    { id: 'log',       label: 'Audit Log' },
    { id: 'health',    label: 'Metrics' },
    { id: 'staging',   label: 'Staging',     ...(stagingBadge ? { badge: stagingBadge } : {}) },
    { id: 'tiers',     label: 'Trust Tiers' },
    { id: 'rnf',       label: 'Neural Field' },
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
        {tab === 'rnf'       && <NeuralFieldPanel />}
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
