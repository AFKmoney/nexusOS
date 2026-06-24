// Shared helpers, color maps, and tiny primitives for the Governance
// Dashboard sub-components. Extracted from the original 717-line
// GovernanceDashboard.tsx so each panel can import only what it needs.

import React from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldOff, Pause,
} from 'lucide-react';
import type { OverrideMode } from '../../kernel/humanOverride';
import type { ProposalStatus } from '../../kernel/proposalEngine';
import type { TrustTier } from '../../kernel/trustTierEngine';

// ─── Time / number formatting ──────────────────────────────────────────
export function relTime(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 5_000) return 'just now';
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  return `${Math.floor(delta / 3_600_000)}h ago`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

// ─── Status colour maps ─────────────────────────────────────────────────
export const OVERRIDE_META: Record<
  OverrideMode,
  { label: string; cls: string; Icon: React.FC<{ size?: number; className?: string }> }
> = {
  active:      { label: 'ACTIVE',    cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20', Icon: ShieldCheck },
  paused:      { label: 'PAUSED',    cls: 'text-amber-400  border-amber-500/40  bg-amber-950/20',    Icon: Pause       },
  'safe-mode': { label: 'SAFE MODE', cls: 'text-orange-400 border-orange-500/40 bg-orange-950/20',   Icon: ShieldAlert  },
  disabled:    { label: 'DISABLED',  cls: 'text-rose-400   border-rose-500/40   bg-rose-950/20',     Icon: ShieldOff   },
};

export const HEALTH_CLS: Record<string, string> = {
  healthy:  'text-emerald-400',
  degraded: 'text-amber-400',
  critical: 'text-rose-400',
  disabled: 'text-zinc-500',
};

export const PROPOSAL_STATUS_CLS: Record<ProposalStatus, string> = {
  draft:             'text-zinc-400',
  validating:        'text-cyan-400',
  'validation-failed': 'text-rose-400',
  'pending-approval':  'text-amber-400',
  approved:          'text-emerald-400',
  denied:            'text-rose-500',
  executing:         'text-cyan-300 animate-pulse',
  succeeded:         'text-emerald-500',
  failed:            'text-rose-500',
  'rolled-back':     'text-purple-400',
};

export const TIER_CLS: Record<TrustTier, string> = {
  doc:        'text-zinc-400 border-zinc-700   bg-zinc-900/40',
  ui:         'text-cyan-400 border-cyan-700/40 bg-cyan-950/20',
  'app-logic': 'text-amber-400 border-amber-600/40 bg-amber-950/20',
  kernel:     'text-rose-400 border-rose-600/40 bg-rose-950/20',
};

export const STAGE_STATUS_CLS: Record<string, string> = {
  draft:    'text-zinc-400',
  staged:   'text-cyan-400',
  sealed:   'text-amber-400',
  promoted: 'text-emerald-400',
  reverted: 'text-purple-400',
};

export const EVENT_KIND_CLS: Record<string, string> = {
  'proposal-created':       'text-cyan-400',
  'proposal-validated':     'text-emerald-400',
  'proposal-rejected':      'text-rose-400',
  'proposal-approved':      'text-emerald-400',
  'proposal-denied':        'text-rose-500',
  'execution-started':      'text-cyan-300',
  'execution-succeeded':    'text-emerald-400',
  'execution-failed':       'text-rose-400',
  'rollback-triggered':     'text-purple-400',
  'rollback-succeeded':     'text-purple-300',
  'rollback-failed':        'text-rose-500',
  'override-activated':     'text-amber-400',
  'override-deactivated':   'text-emerald-300',
  'policy-decision':        'text-zinc-400',
  'health-degraded':        'text-orange-400',
  'health-recovered':       'text-emerald-400',
  'safe-mode-entered':      'text-orange-400',
  'safe-mode-exited':       'text-emerald-300',
  'staging-artifact-added': 'text-sky-400',
  'staging-artifact-sealed':'text-sky-300',
  'staging-deploy-started': 'text-cyan-400',
  'staging-deploy-complete':'text-emerald-400',
  'staging-deploy-failed':  'text-rose-400',
  'staging-revert-started': 'text-purple-400',
  'staging-revert-complete':'text-purple-300',
  'staging-revert-failed':  'text-rose-500',
  'trust-tier-override':    'text-amber-300',
};

// ─── Tiny presentational primitives ────────────────────────────────────
export function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.FC<{ size?: number; className?: string }>;
  title: string;
  count?: number;
}) {
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

export function MetricRow({
  label,
  value,
  cls = 'text-zinc-300',
}: {
  label: string;
  value: string | number;
  cls?: string;
}) {
  return (
    <div className="flex justify-between items-center text-sm font-mono">
      <span className="text-zinc-500">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

export function ConfidenceBar({ score, health }: { score: number; health: string }) {
  const barCls =
    health === 'healthy' ? 'bg-emerald-500'
    : health === 'degraded' ? 'bg-amber-500'
    : health === 'critical' ? 'bg-rose-500'
    : 'bg-zinc-600';

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
