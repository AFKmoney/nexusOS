import React, { useEffect, useState } from 'react';
import { Brain, BatteryLow, Activity, BarChart2 } from 'lucide-react';
import { useOS } from '../../store/osStore';
import { usageTracker } from '../../kernel/usageTracker';
import { missionLearning } from '../../kernel/missionLearning';
import { memory } from '../../kernel/memory';

// Neural Field panel — RNF engine status, power mode indicator,
// behavioral prediction map, and usage frequency chart. Re-renders
// every 5 seconds to pick up fresh usage-tracker data.
export const NeuralFieldPanel: React.FC = () => {
  const powerMode = useOS((s) => s.powerMode);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // tick is intentionally consumed — it forces a re-render so the
  // usageTracker / memory reads below reflect the latest state.
  void tick;

  const predicted = usageTracker.getPredictedApps(5);
  const mostUsed  = usageTracker.getMostUsed(5);
  const coherence = usageTracker.getFieldCoherence();
  const sessions  = usageTracker.getTotalSessions();
  const memCount  = memory.getRecent(100).length;

  const POWER_META = {
    normal:   { label: 'NOMINAL',  cls: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/30' },
    saver:    { label: 'SAVER',    cls: 'text-amber-400   bg-amber-950/20   border-amber-500/30'   },
    critical: { label: 'CRITICAL', cls: 'text-rose-400    bg-rose-950/20    border-rose-500/30'    },
  } as const;
  const pm = POWER_META[powerMode] ?? POWER_META.normal;

  return (
    <div className="space-y-4">
      {/* RNF Status */}
      <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} className="text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Recursive Neural Field Engine</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          {[
            { label: 'Field Coherence',     value: `${(coherence * 100).toFixed(0)}%`,  bar: coherence },
            { label: 'Synaptic Density',    value: `${memCount} nodes`,                 bar: Math.min(1, memCount / 100) },
            { label: 'Behavioral Sessions', value: `${sessions}`,                       bar: Math.min(1, sessions / 50) },
            { label: 'Adaptive Cycles',     value: `${Object.values(missionLearning.snapshot()).reduce((acc, v: any) => acc + (v?.length ?? 0), 0)}`, bar: Math.min(1, sessions / 30) },
          ].map(({ label, value, bar }) => (
            <div key={label}>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-zinc-500">{label}</span>
                <span className="text-emerald-400">{value}</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-700" style={{ width: `${bar * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Power Mode */}
      <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BatteryLow size={14} className="text-zinc-400" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Power Mode</span>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${pm.cls}`}>
          {pm.label}
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 font-mono">
          {powerMode === 'normal'   && 'Autonomy engine running at full cadence.'}
          {powerMode === 'saver'    && 'Battery ≤20% — autonomy throttled 3× to preserve power.'}
          {powerMode === 'critical' && 'Battery ≤10% — autonomy suspended. Recharging required.'}
        </p>
      </div>

      {/* Behavioral Predictions */}
      <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-purple-400" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Behavioral Resonance Map</span>
        </div>
        {predicted.length === 0 ? (
          <p className="text-xs text-zinc-600 font-mono">No patterns detected yet. Use the OS normally to build resonance.</p>
        ) : (
          <div className="space-y-2">
            {predicted.map((p) => (
              <div key={p.appId} className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2 h-2 rounded-full bg-purple-500/60 shrink-0" />
                <span className="text-zinc-300 flex-1 truncate">{p.appId}</span>
                <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${Math.min(100, p.score * 120)}%` }} />
                </div>
                <span className="text-purple-400 text-[10px] w-8 text-right">{(p.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Most Used */}
      {mostUsed.length > 0 && (
        <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Usage Frequency</span>
          </div>
          <div className="space-y-1.5">
            {mostUsed.map((u, i) => (
              <div key={u.appId} className="flex items-center gap-2 text-xs font-mono">
                <span className="text-zinc-600 w-4">{i + 1}.</span>
                <span className="text-zinc-300 flex-1 truncate">{u.appId}</span>
                <span className="text-cyan-400">{u.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
