import React from 'react';
import { BarChart2 } from 'lucide-react';
import type { AutonomyMetrics } from '../../kernel/autonomyHealthMonitor';
import { SectionHeader, pct } from './helpers';

interface HealthMetricsPanelProps {
  metrics: AutonomyMetrics;
}

export const HealthMetricsPanel: React.FC<HealthMetricsPanelProps> = ({ metrics }) => {
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
            ['Failed',     metrics.proposalsFailed,     'text-rose-400'],
            ['Denied',     metrics.proposalsDenied,     'text-zinc-400'],
            ['Overrides',  metrics.overrideActivations, 'text-amber-400'],
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
};
