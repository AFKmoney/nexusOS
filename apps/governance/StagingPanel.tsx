import React from 'react';
import { Package } from 'lucide-react';
import type { StagedArtifact } from '../../kernel/stagingManager';
import { STAGE_STATUS_CLS, SectionHeader, relTime } from './helpers';

interface StagingPanelProps {
  artifacts: StagedArtifact[];
}

export const StagingPanel: React.FC<StagingPanelProps> = ({ artifacts }) => {
  const active = artifacts.filter((a) => a.status === 'staged' || a.status === 'sealed');
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
          {recent.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-[11px] font-mono px-2 py-1.5 rounded-lg bg-black/20 border border-white/[0.04]">
              <span className={`shrink-0 ${STAGE_STATUS_CLS[a.status] ?? 'text-zinc-400'}`}>{a.status}</span>
              <span className="text-zinc-400 truncate flex-1">{a.kind}:{a.key}</span>
              <span className="text-zinc-600 shrink-0">v{a.version}</span>
              <span className="text-zinc-500 shrink-0">{relTime(a.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
