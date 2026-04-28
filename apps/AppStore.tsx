import React, { useMemo, useState } from 'react';
import { useOS } from '../store/osStore';
import {
  Box,
  Check,
  Cpu,
  Download,
  Filter,
  Grid3X3,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles
} from 'lucide-react';

type StoreCategory = 'All' | 'Core' | 'AI' | 'Media' | 'Productivity' | 'Custom';

const CATEGORY_MAP: Record<StoreCategory, string[]> = {
  All: [],
  Core: ['system', 'utility'],
  AI: ['intelligence', 'dev'],
  Media: ['media'],
  Productivity: ['productivity'],
  Custom: ['custom']
};

function inferCategory(app: any): StoreCategory {
  const id = String(app?.id || '').toLowerCase();
  const name = String(app?.name || '').toLowerCase();
  const perms = Array.isArray(app?.permissions)
    ? app.permissions.map((p: string) => String(p).toLowerCase())
    : [];
  const haystack = `${id} ${name} ${perms.join(' ')}`;

  if (
    haystack.includes('appstore') ||
    haystack.includes('settings') ||
    haystack.includes('system') ||
    haystack.includes('monitor') ||
    haystack.includes('task')
  ) {
    return 'Core';
  }

  if (
    haystack.includes('hyperide') ||
    haystack.includes('forge') ||
    haystack.includes('daemon') ||
    haystack.includes('aion') ||
    haystack.includes('model') ||
    haystack.includes('terminal') ||
    haystack.includes('snippet')
  ) {
    return 'AI';
  }

  if (
    haystack.includes('paint') ||
    haystack.includes('music') ||
    haystack.includes('video') ||
    haystack.includes('wallpaper') ||
    haystack.includes('fractal') ||
    haystack.includes('rss')
  ) {
    return 'Media';
  }

  if (
    haystack.includes('note') ||
    haystack.includes('calendar') ||
    haystack.includes('kanban') ||
    haystack.includes('contacts') ||
    haystack.includes('file') ||
    haystack.includes('explorer') ||
    haystack.includes('calculator')
  ) {
    return 'Productivity';
  }

  return perms.includes('custom') || app?.isCustom ? 'Custom' : 'Core';
}

