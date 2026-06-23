import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Layers,
} from 'lucide-react';
import { proposalEngine, type Proposal } from '../../kernel/proposalEngine';
import { trustTierEngine } from '../../kernel/trustTierEngine';
import { PROPOSAL_STATUS_CLS, TIER_CLS, SectionHeader, relTime } from './helpers';

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
        onClick={() => setExpanded((x) => !x)}
      >
        {expanded ? <ChevronDown size={12} className="text-zinc-500 shrink-0" /> : <ChevronRight size={12} className="text-zinc-500 shrink-0" />}
        <span className="flex-1 text-xs font-mono text-zinc-200 truncate">{proposal.title}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierCls} mr-2`}>{tier}</span>
        <span className={`text-[10px] font-bold tracking-widest mr-2 ${statusCls}`}>{proposal.status.toUpperCase()}</span>
        {proposal.status === 'pending-approval' && (
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
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

interface ProposalsPanelProps {
  proposals: Proposal[];
}

export const ProposalsPanel: React.FC<ProposalsPanelProps> = ({ proposals }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'done'>('all');

  const filtered = proposals
    .filter((p) => {
      if (filter === 'pending') return p.status === 'pending-approval';
      if (filter === 'active')  return p.status === 'executing' || p.status === 'validating' || p.status === 'approved';
      if (filter === 'done')    return p.status === 'succeeded' || p.status === 'failed' || p.status === 'rolled-back' || p.status === 'denied';
      return true;
    })
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 30);

  const pendingCount = proposals.filter((p) => p.status === 'pending-approval').length;

  return (
    <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
      <SectionHeader icon={Layers} title="Proposals" count={proposals.length} />

      <div className="flex gap-1.5 mb-3 flex-wrap">
        {(['all', 'pending', 'active', 'done'] as const).map((f) => (
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
        ) : (
          filtered.map((p) => <ProposalRow key={p.id} proposal={p} />)
        )}
      </div>
    </div>
  );
};
