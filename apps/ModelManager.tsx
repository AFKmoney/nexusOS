import React, { useEffect, useMemo, useState } from 'react';
import { useOS } from '../store/osStore';
import { localBrain, type ModelConfig } from '../services/localBrain';
import {
  Cpu, Database, HardDrive, Loader2, Zap, Search, ExternalLink,
} from 'lucide-react';

import { InstalledModelsList } from './modelmanager/InstalledModelsList';
import { DiscoverPanel } from './modelmanager/DiscoverPanel';
import { CustomModelForm } from './modelmanager/CustomModelForm';
import {
  FEATURED_MODELS, normalizeModelKey, isSameCatalogModel, formatCtx, formatGpuLayers,
  type CatalogModel, type DownloadStatus,
} from './modelmanager/shared';

// ─────────────────────────────────────────────────────────────────────
// Model Manager orchestrator
//
// Owns the local-brain state subscriptions and routes them to the three
// tab panels under apps/modelmanager/. Before decomposition this file
// was 598 lines and contained every panel + the catalog + helpers
// inline. Now it is a thin shell that subscribes to localBrain and
// dispatches to the tab panels.
// ─────────────────────────────────────────────────────────────────────

type TabId = 'installed' | 'discover' | 'custom';

export default function ModelManager({ windowId }: { windowId: string }) {
  // windowId is part of the AppComponentProps contract; this component
  // doesn't currently use it but accepts it for forward compatibility.
  void windowId;

  const { updateKernelRules, addNotification } = useOS();
  const [tab, setTab]                 = useState<TabId>('installed');
  const [installedModels, setInstalledModels] = useState<ModelConfig[]>([]);
  const [activeModelId, setActiveModelId]     = useState('');
  const [loadedModelIds, setLoadedModelIds]   = useState<string[]>([]);
  const [downloadStatus, setDownloadStatus]   = useState<Record<string, DownloadStatus>>({});
  const [searchQuery, setSearchQuery]         = useState('');
  const [customRepo, setCustomRepo]           = useState('');
  const [customFile, setCustomFile]           = useState('');
  const [isSwitching, setIsSwitching]         = useState(false);
  const [switchProgress, setSwitchProgress]   = useState('');
  const [selectedModelKey, setSelectedModelKey] = useState<string>('');

  const [remoteResults, setRemoteResults]     = useState<CatalogModel[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  // ─── State refresh ──────────────────────────────────────────────────
  const refreshState = async () => {
    setInstalledModels(localBrain.getStoredModels());
    setActiveModelId(localBrain.getActiveModelId());
    try {
      const loaded = await localBrain.getLoadedModels();
      setLoadedModelIds(Array.isArray(loaded) ? loaded : []);
    } catch {
      setLoadedModelIds([]);
    }
  };

  useEffect(() => { void refreshState(); }, []);

  useEffect(() => {
    setSelectedModelKey(
      activeModelId
        || installedModels[0]?.id
        || (FEATURED_MODELS[0] ? `${FEATURED_MODELS[0].repoId}/${FEATURED_MODELS[0].filename}` : '')
    );
  }, [activeModelId, installedModels]);

  // ─── Derived ────────────────────────────────────────────────────────
  const activeModel = useMemo(() => {
    try {
      return localBrain.getActiveModel();
    } catch {
      return installedModels.find((m) => m.id === activeModelId) || installedModels[0] || null;
    }
  }, [activeModelId, installedModels]);

  const installedCatalogKeys = useMemo(() => {
    const keys = new Set<string>();
    installedModels.forEach((model) => {
      FEATURED_MODELS.forEach((entry) => {
        if (isSameCatalogModel(model, entry)) {
          keys.add(`${entry.repoId}/${entry.filename}`);
        }
      });
      keys.add(normalizeModelKey(model.id));
      keys.add(normalizeModelKey(model.path));
    });
    return keys;
  }, [installedModels]);

  // ─── Remote search (debounced 500ms) ────────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setRemoteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const results = await localBrain.searchHuggingFace(searchQuery);
        setRemoteResults(
          results.map((r) => ({
            repoId: r.repoId || '',
            filename: r.filename || 'Click to select file...',
            name: r.name,
            size: 'Unknown',
            author: r.author || 'Unknown',
            tags: r.tags || [],
            rating: 0,
            description: `Remote Hugging Face repository: ${r.repoId}`,
          }))
        );
      } finally {
        setIsSearchingRemote(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredFeatured = FEATURED_MODELS.filter((m) =>
    !searchQuery
    || m.name.toLowerCase().includes(searchQuery.toLowerCase())
    || m.author.toLowerCase().includes(searchQuery.toLowerCase())
    || m.tags.some((t) => t.includes(searchQuery.toLowerCase()))
  );

  const allDiscoverModels = [
    ...filteredFeatured,
    ...remoteResults.filter((r) => !FEATURED_MODELS.some((f) => f.repoId === r.repoId)),
  ];

  // ─── Actions ────────────────────────────────────────────────────────
  const handleDownload = async (model: CatalogModel) => {
    let filename = model.filename;
    if (filename === 'Click to select file...' || !filename.endsWith('.gguf')) {
      const input = prompt(
        `Enter the GGUF filename to download from ${model.repoId}:\n(Example: Llama-3.2-1B-Instruct-Q8_0.gguf)`,
        'Llama-3.2-1B-Instruct-Q8_0.gguf'
      );
      if (!input) return;
      filename = input.trim();
    }

    const sizeInGB = parseFloat(model.size);
    if (!isNaN(sizeInGB) && sizeInGB > 2.5) {
      const proceed = confirm(`Warning: This model is ${model.size}. Large models may crash the browser Wasm engine. Continue?`);
      if (!proceed) return;
    }

    const statusKey = model.repoId;
    setDownloadStatus((prev) => ({ ...prev, [statusKey]: { pct: 0, msg: 'Starting...', state: 'downloading' } }));

    try {
      const config = await localBrain.downloadFromHuggingFace(model.repoId, filename, (pct, msg) => {
        setDownloadStatus((prev) => ({ ...prev, [statusKey]: { pct, msg, state: 'downloading' } }));
      });

      if (config) {
        const mergedConfig: ModelConfig = {
          ...config,
          name: config.name || model.name,
          id: config.id || `${model.repoId}/${filename}`,
          path: config.path || `${model.repoId}/${filename}`,
        };
        localBrain.installModel(mergedConfig);
      }

      setDownloadStatus((prev) => ({ ...prev, [statusKey]: { pct: 100, msg: 'Installed!', state: 'done' } }));
      await refreshState();
      addNotification({ title: 'Model Downloaded', message: `"${model.name}" is now installed.`, type: 'success' });
    } catch (e: any) {
      setDownloadStatus((prev) => ({ ...prev, [statusKey]: { pct: 0, msg: e?.message || 'Download failed', state: 'error' } }));
      addNotification({ title: 'Download Failed', message: e?.message || 'Unable to download model.', type: 'error' });
    }
  };

  const handleSwitch = async (modelId: string) => {
    if (modelId === activeModelId) return;
    setIsSwitching(true);
    setSwitchProgress('Unloading current model...');
    try {
      await localBrain.switchModel(modelId, (pct, msg) => {
        setSwitchProgress(`${msg} (${pct}%)`);
      });
      setActiveModelId(modelId);
      updateKernelRules({ activeLocalModel: modelId });
      await refreshState();
      addNotification({ title: 'Model Switched', message: `Now using: ${localBrain.getActiveModel().name}`, type: 'success' });
    } catch (e: any) {
      addNotification({ title: 'Switch Failed', message: e?.message || 'Unable to switch model.', type: 'error' });
    } finally {
      setIsSwitching(false);
      setSwitchProgress('');
    }
  };

  const handleRemove = (id: string) => {
    localBrain.removeModel(id);
    void refreshState();
    addNotification({ title: 'Model Removed', message: 'Model unregistered.', type: 'success' });
  };

  const handleCustomAdd = async () => {
    if (!customRepo || !customFile) return;
    const model: CatalogModel = {
      repoId: customRepo.trim(),
      filename: customFile.trim(),
      name: customFile.trim().replace(/\.gguf$/i, ''),
      size: 'Unknown',
      author: 'Custom',
      tags: ['custom'],
      rating: 0,
      description: 'Custom Hugging Face model entry.',
    };
    await handleDownload(model);
    setCustomRepo('');
    setCustomFile('');
  };

  // ─── Tabs ───────────────────────────────────────────────────────────
  const tabs: Array<{ id: TabId; label: string; icon: typeof Database }> = [
    { id: 'installed', label: 'Installed',   icon: Database },
    { id: 'discover',  label: 'Discover',    icon: Search },
    { id: 'custom',    label: 'Custom HF',   icon: ExternalLink },
  ];

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-[#050508] text-slate-200 font-sans">
      <div className="px-5 py-4 border-b border-white/5 bg-black/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Cpu size={18} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-base font-bold text-white">Model Manager</div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest">HuggingFace GGUF Hub</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            {installedModels.length} installed
          </div>
          <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
            <HardDrive size={12} /> {loadedModelIds.length} loaded
          </div>
        </div>
      </div>

      <div className="mx-4 mt-3 mb-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-3">
        <Zap size={18} className="text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-500 uppercase tracking-widest">Active Model</div>
          <div className="text-sm font-bold text-emerald-300 truncate">
            {activeModel?.name || 'No active model'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
            {activeModel ? `${formatCtx(activeModel)} ctx · ${formatGpuLayers(activeModel)} GPU layers` : 'Choose an installed model to begin.'}
          </div>
        </div>
        <div className="text-xs text-emerald-400 font-mono">LOCAL</div>
      </div>

      {isSwitching && (
        <div className="mx-4 my-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
          <Loader2 size={18} className="text-blue-400 animate-spin shrink-0" />
          <div className="text-sm text-blue-300">{switchProgress}</div>
        </div>
      )}

      <div className="flex gap-1 px-4 mt-2 shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
              tab === id
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'border border-white/5 text-zinc-600 hover:text-zinc-400 hover:border-white/10'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === 'installed' && (
          <InstalledModelsList
            installedModels={installedModels}
            activeModelId={activeModelId}
            loadedModelIds={loadedModelIds}
            isSwitching={isSwitching}
            onSwitch={handleSwitch}
            onRemove={handleRemove}
          />
        )}

        {tab === 'discover' && (
          <DiscoverPanel
            searchQuery={searchQuery}
            isSearchingRemote={isSearchingRemote}
            allDiscoverModels={allDiscoverModels}
            downloadStatus={downloadStatus}
            selectedModelKey={selectedModelKey}
            onSetSearchQuery={setSearchQuery}
            onSelectModel={setSelectedModelKey}
            onDownload={handleDownload}
            onPickFilename={(model) => {
              const input = prompt(`Enter the GGUF filename to download from ${model.repoId}:`, model.filename);
              if (input) {
                setRemoteResults((prev) => prev.map((r) => (r.repoId === model.repoId ? { ...r, filename: input.trim() } : r)));
              }
            }}
            isInstalledModel={(model) => {
              const key = `${model.repoId}/${model.filename}`.toLowerCase();
              return installedCatalogKeys.has(key) || installedModels.some((m) => isSameCatalogModel(m, model));
            }}
          />
        )}

        {tab === 'custom' && (
          <CustomModelForm
            customRepo={customRepo}
            customFile={customFile}
            onSetCustomRepo={setCustomRepo}
            onSetCustomFile={setCustomFile}
            onSubmit={handleCustomAdd}
          />
        )}
      </div>
    </div>
  );
}
