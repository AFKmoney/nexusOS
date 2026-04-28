import React, { useEffect, useMemo, useState } from 'react';
import { useOS } from '../store/osStore';
import { localBrain, ModelConfig } from '../services/localBrain';
import {
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Cpu,
  Database,
  Trash2,
  Star,
  Info,
  ExternalLink,
  Zap,
  Check,
  HardDrive,
  Play,
  RefreshCw,
  FileText,
  Layers3
} from 'lucide-react';

type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

interface DownloadStatus {
  pct: number;
  msg: string;
  state: DownloadState;
}

type CatalogModel = {
  repoId: string;
  filename: string;
  name: string;
  size: string;
  author: string;
  tags: string[];
  rating: number;
  description: string;
};

const FEATURED_MODELS: CatalogModel[] = [
  {
    repoId: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    filename: 'Llama-3.2-1B-Instruct-Q8_0.gguf',
    name: 'Llama 3.2 1B Instruct',
    size: '1.3 GB',
    author: 'Meta',
    tags: ['instruct', 'fast', 'chat'],
    rating: 4.5,
    description: 'Ultra-fast Meta model. Best for real-time responses.',
  },
  {
    repoId: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    filename: 'qwen2.5-1.5b-instruct-q8_0.gguf',
    name: 'Qwen 2.5 1.5B Instruct',
    size: '1.7 GB',
    author: 'Alibaba',
    tags: ['instruct', 'multilingual', 'code'],
    rating: 4.7,
    description: 'Excellent multilingual & code model. Very capable for its size.',
  },
  {
    repoId: 'bartowski/Phi-3.5-mini-instruct-GGUF',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    name: 'Phi 3.5 Mini Instruct',
    size: '2.2 GB',
    author: 'Microsoft',
    tags: ['instruct', 'reasoning', 'code'],
    rating: 4.6,
    description: "Microsoft's reasoning powerhouse. Great at coding tasks.",
  },
  {
    repoId: 'bartowski/gemma-2-2b-it-GGUF',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    name: 'Gemma 2 2B Instruct',
    size: '1.6 GB',
    author: 'Google',
    tags: ['instruct', 'chat', 'safety'],
    rating: 4.4,
    description: "Google's safety-focused model. Clean, helpful responses.",
  },
  {
    repoId: 'bartowski/SmolLM2-1.7B-Instruct-GGUF',
    filename: 'SmolLM2-1.7B-Instruct-Q8_0.gguf',
    name: 'SmolLM2 1.7B Instruct',
    size: '1.8 GB',
    author: 'HuggingFace',
    tags: ['instruct', 'lightweight', 'fast'],
    rating: 4.3,
    description: "HuggingFace's own optimized small LM.",
  },
  {
    repoId: 'bartowski/Mistral-7B-Instruct-v0.3-GGUF',
    filename: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    name: 'Mistral 7B Instruct v0.3',
    size: '4.1 GB',
    author: 'Mistral AI',
    tags: ['instruct', 'powerful', 'code'],
    rating: 4.8,
    description: 'The gold standard 7B. Best quality for code generation.',
  },
];

function normalizeModelKey(value: string) {
  return value.toLowerCase().replace(/\\/g, '/');
}

function isSameCatalogModel(model: ModelConfig, entry: CatalogModel) {
  const pathMatch = normalizeModelKey(model.path).includes(normalizeModelKey(entry.repoId));
  const nameMatch = normalizeModelKey(model.name).includes(normalizeModelKey(entry.name));
  return pathMatch || nameMatch;
}

function sizeLabelForModel(model: CatalogModel) {
  return model.size;
}

function formatCtx(model: ModelConfig) {
  return model.nCtx || 4096;
}

function formatGpuLayers(model: ModelConfig) {
  return model.nGpuLayers || 50;
}

