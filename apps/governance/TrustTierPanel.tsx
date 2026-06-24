import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import {
  trustTierEngine,
  type TrustTier,
  TRUST_TIER_RANK,
  TIER_POLICIES,
} from '../../kernel/trustTierEngine';
import { TIER_CLS, SectionHeader } from './helpers';

// Trust Tiers panel: lists the 4 tiers (doc → kernel) with their
// approval gates and validation requirements, and exposes the global
// tier override buttons.
export const TrustTierPanel: React.FC = () => {
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
        {tiers.map((tier) => {
          const policy = TIER_POLICIES[tier];
          const cls = TIER_CLS[tier];
          const rank = TRUST_TIER_RANK[tier];
          return (
            <div key={tier} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-xs font-mono ${cls}`}>
              <span className="text-zinc-500 w-3">{rank}</span>
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
        {tiers.map((tier) => (
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
};
