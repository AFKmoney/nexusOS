import React from 'react';
import {
  Play, Pause, Power, PowerOff, ShieldAlert,
} from 'lucide-react';
import { humanOverride } from '../../kernel/humanOverride';
import type { OverrideMode } from '../../kernel/humanOverride';
import type { AutonomyMetrics } from '../../kernel/autonomyHealthMonitor';
import { OVERRIDE_META, HEALTH_CLS, ConfidenceBar, MetricRow, pct } from './helpers';

interface StatusPanelProps {
  mode: OverrideMode;
  metrics: AutonomyMetrics;
}

// The top "kill switch" panel: shows current override mode, confidence
// bar, and the Pause / Safe Mode / Resume / Kill Switch buttons. All
// actions are routed through the humanOverride singleton.
export const StatusPanel: React.FC<StatusPanelProps> = ({ mode, metrics }) => {
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
        <MetricRow label="Health"    value={metrics.healthStatus.toUpperCase()} cls={HEALTH_CLS[metrics.healthStatus] ?? 'text-zinc-300'} />
        <MetricRow label="Proposals" value={metrics.proposalsTotal} />
        <MetricRow label="Success"   value={pct(metrics.successRate)} cls={metrics.successRate >= 0.8 ? 'text-emerald-400' : 'text-amber-400'} />
        <MetricRow label="Rollbacks" value={metrics.proposalsRolledBack} cls={metrics.proposalsRolledBack > 0 ? 'text-purple-400' : 'text-zinc-400'} />
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {mode === 'active' && (
          <>
            <button
              onClick={onPause}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-400 hover:bg-amber-950/70 transition-colors"
            >
              <Pause size={11} /> Pause
            </button>
            <button
              onClick={onSafeMode}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-orange-950/40 border border-orange-500/30 text-orange-400 hover:bg-orange-950/70 transition-colors"
            >
              <ShieldAlert size={11} /> Safe Mode
            </button>
          </>
        )}
        {(mode === 'paused' || mode === 'safe-mode') && (
          <button
            onClick={onResume}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/70 transition-colors"
          >
            <Play size={11} /> Resume
          </button>
        )}
        {mode !== 'disabled' && (
          <button
            onClick={onKillSwitch}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-400 hover:bg-rose-950/70 transition-colors ml-auto"
          >
            <PowerOff size={11} /> Kill Switch
          </button>
        )}
        {mode === 'disabled' && (
          <button
            onClick={onResume}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/70 transition-colors"
          >
            <Power size={11} /> Re-enable
          </button>
        )}
      </div>
    </div>
  );
};
