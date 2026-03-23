
import React from 'react';
import { useOS } from '../../store/osStore';
import { Cpu, User, Shield, Trash2, Zap, Settings } from 'lucide-react';

export default function ConfigPanel() {
  const { kernelRules, updateKernelRules, profiles, systemReset } = useOS();

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white">
      <div className="p-6 shrink-0 border-b border-zinc-900">
         <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="text-zinc-500" /> System Params</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        <section>
            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-[0.2em] mb-4">Neural Core</h3>
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Zap size={18} className={kernelRules.autonomyEnabled ? 'text-emerald-400' : 'text-zinc-600'} />
                    <span className="text-base">Self-Prompting Logic</span>
                </div>
                <button onClick={() => updateKernelRules({ autonomyEnabled: !kernelRules.autonomyEnabled })} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${kernelRules.autonomyEnabled ? 'bg-emerald-600' : 'bg-zinc-800 text-zinc-500'}`}>
                    {kernelRules.autonomyEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
            </div>
        </section>

        <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Profiles</h3>
            <div className="space-y-2">
                {profiles.map(p => (
                    <div key={p.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">{p.name[0]}</div>
                            <span className="text-base font-bold">{p.name}</span>
                            {p.isAdmin && <Shield size={16} className="text-emerald-500" />}
                        </div>
                    </div>
                ))}
            </div>
        </section>

        <section className="pt-8 border-t border-zinc-900">
            <button onClick={() => systemReset(true)} className="flex items-center gap-2 text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors text-sm font-bold uppercase tracking-widest">
                <Trash2 size={18} /> Wipe Neural Cache
            </button>
        </section>
      </div>
    </div>
  );
}
