import React, { useEffect, useState } from 'react';
import { useOS } from '../../store/osStore';
import {
  User, Cpu, Shield, Zap, Palette, Monitor, Brain, CheckCircle, Database, AlertCircle, Globe, Plus, Trash2, TestTube2, Loader2
} from 'lucide-react';
import { aiPipelineBridge } from '../../kernel/aiPipelineBridge';
import { localBrain } from '../../services/localBrain';
import { aiGateway, PROVIDER_PRESETS, type AIProvider } from '../../services/aiProviders';
import ModelManager from '../ModelManager';

export default function SettingsApp() {
  const {
    kernelRules,
    updateKernelRules,
    accentColor,
    setAccentColor,
    currentUser,
    updateProfile,
    setUiScale,
    uiScale,
    addNotification,
    setWallpaper,
    wallpaperMotionStrength,
    setWallpaperMotionStrength
  } = useOS();

  const [tab, setTab] = useState<'profile' | 'system' | 'appearance' | 'daemon' | 'ai' | 'models' | 'providers'>('profile');
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiPrompt, setAiPrompt] = useState('');
  const [daemonNote, setDaemonNote] = useState('');
  const [profileName, setProfileName] = useState(currentUser?.name ?? 'System');
  const [profileBio, setProfileBio] = useState((currentUser as any)?.bio ?? '');
  const [enableAIAssist, setEnableAIAssist] = useState(Boolean(kernelRules.autonomyEnabled));

  const handleAccentChange = (presetName: string, color: string) => {
    setAccentColor(color);
    // Use dynamic import instead of require() — require crashes in browser
    import('../../kernel/themeEngine').then(({ themeEngine }) => {
      themeEngine.setCustomAccent(color);
    }).catch(() => {
      // Fallback: set CSS variables directly
      const root = document.documentElement;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      root.style.setProperty('--nx-accent', color);
      root.style.setProperty('--nx-accent-rgb', `${r},${g},${b}`);
    });
    addNotification({ title: 'Theme Updated', message: `Accent set to ${presetName}.`, type: 'success' });
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'system' as const, label: 'System', icon: Cpu },
    { id: 'providers' as const, label: 'AI Providers', icon: Globe },
    { id: 'models' as const, label: 'Models', icon: Database },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'daemon' as const, label: 'DAEMON Core', icon: Zap },
    { id: 'ai' as const, label: 'AI', icon: Brain }
  ];

  const ACCENTS = [
    { name: 'Emerald', color: '#10b981' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Violet', color: '#8b5cf6' },
    { name: 'Zinc', color: '#71717a' },
  ];

  useEffect(() => {
    setProfileName(currentUser?.name ?? 'System');
    setProfileBio((currentUser as any)?.bio ?? '');
  }, [currentUser?.name, currentUser]);

  useEffect(() => {
    setEnableAIAssist(Boolean(kernelRules.autonomyEnabled));
  }, [kernelRules.autonomyEnabled]);

  const [weightsDownloaded, setWeightsDownloaded] = useState(false);

  useEffect(() => {
    const checkWeights = async () => {
      const models = localBrain.getStoredModels();
      const dm = models.find((m: { id: string }) => m.id === 'lfm-daemon');
        setWeightsDownloaded(dm?.downloaded === true);
    };
    checkWeights();
  }, [installing]);

  const handleInstallDaemon = async () => {
    setInstalling(true);
    setProgress(0);
    setDaemonNote('Initializing neural link...');
    
    try {
      const { daemonBridge } = await import('../../kernel/daemonBridge');
      await daemonBridge.install((p) => {
        setProgress(p.progress);
        setDaemonNote(p.message);
      });
      
      updateKernelRules({ daemonInjected: true, autonomyEnabled: true });
      aiPipelineBridge.refresh();
      setInstalling(false);
      setWeightsDownloaded(true);
    } catch (e: any) {
      addNotification({ title: 'Fusion Failed', message: e?.message || 'Unable to install DAEMON.', type: 'error' });
      setInstalling(false);
    }
  };

  const handleDownloadWeights = async () => {
      setInstalling(true);
      setProgress(0);
      setDaemonNote('Retrieving DAEMON weights...');
      try {
      await localBrain.checkAndDownloadDaemonModel((pct: number, msg: string) => {
              setProgress(pct);
              setDaemonNote(msg);
          });
          setWeightsDownloaded(true);
          setInstalling(false);
          addNotification({ title: 'Weights Ready', message: 'DAEMON neural weights stored successfully.', type: 'success' });
      } catch (e: any) {
          addNotification({ title: 'Download Failed', message: e.message, type: 'error' });
          setInstalling(false);
      }
  };

  const saveProfile = () => {
    updateProfile({
      name: profileName.trim() || 'System',
      bio: profileBio.trim(),
      themeColor: accentColor
    } as any);
    addNotification({ title: 'Profile Saved', message: 'Identity updated successfully.', type: 'success' });
  };

  const runAIDiagnostic = async () => {
    const result = await aiPipelineBridge.dispatch({
      type: 'ANSWER',
      prompt: aiPrompt || 'Summarize the current system health and next recommended action.'
    });
    // result is already shown via notification in aiPipelineBridge
    setAiPrompt('');
  };

  const WALLPAPERS = [
    { name: 'Aurora', id: 'nexus://procedural/aurora' },
    { name: 'Matrix', id: 'nexus://procedural/matrix' },
    { name: 'Nebula', id: 'nexus://procedural/nebula' },
    { name: 'Cyberpunk', id: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?auto=format&fit=crop&q=80&w=2000' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#050508] text-slate-200">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-56 border-r border-white/5 bg-black/40 p-4 space-y-1 shrink-0">
          <div className="px-3 py-4 mb-2">
            <div className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">Control Center</div>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  tab === id
                    ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {tab === 'profile' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">User Identity</h2>
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px]"
                >
                  Save Profile
                </button>
              </div>

              <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-3xl font-black text-white border border-white/20 shadow-2xl">
                  {profileName?.[0] || 'A'}
                </div>
                <div className="flex-1 space-y-3">
                  <input
                    className="bg-transparent text-xl font-bold text-white border-b border-white/10 focus:border-emerald-500 outline-none w-full pb-1 mb-1"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter Identity Name"
                  />
                  <textarea
                    className="w-full min-h-24 bg-black/30 border border-white/10 rounded-2xl p-3 text-sm text-zinc-200 outline-none focus:border-emerald-500/50"
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Profile bio, mission, or operational notes"
                  />
                  <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono">DAEMON.AUTH_TOKEN :: OK</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-zinc-500 uppercase font-black mb-2 tracking-widest">Active Model</div>
                  <div className="text-sm font-bold text-emerald-400">{kernelRules.activeLocalModel || 'Llama-3.2-1B'}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-zinc-500 uppercase font-black mb-2 tracking-widest">Privileges</div>
                  <div className="text-sm font-bold text-white">SYSTEM_ADMIN</div>
                </div>
              </div>
            </div>
          )}

          {tab === 'system' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Kernel Parameters</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                      <Brain size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Autonomy Engine</div>
                      <div className="text-xs text-zinc-500">Allow DAEMON to perform system actions automatically</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateKernelRules({ autonomyEnabled: !kernelRules.autonomyEnabled })}
                    className={`w-12 h-6 rounded-full transition-all relative ${kernelRules.autonomyEnabled ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${kernelRules.autonomyEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                      <Monitor size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">UI Scale</div>
                      <div className="text-xs text-zinc-500">Match the display to your monitor and comfort level</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setUiScale(Math.max(0.7, uiScale - 0.1))} className="px-3 py-1 rounded-lg bg-white/5 text-zinc-300">-</button>
                    <div className="text-xs font-mono text-emerald-400">{Math.round(uiScale * 100)}%</div>
                    <button onClick={() => setUiScale(Math.min(1.6, uiScale + 0.1))} className="px-3 py-1 rounded-lg bg-white/5 text-zinc-300">+</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 space-y-6">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Visual Interface</h2>
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black mb-4 tracking-widest">Accent Synchronization</div>
                  <div className="grid grid-cols-3 gap-3">
                    {ACCENTS.map(acc => (
                      <button
                        key={acc.name}
                        onClick={() => handleAccentChange(acc.name.toLowerCase(), acc.color)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          accentColor === acc.color
                            ? 'bg-white/5 border-emerald-500/30 ring-1 ring-emerald-500/20'
                            : 'border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: acc.color }} />
                        <span className="text-xs font-bold text-zinc-300">{acc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Display Accessibility</div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5">
                    <div>
                      <div className="text-sm font-bold text-white">Native Contrast Preset</div>
                      <div className="text-xs text-zinc-500">Improves readability across all windows</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/5 text-zinc-300 text-xs font-bold uppercase tracking-widest">
                      Managed in Accessibility
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black mb-4 tracking-widest">Active Surface (Wallpaper)</div>
                  <div className="grid grid-cols-2 gap-3">
                    {WALLPAPERS.map(wp => (
                      <button
                        key={wp.id}
                        onClick={() => {
                            updateKernelRules({ ...kernelRules }); // trigger re-render
                            setWallpaper(wp.id);
                            addNotification({ title: 'Wallpaper Set', message: `${wp.name} activated.`, type: 'success' });
                        }}
                        className="p-4 rounded-xl border border-white/5 hover:border-white/20 bg-white/5 transition-all text-left group"
                      >
                        <div className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{wp.name}</div>
                        <div className="text-[9px] text-zinc-600 uppercase mt-1">Procedural Map</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black mb-4 tracking-widest">Motion Parallax</div>
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">Cursor Reactivity</div>
                        <div className="text-xs text-zinc-500">How strongly the live wallpaper shifts with your cursor</div>
                      </div>
                      <div className="text-xs font-mono text-emerald-400">{Math.round(wallpaperMotionStrength * 100)}%</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={wallpaperMotionStrength}
                      onChange={(e) => setWallpaperMotionStrength(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'daemon' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">DAEMON Core Fusion</h2>

              {!kernelRules.daemonInjected ? (
                <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-5">
                  <Zap className="mx-auto text-emerald-400 animate-pulse" size={48} />
                  <h3 className="text-xl font-black text-white tracking-wide uppercase">DAEMON IS NOT YET INSTALLED</h3>
                  <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Installing the DAEMON Core integrates the recursive intelligence into the kernel and links it to the OS action graph.
                  </p>

                  {installing ? (
                    <div className="space-y-3">
                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="text-[10px] text-emerald-500 font-mono animate-pulse uppercase tracking-[0.2em]">
                        {daemonNote} {progress}%
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleInstallDaemon}
                      className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] text-xs rounded-full transition-all active:scale-95 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                    >
                      Initialize Fusion
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                    <CheckCircle className="text-emerald-400 shrink-0" size={24} />
                    <div>
                      <div className="text-sm font-black text-white uppercase tracking-widest">DAEMON_CORE_ACTIVE</div>
                      <div className="text-xs text-emerald-500/70 font-mono mt-0.5">SYSCALL_HOOKS: INJECTED | VECTOR_SPACE: MAPPED</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Autonomy Binding</span>
                      <span className="text-xs text-emerald-400 font-bold uppercase">{kernelRules.autonomyEnabled ? 'Linked' : 'Disabled'}</span>
                    </div>
                    <div className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Memory Rewrite</span>
                      <span className="text-xs text-emerald-400 font-bold uppercase">Fractal Implanted</span>
                    </div>
                    <div className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Core Injection</span>
                      <span className="text-xs text-emerald-400 font-bold uppercase">Kernel-Injected DNA</span>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-950 border border-white/5 rounded-2xl italic text-zinc-500 text-xs leading-relaxed text-center font-serif">
                    "DAEMON is the integrated AI engine of NexusOS. It provides autonomous reasoning, app generation, code synthesis, and system management. Fully connected to the kernel with persistent memory and self-healing capabilities."
                  </div>

                  {!weightsDownloaded && (
                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                        <div className="flex items-center gap-3 text-amber-400">
                            <AlertCircle size={20} />
                            <div className="text-sm font-bold uppercase tracking-widest">Neural Weights Missing</div>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            The DAEMON Core is injected, but the neural weight matrix (Llama 3.2 1B) is not present in the local vault. 
                            Retrieve the weights to enable autonomous reasoning and streaming inference.
                        </p>
                        {installing ? (
                            <div className="space-y-2">
                                <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="text-[9px] text-emerald-500 font-mono animate-pulse uppercase">
                                    {daemonNote} {progress}%
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleDownloadWeights}
                                className="w-full py-3 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-500 border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Retrieve Neural Weights
                            </button>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'ai' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 space-y-4">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">AI Control Channel</h2>
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Command Prompt</div>
                <textarea
                  className="w-full min-h-24 bg-black/30 border border-white/10 rounded-2xl p-3 text-sm text-zinc-100 outline-none focus:border-emerald-500/40"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask the DAEMON what to do next, or request a concrete OS action."
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={runAIDiagnostic}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px]"
                  >
                    Run AI Diagnostic
                  </button>
                  <button
                    onClick={async () => {
                        await aiPipelineBridge.dispatch({ type: 'ANSWER', prompt: aiPrompt || 'Summarize system health.' });
                        setAiPrompt('');
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 text-zinc-200 font-black uppercase tracking-widest text-[10px]"
                  >
                    Send to AI
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">AI Assist</div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5">
                  <div>
                    <div className="text-sm font-bold text-white">Autonomy Assist</div>
                    <div className="text-xs text-zinc-500">Use AI to propose safe OS actions and task routing</div>
                  </div>
                  <button
                    onClick={() => {
                      setEnableAIAssist(!enableAIAssist);
                      updateKernelRules({ autonomyEnabled: !enableAIAssist });
                    }}
                    className={`w-12 h-6 rounded-full transition-all relative ${enableAIAssist ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enableAIAssist ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'models' && (
            <div className="h-[600px] border border-white/5 rounded-3xl overflow-hidden">
               <ModelManager windowId="settings-models" />
            </div>
          )}

          {tab === 'providers' && <AIProvidersTab addNotification={addNotification} />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI PROVIDERS TAB — Universal Multi-Provider Configuration
// ═══════════════════════════════════════════════════════════════
function AIProvidersTab({ addNotification }: { addNotification: (n: any) => void }) {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [activeId, setActiveId] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs: number }>>({});
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    setProviders(aiGateway.getProviders());
    setActiveId(aiGateway.getActiveProviderId());
  }, []);

  const handleAddPreset = (presetId: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const newProvider: AIProvider = { ...preset, apiKey: '', enabled: false };
    aiGateway.addProvider(newProvider);
    setProviders(aiGateway.getProviders());
    setShowAddMenu(false);
    addNotification({ title: 'Provider Added', message: `${preset.name} added. Enter your API key to activate.`, type: 'info' });
  };

  const handleKeyChange = (id: string, key: string) => {
    aiGateway.updateProviderKey(id, key);
    setProviders(aiGateway.getProviders());
  };

  const handleSetActive = (id: string) => {
    aiGateway.setActiveProvider(id);
    setActiveId(id);
    const p = providers.find(p => p.id === id);
    addNotification({ title: 'Active Provider', message: `${p?.name || id} is now the active AI provider.`, type: 'success' });
  };

  const handleRemove = (id: string) => {
    aiGateway.removeProvider(id);
    setProviders(aiGateway.getProviders());
    setActiveId(aiGateway.getActiveProviderId());
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const result = await aiGateway.testProvider(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: e.message, latencyMs: 0 } }));
    }
    setTesting(null);
  };

  const availablePresets = PROVIDER_PRESETS.filter(p => !providers.some(ep => ep.id === p.id));

  return (
    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">AI Providers</h2>
          <p className="text-xs text-zinc-500 mt-1">Connect any AI API — OpenAI, Anthropic, Google, Groq, Mistral, and more.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
          >
            <Plus size={12} /> Add Provider
          </button>
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {availablePresets.length === 0 ? (
                <div className="p-4 text-xs text-zinc-500 text-center">All providers already added</div>
              ) : (
                availablePresets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleAddPreset(preset.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <Globe size={14} className="text-accent shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">{preset.name}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{preset.baseUrl}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active provider indicator */}
      {activeId && providers.find(p => p.id === activeId && p.enabled) && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Active: {providers.find(p => p.id === activeId)?.name}
          </div>
          <div className="text-[9px] text-zinc-500 ml-auto">All AI inference routed here</div>
        </div>
      )}

      {!activeId || !providers.some(p => p.enabled) ? (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <div className="text-xs text-amber-400">No cloud provider active — using local GGUF model (Wllama/LM Studio)</div>
        </div>
      ) : null}

      {/* Provider list */}
      <div className="space-y-3">
        {providers.map(provider => {
          const result = testResults[provider.id];
          const isActive = activeId === provider.id;
          return (
            <div
              key={provider.id}
              className={`p-5 rounded-2xl border transition-all ${
                isActive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Globe size={16} className={isActive ? 'text-emerald-400' : 'text-zinc-500'} />
                  <span className="text-sm font-bold text-white">{provider.name}</span>
                  {provider.enabled && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Configured
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {provider.enabled && !isActive && (
                    <button
                      onClick={() => handleSetActive(provider.id)}
                      className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => handleTest(provider.id)}
                    disabled={!provider.apiKey || testing === provider.id}
                    className="p-1.5 text-zinc-500 hover:text-cyan-400 transition-colors disabled:opacity-30"
                    title="Test connection"
                  >
                    {testing === provider.id ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} />}
                  </button>
                  <button
                    onClick={() => handleRemove(provider.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Remove provider"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* API Key Input */}
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-500/40 font-mono placeholder-zinc-600"
                  placeholder={`Enter ${provider.name} API Key...`}
                  value={provider.apiKey}
                  onChange={e => handleKeyChange(provider.id, e.target.value)}
                />
              </div>

              {/* Model selector */}
              {provider.models && provider.models.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Models:</span>
                  {provider.models.map(m => (
                    <span key={m} className="px-2 py-0.5 rounded text-[9px] bg-white/5 text-zinc-400 border border-white/5">
                      {m.split('/').pop()}
                    </span>
                  ))}
                </div>
              )}

              {/* Base URL */}
              <div className="mt-2 text-[9px] text-zinc-600 font-mono truncate">
                {provider.baseUrl}
              </div>

              {/* Test result */}
              {result && (
                <div className={`mt-2 px-3 py-2 rounded-lg text-xs ${
                  result.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {result.success ? '✓' : '✗'} {result.message} {result.latencyMs > 0 && `(${result.latencyMs}ms)`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {providers.length === 0 && (
        <div className="text-center py-12 text-zinc-600">
          <Globe size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">No AI providers configured yet.</p>
          <p className="text-xs mt-1">Click "Add Provider" to connect OpenAI, Anthropic, Google, or others.</p>
        </div>
      )}
    </div>
  );
}
