
import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { localBrain, ModelConfig } from '../services/localBrain';
import { 
  Search, Download, CheckCircle, AlertCircle, Loader2, Cpu, Database, 
  Trash2, Star, Info, ExternalLink, RefreshCw, Zap, Shield, X
} from 'lucide-react';

// Curated popular GGUF models from HuggingFace
const FEATURED_MODELS = [
  {
    repoId:   'bartowski/Llama-3.2-1B-Instruct-GGUF',
    filename: 'Llama-3.2-1B-Instruct-Q8_0.gguf',
    name:     'Llama 3.2 1B Instruct',
    size:     '1.3 GB',
    author:   'Meta',
    tags:     ['instruct', 'fast', 'chat'],
    rating:   4.5,
    description: 'Ultra-fast Meta model. Best for real-time responses.',
  },
  {
    repoId:   'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    filename: 'qwen2.5-1.5b-instruct-q8_0.gguf',
    name:     'Qwen 2.5 1.5B Instruct',
    size:     '1.7 GB',
    author:   'Alibaba',
    tags:     ['instruct', 'multilingual', 'code'],
    rating:   4.7,
    description: 'Excellent multilingual & code model. Very capable for its size.',
  },
  {
    repoId:   'bartowski/Phi-3.5-mini-instruct-GGUF',
    filename: 'Phi-3.5-mini-instruct-Q4_K_M.gguf',
    name:     'Phi 3.5 Mini Instruct',
    size:     '2.2 GB',
    author:   'Microsoft',
    tags:     ['instruct', 'reasoning', 'code'],
    rating:   4.6,
    description: 'Microsoft\'s reasoning powerhouse. Great at coding tasks.',
  },
  {
    repoId:   'bartowski/gemma-2-2b-it-GGUF',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    name:     'Gemma 2 2B Instruct',
    size:     '1.6 GB',
    author:   'Google',
    tags:     ['instruct', 'chat', 'safety'],
    rating:   4.4,
    description: 'Google\'s safety-focused model. Clean, helpful responses.',
  },
  {
    repoId:   'bartowski/SmolLM2-1.7B-Instruct-GGUF',
    filename: 'SmolLM2-1.7B-Instruct-Q8_0.gguf',
    name:     'SmolLM2 1.7B Instruct',
    size:     '1.8 GB',
    author:   'HuggingFace',
    tags:     ['instruct', 'lightweight', 'fast'],
    rating:   4.3,
    description: 'HuggingFace\'s own optimized small LM.',
  },
  {
    repoId:   'bartowski/Mistral-7B-Instruct-v0.3-GGUF',
    filename: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    name:     'Mistral 7B Instruct v0.3',
    size:     '4.1 GB',
    author:   'Mistral AI',
    tags:     ['instruct', 'powerful', 'code'],
    rating:   4.8,
    description: 'The gold standard 7B. Best quality for code generation.',
  },
];

type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

interface DownloadStatus {
  pct: number;
  msg: string;
  state: DownloadState;
}

