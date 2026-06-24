import React, { useState } from 'react';
import { Terminal, Filter } from 'lucide-react';
import type { AutonomyEvent } from '../../kernel/autonomyEventLog';
import { EVENT_KIND_CLS, SectionHeader, relTime } from './helpers';

interface AuditLogPanelProps {
  events: AutonomyEvent[];
}

export const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ events }) => {
  const [subsystemFilter, setSubsystemFilter] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);

  const subsystems = Array.from(new Set(events.map((e) => e.subsystem)));

  const filtered = (subsystemFilter === 'all' ? events : events.filter((e) => e.subsystem === subsystemFilter))
    .slice()
    .reverse()
    .slice(0, 100);

  return (
    <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={Terminal} title="Audit Log" count={events.length} />
        <button
          onClick={() => setShowFilter((x) => !x)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Filter by subsystem"
        >
          <Filter size={12} />
        </button>
      </div>

      {showFilter && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['all', ...subsystems].map((s) => (
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
        ) : (
          filtered.map((e) => (
            <div key={e.id} className="flex items-start gap-2 py-0.5 border-b border-white/[0.03] last:border-0">
              <span className="text-zinc-600 shrink-0 tabular-nums">{relTime(e.timestamp)}</span>
              <span className={`shrink-0 ${EVENT_KIND_CLS[e.kind] ?? 'text-zinc-400'}`}>[{e.kind}]</span>
              <span className="text-zinc-400 truncate">{e.summary}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
