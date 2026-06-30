import React, { useState, useEffect, useCallback } from 'react';
import { useOS } from '../store/osStore';
import { pluginMarket, type MarketplacePlugin } from '../kernel/pluginMarket';
import { appGenerator } from '../kernel/appGenerator';
import { Sparkles, Download, Trash2, Loader2, Package } from 'lucide-react';

/**
 * Plugin Marketplace — AI-generated apps on demand.
 *
 * The user types a description of the plugin they need; the AI generator
 * builds it and installs it into the VFS. Already-generated apps are
 * listed and can be opened or deleted. Falls back to the static catalog
 * (currently empty) when no AI-generated apps exist yet.
 */
export default function PluginMarket({ windowId: _windowId }: { windowId: string }) {
  void _windowId; // not used yet — reserved for future per-window state
  const { addNotification, openWindow } = useOS();
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [query, setQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const available = await pluginMarket.getAvailablePlugins();
      setPlugins(available);
    } catch (e: any) {
      addNotification({ title: 'Marketplace Error', message: e?.message ?? 'Unknown error', type: 'error' });
    }
    setLoading(false);
  }, [addNotification]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setGenerating(true);
    addNotification({ title: 'Generating Plugin', message: `AI is building: ${query}`, type: 'info' });
    try {
      const result = await pluginMarket.generatePlugin(query);
      if (result.success && result.appId) {
        addNotification({ title: 'Plugin Generated', message: `Installed: ${query}`, type: 'success' });
        setQuery('');
        await refresh();
        // Open the freshly generated app after a short delay so the
        // registry has time to register it.
        const appId = result.appId;
        setTimeout(() => openWindow(appId), 500);
      } else {
        addNotification({ title: 'Generation Failed', message: result.error ?? 'Unknown error', type: 'error' });
      }
    } catch (e: any) {
      addNotification({ title: 'Generation Failed', message: e?.message ?? 'Unknown error', type: 'error' });
    }
    setGenerating(false);
  };

  const handleDelete = (appId: string) => {
    if (!confirm('Delete this plugin permanently?')) return;
    appGenerator.delete(appId);
    addNotification({ title: 'Plugin Deleted', message: appId, type: 'info' });
    refresh();
  };

  const filtered = plugins.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-slate-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <Package size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Plugin Marketplace</h1>
            <p className="text-xs text-zinc-500">AI-generated apps · {plugins.length} installed</p>
          </div>
        </div>

        {/* Generate bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-xl border border-white/5">
            <Sparkles size={16} className="text-emerald-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
              placeholder="Describe a plugin and the AI will build it..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
              disabled={generating}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-bold transition-all disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Plugin list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Package size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-bold">No plugins yet</p>
            <p className="text-xs mt-1">Describe what you need above and the AI will build it</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(plugin => (
              <div
                key={plugin.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl">{plugin.icon ?? (plugin.isGenerated ? '🤖' : '📦')}</div>
                  {plugin.isGenerated && (
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-bold uppercase">AI</span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{plugin.name}</h3>
                <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{plugin.description}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openWindow(plugin.id)}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all"
                  >
                    Open
                  </button>
                  {plugin.isGenerated && (
                    <button
                      onClick={() => handleDelete(plugin.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
