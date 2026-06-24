import React from 'react';
import {
  CheckCircle, HardDrive, Layers3, Play, Trash2,
} from 'lucide-react';
import type { ModelConfig } from '../../services/localBrain';
import { formatCtx, formatGpuLayers } from './shared';

interface InstalledModelsListProps {
  installedModels: ModelConfig[];
  activeModelId: string;
  loadedModelIds: string[];
  isSwitching: boolean;
  onSwitch: (modelId: string) => void;
  onRemove: (id: string) => void;
}

export const InstalledModelsList: React.FC<InstalledModelsListProps> = ({
  installedModels, activeModelId, loadedModelIds, isSwitching, onSwitch, onRemove,
}) => {
  if (installedModels.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-zinc-500">
        No models installed yet. Go to Discover to download a Hugging Face model.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {installedModels.map((model) => {
        const isActive = model.id === activeModelId;
        const isLoaded = loadedModelIds.includes(model.id) || loadedModelIds.includes(model.path);
        return (
          <div
            key={model.id}
            className={`p-4 rounded-xl border transition-all ${
              isActive
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-white/[0.02] border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {isActive ? (
                  <CheckCircle size={16} className="text-emerald-400 mt-1 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-zinc-700 mt-1 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-base font-bold text-white truncate">{model.name}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                    ctx:{formatCtx(model)} | gpu:{formatGpuLayers(model)} layers
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-zinc-500">
                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/5 flex items-center gap-1">
                      <Layers3 size={12} /> Installed
                    </span>
                    <span className={`px-2 py-1 rounded-full border flex items-center gap-1 ${isLoaded ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-zinc-500'}`}>
                      <HardDrive size={12} /> {isLoaded ? 'Loaded' : 'Not loaded'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isActive && (
                  <button
                    onClick={() => onSwitch(model.id)}
                    disabled={isSwitching}
                    className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                  >
                    Activate
                  </button>
                )}
                {isActive && (
                  <div className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase flex items-center gap-1">
                    <Play size={12} /> Active
                  </div>
                )}
                {/* All user-installed models can be removed */}
                <button
                  onClick={() => onRemove(model.id)}
                  className="p-1.5 text-zinc-600 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-lg transition-all"
                  title="Remove model"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