export default function AppStore() {
  const {
    registry,
    installedApps,
    installApp,
    addNotification,
    aiManagedStoreEnabled,
    setAiManagedStoreEnabled,
    openWindow
  } = useOS();

  const [search, setSearch] = useState('');
  const [category, setActiveCategory] = useState<StoreCategory>('All');
  const [isInstalling, setIsInstalling] = useState<string | null>(null);

  const appCards = useMemo(() => {
    return registry
      .filter((app) => {
        const haystack = `${app.name} ${app.description || ''} ${app.id}`.toLowerCase();
        if (search && !haystack.includes(search.toLowerCase())) return false;
        return category === 'All' ? true : inferCategory(app) === category;
      })
      .sort(
        (a, b) =>
          Number(installedApps.includes(a.id)) - Number(installedApps.includes(b.id))
      );
  }, [registry, installedApps, search, category]);

  const featuredApps = useMemo(() => {
    return appCards.slice(0, 6).filter((app) => !installedApps.includes(app.id));
  }, [appCards, installedApps]);

  const handleInstall = (appId: string) => {
    if (installedApps.includes(appId) || isInstalling === appId) return;

    setIsInstalling(appId);

    window.setTimeout(() => {
      installApp(appId);
      setIsInstalling(null);
      addNotification({
        title: 'Manifest Compiled',
        message: `${appId} integrated into local registry.`,
        type: 'success'
      });
    }, 900);
  };

  const handleAIInstall = () => {
    const candidate = featuredApps[0];
    if (!candidate) return;

    setAiManagedStoreEnabled(true);
    handleInstall(candidate.id);
    openWindow(candidate.id);
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-white font-sans overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="h-20 px-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-3xl shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Package size={24} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-[0.25em]">
              Registry Node
            </h1>
            <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase">
              Verified Manifest Distribution · AI Curated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAiManagedStoreEnabled(!aiManagedStoreEnabled)}
            className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              aiManagedStoreEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
            }`}
          >
            <WandSparkles size={14} className="inline mr-2" />
            AI Store {aiManagedStoreEnabled ? 'On' : 'Off'}
          </button>

          <div className="relative group w-80">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <Search
              className="absolute left-4 top-2.5 text-zinc-500 group-focus-within:text-blue-400 transition-colors"
              size={18}
            />
            <input
              className="w-full relative bg-black/60 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
              placeholder="Query package index..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => setSearch('')}
            className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-zinc-500 hover:text-white"
            title="Reset search"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-0">
        <div className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-xl p-6 flex flex-col gap-1.5 shrink-0">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 px-3">
            Categories
          </div>

          {(Object.keys(CATEGORY_MAP) as StoreCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                category === cat
                  ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {cat}
              {category === cat && (
                <Filter size={10} className="fill-current animate-pulse" />
              )}
            </button>
          ))}

          <div className="mt-4 p-5 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-[32px] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
            <ShieldCheck size={24} className="text-blue-400 mb-3" />
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-1">
              Sovereign Audit
            </div>
            <div className="text-[9px] text-zinc-500 font-mono leading-relaxed">
              AI can preselect a trusted package, but installation remains local and explicit.
            </div>
          </div>

          <div className="mt-auto p-5 bg-white/5 rounded-[32px] border border-white/5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-3">
              <Cpu size={12} />
              AI Suggestions
            </div>

            <div className="text-[9px] text-zinc-500 font-mono leading-relaxed mb-4">
              {featuredApps[0]?.name || 'No eligible package detected.'}
            </div>

            <button
              onClick={handleAIInstall}
              disabled={!featuredApps[0] || isInstalling === featuredApps[0]?.id}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500/20 transition-all"
            >
              <Sparkles size={14} />
              Suggest & Install
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-black/40">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                <Grid3X3 size={12} />
                {category === 'All' ? 'All manifests' : category}
              </div>

              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                {appCards.length} package{appCards.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {appCards.map((app) => {
                const isInstalled = installedApps.includes(app.id);
                const Icon = app.icon || Box;

                return (
                  <div
                    key={app.id}
                    className="group bg-[#0a0a0c]/80 backdrop-blur-2xl border border-white/10 rounded-[36px] p-6 flex flex-col transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:-translate-y-1 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />

                    <div className="flex items-start justify-between mb-6">
                      <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-xl group-hover:border-blue-500/40 transition-colors duration-500 relative overflow-hidden">
                        <Icon
                          size={32}
                          className="text-zinc-200 group-hover:text-blue-400 transition-all duration-500 z-10"
                        />
                        <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>

                      <div className="flex gap-1.5">
                        <div className="px-2 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-zinc-500 border border-white/5">
                          v1.0
                        </div>
                        {app.isCustom && (
                          <div className="px-2 py-1 bg-emerald-500/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
                            FORGED
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-black uppercase tracking-wider text-white mb-2 group-hover:text-blue-400 transition-colors">
                      {app.name}
                    </h3>

                    <p className="text-xs text-zinc-500 leading-relaxed font-medium mb-8 line-clamp-2 h-10">
                      {app.description || 'Standard system application node.'}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Star size={12} className="text-blue-500 fill-current" />
                        <span className="text-[10px] font-black font-mono text-zinc-400">
                          4.9
                        </span>
                      </div>

                      <button
                        onClick={() => !isInstalled && handleInstall(app.id)}
                        disabled={isInstalled || isInstalling === app.id}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 active:scale-95 ${
                          isInstalled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isInstalling === app.id
                              ? 'bg-zinc-800 text-zinc-500'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_5px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.5)]'
                        }`}
                      >
                        {isInstalling === app.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isInstalled ? (
                          <Check size={14} />
                        ) : (
                          <Download size={14} />
                        )}
                        {isInstalling === app.id ? 'VERIFYING' : isInstalled ? 'INSTALLED' : 'ACQUIRE'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {appCards.length === 0 && (
              <div className="text-center py-24">
                <div className="mx-auto w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                  <Search size={32} className="text-zinc-700" />
                </div>
                <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                  No matching package nodes
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-10 bg-[#0a0a0c] border-t border-white/5 px-8 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
            <Cpu size={10} /> Local Cache: {Math.max(1.4, appCards.length * 0.18).toFixed(1)} GB
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
            <Shield size={10} /> Security: KERNEL_LEVEL
          </div>
        </div>

        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/50">
          NEXUS REGISTRY // BROADCAST_STATION_01
        </div>
      </div>
    </div>
  );
}