export default function ModelManager({ windowId }: { windowId: string }) {
  const { kernelRules, updateKernelRules, addNotification } = useOS();
  const [tab, setTab] = useState<'installed' | 'discover' | 'custom'>('installed');
  const [installedModels, setInstalledModels] = useState<ModelConfig[]>([]);
  const [activeModelId, setActiveModelId] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<Record<string, DownloadStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [customRepo, setCustomRepo] = useState('');
  const [customFile, setCustomFile] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchProgress, setSwitchProgress] = useState('');

  useEffect(() => {
    setInstalledModels(localBrain.getStoredModels());
    setActiveModelId(localBrain.getActiveModelId());
  }, []);

  const handleDownload = async (repoId: string, filename: string, modelName: string) => {
    const key = `${repoId}/${filename}`;
    setDownloadStatus(prev => ({ ...prev, [key]: { pct: 0, msg: 'Starting...', state: 'downloading' } }));

    try {
      const config = await localBrain.downloadFromHuggingFace(repoId, filename, (pct, msg) => {
        setDownloadStatus(prev => ({ ...prev, [key]: { pct, msg, state: 'downloading' } }));
      });
      setDownloadStatus(prev => ({ ...prev, [key]: { pct: 100, msg: 'Registered!', state: 'done' } }));
      setInstalledModels(localBrain.getStoredModels());
      addNotification({ title: '✅ Model Added', message: `"${config.name}" is available in Settings.`, type: 'success' });
    } catch (e: any) {
      setDownloadStatus(prev => ({ ...prev, [key]: { pct: 0, msg: e.message, state: 'error' } }));
      addNotification({ title: '❌ Download Failed', message: e.message, type: 'error' });
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
      addNotification({ title: '⚡ Model Switched', message: `Now using: ${localBrain.getActiveModel().name}`, type: 'success' });
    } catch (e: any) {
      addNotification({ title: '❌ Switch Failed', message: e.message, type: 'error' });
    } finally {
      setIsSwitching(false);
      setSwitchProgress('');
    }
  };

  const handleRemove = (id: string) => {
    localBrain.removeModel(id);
    setInstalledModels(localBrain.getStoredModels());
    addNotification({ title: 'Model Removed', message: `Model unregistered.`, type: 'success' });
  };

  const handleCustomAdd = async () => {
    if (!customRepo || !customFile) return;
    await handleDownload(customRepo.trim(), customFile.trim(), customFile);
    setCustomRepo(''); setCustomFile('');
  };

  const filteredFeatured = FEATURED_MODELS.filter(m =>
    !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tags.some(t => t.includes(searchQuery.toLowerCase()))
  );

  const tabs = [
    { id: 'installed', label: 'Installed', icon: Database },
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'custom', label: 'Custom HF', icon: ExternalLink },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-[#050508] text-slate-200 font-sans">
      {/* Header */}
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
        </div>
      </div>

      {/* Active Model Banner */}
      <div className="mx-4 mt-3 mb-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-3">
        <Zap size={18} className="text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-zinc-500 uppercase tracking-widest">Active Model</div>
          <div className="text-sm font-bold text-emerald-300 truncate">
            {localBrain.getActiveModel().name}
          </div>
        </div>
        <div className="text-xs text-emerald-600 font-mono">ONLINE</div>
      </div>

      {/* Switching Overlay */}
      {isSwitching && (
        <div className="mx-4 my-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
          <Loader2 size={18} className="text-blue-400 animate-spin shrink-0" />
          <div className="text-sm text-blue-300">{switchProgress}</div>
        </div>
      )}

      {/* Tabs */}
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

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* INSTALLED TAB */}
        {tab === 'installed' && (
          <div className="space-y-2">
            {installedModels.map(model => (
              <div key={model.id} className={`p-4 rounded-xl border transition-all ${
                model.id === activeModelId
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {model.id === activeModelId ? (
                      <CheckCircle size={16} className="text-emerald-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700" />
                    )}
                    <div>
                      <div className="text-base font-bold text-white">{model.name}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">ctx:{model.nCtx || 4096} | gpu:{model.nGpuLayers || 50} layers</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {model.id !== activeModelId && (
                      <button
                        onClick={() => handleSwitch(model.id)}
                        disabled={isSwitching}
                        className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                      >
                        Activate
                      </button>
                    )}
                    {model.id !== 'lfm2.5-1.2b' && (
                      <button
                        onClick={() => handleRemove(model.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {model.id === activeModelId && (
                      <div className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase">Active</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DISCOVER TAB */}
        {tab === 'discover' && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-zinc-600" />
              <input
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/40 transition-all"
                placeholder="Search models by name or tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {filteredFeatured.map(model => {
              const key = `${model.repoId}/${model.filename}`;
              const dl = downloadStatus[key];
              const isInstalled = installedModels.some(m => m.path.includes(model.repoId));
              return (
                <div key={key} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-base font-bold text-white">{model.name}</div>
                        <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                          <Star size={12} fill="currentColor" /> {model.rating}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 mb-2">{model.description}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-zinc-600 font-mono">{model.author}</span>
                        <span className="text-xs text-zinc-700">·</span>
                        <span className="text-xs text-zinc-600">{model.size}</span>
                        {model.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">
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
                          <CheckCircle size={16} /> Registered
                        </div>
                      ) : dl?.state === 'error' ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-red-400 text-xs">
                            <AlertCircle size={14} /> Failed
                          </div>
                          <button onClick={() => handleDownload(model.repoId, model.filename, model.name)} className="text-xs text-zinc-600 hover:text-white underline">Retry</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownload(model.repoId, model.filename, model.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all hover:scale-105"
                        >
                          <Download size={14} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CUSTOM TAB */}
        {tab === 'custom' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3">
              <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-300/70 leading-relaxed">
                Enter any HuggingFace repository ID and GGUF filename to add a custom model. The model will be streamed directly from HuggingFace when activated.
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