export default function ModelManager({ windowId }: { windowId: string }) {
  const { updateKernelRules, addNotification } = useOS();
  const [tab, setTab] = useState<'installed' | 'discover' | 'custom'>('installed');
  const [installedModels, setInstalledModels] = useState<ModelConfig[]>([]);
  const [activeModelId, setActiveModelId] = useState('');
  const [loadedModelIds, setLoadedModelIds] = useState<string[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<Record<string, DownloadStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [customRepo, setCustomRepo] = useState('');
  const [customFile, setCustomFile] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchProgress, setSwitchProgress] = useState('');
  const [selectedModelKey, setSelectedModelKey] = useState<string>('');

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

  useEffect(() => {
    void refreshState();
  }, []);

  useEffect(() => {
    setSelectedModelKey(activeModelId || installedModels[0]?.id || FEATURED_MODELS[0]?.repoId + '/' + FEATURED_MODELS[0]?.filename || '');
  }, [activeModelId, installedModels]);

  const activeModel = useMemo(() => {
    try {
      return localBrain.getActiveModel();
    } catch {
      return installedModels.find(m => m.id === activeModelId) || installedModels[0] || null;
    }
  }, [activeModelId, installedModels]);

  const installedCatalogKeys = useMemo(() => {
    const keys = new Set<string>();
    installedModels.forEach(model => {
      FEATURED_MODELS.forEach(entry => {
        if (isSameCatalogModel(model, entry)) {
          keys.add(`${entry.repoId}/${entry.filename}`);
        }
      });
      keys.add(normalizeModelKey(model.id));
      keys.add(normalizeModelKey(model.path));
    });
    return keys;
  }, [installedModels]);

  const [remoteResults, setRemoteResults] = useState<CatalogModel[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setRemoteResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      try {
        const results = await localBrain.searchHuggingFace(searchQuery);
        setRemoteResults(results.map(r => ({
          repoId: r.repoId || '',
          filename: r.filename || 'Click to select file...',
          name: r.name,
          size: 'Unknown',
          author: r.author || 'Unknown',
          tags: r.tags || [],
          rating: 0,
          description: `Remote Hugging Face repository: ${r.repoId}`
        })));
      } finally {
        setIsSearchingRemote(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredFeatured = FEATURED_MODELS.filter(m =>
    !searchQuery ||
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tags.some(t => t.includes(searchQuery.toLowerCase()))
  );

  const allDiscoverModels = [...filteredFeatured, ...remoteResults.filter(r => !FEATURED_MODELS.some(f => f.repoId === r.repoId))];

  const handleDownload = async (model: CatalogModel) => {
    let filename = model.filename;
    
    if (filename === 'Click to select file...' || !filename.endsWith('.gguf')) {
        const input = prompt(`Enter the GGUF filename to download from ${model.repoId}:\n(Example: Llama-3.2-1B-Instruct-Q8_0.gguf)`, "Llama-3.2-1B-Instruct-Q8_0.gguf");
        if (!input) return;
        filename = input.trim();
    }

    const sizeInGB = parseFloat(model.size);
    if (!isNaN(sizeInGB) && sizeInGB > 2.5) {
        const proceed = confirm(`Warning: This model is ${model.size}. Large models may crash the browser Wasm engine. Continue?`);
        if (!proceed) return;
    }

    const statusKey = model.repoId; // Use repoId as key for UI status
    setDownloadStatus(prev => ({ ...prev, [statusKey]: { pct: 0, msg: 'Starting...', state: 'downloading' } }));

    try {
      const config = await localBrain.downloadFromHuggingFace(model.repoId, filename, (pct, msg) => {
        setDownloadStatus(prev => ({ ...prev, [statusKey]: { pct, msg, state: 'downloading' } }));
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

      setDownloadStatus(prev => ({ ...prev, [statusKey]: { pct: 100, msg: 'Installed!', state: 'done' } }));
      await refreshState();
      addNotification({ title: 'Model Downloaded', message: `"${model.name}" is now installed.`, type: 'success' });
    } catch (e: any) {
      setDownloadStatus(prev => ({ ...prev, [statusKey]: { pct: 0, msg: e?.message || 'Download failed', state: 'error' } }));
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

  const tabs = [
    { id: 'installed', label: 'Installed', icon: Database },
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'custom', label: 'Custom HF', icon: ExternalLink },
  ] as const;

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
            <HardDrive size={12} />
            {loadedModelIds.length} loaded
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
          <div className="space-y-2">
            {installedModels.length === 0 && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-zinc-500">
                No models installed yet. Go to Discover to download a Hugging Face model.
              </div>
            )}
            {installedModels.map(model => {
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
                            <Layers3 size={12} />
                            Installed
                          </span>
                          <span className={`px-2 py-1 rounded-full border flex items-center gap-1 ${isLoaded ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-zinc-500'}`}>
                            <HardDrive size={12} />
                            {isLoaded ? 'Loaded' : 'Not loaded'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => handleSwitch(model.id)}
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
                      {model.id !== 'lfm2.5-1.2b' && (
                        <button
                          onClick={() => handleRemove(model.id)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-lg transition-all"
                          title="Remove model"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'discover' && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-zinc-600" />
              <input
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/40 transition-all"
                placeholder="Search models on Hugging Face..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {isSearchingRemote && (
                 <div className="absolute right-3 top-2.5">
                    <Loader2 size={16} className="text-emerald-500 animate-spin" />
                 </div>
              )}
            </div>

            {allDiscoverModels.map(model => {
              const key = `${model.repoId}/${model.filename}`;
              const statusKey = model.repoId;
              const dl = downloadStatus[statusKey];
              const isInstalled = installedCatalogKeys.has(key.toLowerCase()) || installedModels.some(m => isSameCatalogModel(m, model));
              const isSelected = selectedModelKey === key;
              return (
                <div key={key} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <div className="text-base font-bold text-white">{model.name}</div>
                        <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                          <Star size={12} fill="currentColor" /> {model.rating}
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-widest text-zinc-500">
                          {sizeLabelForModel(model)}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 mb-2">{model.description}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-zinc-600 font-mono">{model.author}</span>
                        <span className="text-xs text-zinc-700">·</span>
                        <button 
                          onClick={() => {
                              const input = prompt(`Enter the GGUF filename to download from ${model.repoId}:`, model.filename);
                              if (input) {
                                  setRemoteResults(prev => prev.map(r => r.repoId === model.repoId ? { ...r, filename: input.trim() } : r));
                              }
                          }}
                          className="text-xs text-zinc-600 flex items-center gap-1 hover:text-emerald-400 transition-colors"
                        >
                          <FileText size={12} />
                          {model.filename}
                        </button>
                        {model.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <button
                        onClick={() => setSelectedModelKey(key)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all ${isSelected ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Select
                      </button>

                      {isInstalled ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                          <CheckCircle size={16} /> Installed
                        </div>
                      ) : dl?.state === 'downloading' ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-blue-400 text-xs">
                            <Loader2 size={14} className="animate-spin" /> {dl.pct}%
                          </div>
                          <div className="text-xs text-zinc-600 max-w-[120px] text-right truncate">{dl.msg}</div>
                        </div>
                      ) : dl?.state === 'done' ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                          <CheckCircle size={16} /> Ready
                        </div>
                      ) : dl?.state === 'error' ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-red-400 text-xs">
                            <AlertCircle size={14} /> Failed
                          </div>
                          <button
                            onClick={() => handleDownload(model)}
                            className="text-xs text-zinc-600 hover:text-white underline"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownload(model)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all hover:scale-105"
                        >
                          <Download size={14} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'custom' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3">
              <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-300/70 leading-relaxed">
                Enter any Hugging Face repository ID and GGUF filename to add a custom model. NexusOS downloads and registers models with the built-in local inference engine; no LM Studio dependency is required.
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5">Repository ID</div>
                <input
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/40 transition-all font-mono"
                  placeholder="e.g. bartowski/Llama-3.2-3B-Instruct-GGUF"
                  value={customRepo}
                  onChange={e => setCustomRepo(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5">GGUF Filename</div>
                <input
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/40 transition-all font-mono"
                  placeholder="e.g. Llama-3.2-3B-Instruct-Q4_K_M.gguf"
                  value={customFile}
                  onChange={e => setCustomFile(e.target.value)}
                />
              </div>
              <button
                onClick={handleCustomAdd}
                disabled={!customRepo || !customFile}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30"
              >
                <Download size={16} /> Register Model
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}