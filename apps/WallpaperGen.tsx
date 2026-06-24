import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../store/osStore';
import { vfs, SYSTEM_VFS_APP_ID } from '../kernel/fileSystem';
import { aiService } from '../services/puterService';
import { Paintbrush, Loader2, Check, Wand2, Sparkles, Dices, Zap, Star, Trash2 } from 'lucide-react';
import { WALLPAPER_LIBRARY } from '../kernel/wallpaperLibrary';

// ─── Live wallpaper preview ──────────────────────────────────────────
// Renders the actual wallpaper HTML in a tiny sandboxed iframe so the
// user sees a real preview instead of fake animated bars. The iframe is
// scaled down to fit the thumbnail using CSS transform: scale().
function WallpaperPreview({ code, preview }: { code: string; preview: string }) {
  const [html, setHtml] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Resolve the wallpaper HTML from VFS path or inline code
    if (code.startsWith('/')) {
      const content = vfs.readFile(code, SYSTEM_VFS_APP_ID);
      if (content && (content.startsWith('<!DOCTYPE') || content.startsWith('<html'))) {
        setHtml(content);
        return;
      }
    }
    if (code.startsWith('<!DOCTYPE') || code.startsWith('<html')) {
      setHtml(code);
      return;
    }
    // Fallback: use the CSS gradient preview class
    setHtml('');
  }, [code]);

  if (html) {
    return (
      <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
        <iframe
          srcDoc={html}
          className="absolute top-0 left-0 origin-top-left pointer-events-none"
          style={{
            width: '800px',
            height: '450px',
            transform: 'scale(0.225)',
            // scale = thumbnail_width / iframe_width. For a ~180px thumbnail
            // in a 2-col grid, 800*0.225 = 180px.
          }}
          sandbox="allow-scripts"
          title="preview"
        />
      </div>
    );
  }

  // Fallback: CSS gradient + animated bars (for wallpapers that don't
  // have inline HTML, like the procedural nexus:// ones)
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${preview}`}>
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        <div className="text-5xl font-black opacity-10">{preview.charAt(0).toUpperCase()}</div>
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex gap-0.5 items-end h-8">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="flex-1 bg-white/15 rounded-full animate-pulse"
            style={{ height: `${20 + Math.sin(i) * 60}%`, animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function WallpaperApp() {
  const { setWallpaper, kernelRules, addNotification, wallpaper: currentWallpaper } = useOS();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [userWallpapers, setUserWallpapers] = useState<any[]>([]);

  const categories = ['All', 'Neural', 'Space', 'Cyberpunk', 'Hacker', 'Abstract', 'Interactive', 'Custom'];

  useEffect(() => {
    loadUserWallpapers();
  }, []);

  const loadUserWallpapers = () => {
    vfs.createDirRecursive('/home/user/Wallpapers', SYSTEM_VFS_APP_ID);
    const files = vfs.listDir('/home/user/Wallpapers', SYSTEM_VFS_APP_ID) || [];
    const wallFiles = files.map(name => {
      const path = `/home/user/Wallpapers/${name}`;
      const stat = vfs.stat(path);
      return {
        id: name,
        name: name.replace('.html', '').replace('Synthesis_', 'Custom '),
        category: 'Custom',
        desc: `Generated ${new Date(stat?.created || 0).toLocaleDateString()}`,
        preview: 'from-zinc-900 to-zinc-800',
        code: path
      };
    });
    setUserWallpapers(wallFiles);
  };

  const systemPresets = WALLPAPER_LIBRARY.map(wp => {
    const path = `/system/wallpapers/${wp.id}.html`;
    if (vfs.resolveNode(path)) {
      return { ...wp, code: path };
    }
    return wp;
  });

  const allPresets = [...systemPresets, ...userWallpapers];
  const filtered = activeCategory === 'All' ? allPresets : allPresets.filter(p => p.category === activeCategory);

  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      const suggestion = await aiService.generateOnce(
        'Give me a one-sentence artistic prompt for an animated HTML5/Canvas cyberpunk sci-fi wallpaper. Be creative, vivid, specific. One sentence only. No quotes.',
        kernelRules,
        'chat'
      );
      setPrompt(suggestion.replace(/"/g, '').trim());
    } catch {
      addNotification({ title: 'AI Error', message: 'Failed to generate suggestion.', type: 'error' });
    }
    setIsSuggesting(false);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      addNotification({ title: 'Neural Core', message: 'Architecting visual logic...', type: 'info' });
      const hour = new Date().getHours();
      const timeCtx = hour < 12 ? 'dawn — cool blues, pale golds' : hour < 18 ? 'midday — vibrant, saturated' : 'night — deep darks, neon glows';

      const code = await aiService.generateOnce(
        `USER VISION: "${prompt}"\nTIME OF DAY: ${timeCtx} — adapt color palette accordingly.`,
        kernelRules,
        'wallpaper'
      );
      const cleanCode = code.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

      if (cleanCode.includes('<!DOCTYPE') || cleanCode.includes('<html')) {
        const timestamp = Date.now();
        vfs.createDirRecursive('/home/user/Wallpapers', SYSTEM_VFS_APP_ID);
        const filePath = `/home/user/Wallpapers/Synthesis_${timestamp}.html`;
        vfs.writeFile(filePath, cleanCode, SYSTEM_VFS_APP_ID);
        setWallpaper(filePath);
        loadUserWallpapers();
        addNotification({ title: 'Neural Art', message: `Wallpaper saved and applied.`, type: 'success' });
      } else {
        throw new Error(code.slice(0, 200));
      }
    } catch (e: any) {
      const msg = e?.message || 'Could not manifest vision.';
      addNotification({ title: 'Synthesis Error', message: msg, type: 'error' });
    }
    setIsGenerating(false);
  };

  const deleteWallpaper = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (vfs.delete(path, SYSTEM_VFS_APP_ID)) {
      loadUserWallpapers();
      addNotification({ title: 'System', message: 'Wallpaper deleted.', type: 'info' });
    }
  };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col overflow-hidden font-sans">
      {/* Compact Header */}
      <div className="px-5 py-3 border-b border-white/5 shrink-0 bg-gradient-to-b from-white/5 to-transparent flex items-center gap-3">
        <div className="p-2 bg-emerald-500/15 rounded-xl text-emerald-400 border border-emerald-500/20">
          <Paintbrush size={18} />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">Wallpaper Engine</h1>
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">AI Wallpaper Generator · {allPresets.length} presets</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Wallpaper Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
          {/* Category bar */}
          <div className="sticky top-0 z-10 bg-[#050508]/95 backdrop-blur-sm px-5 py-3 border-b border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-400 shrink-0">
              <Zap size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">{filtered.length} Wallpapers</span>
            </div>
            <div className="flex gap-1 overflow-x-auto custom-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === cat
                    ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'text-zinc-500 hover:text-zinc-300 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(preset => {
                const isActive = currentWallpaper === preset.code;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setWallpaper(preset.code)}
                    className={`group relative rounded-xl overflow-hidden border transition-all duration-300 text-left ${isActive
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* Live preview thumbnail — 16:9 aspect ratio */}
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
                      <WallpaperPreview code={preset.code} preview={preset.preview} />

                      {/* LIVE badge */}
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-[0.15em] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] z-10">LIVE</div>

                      {/* Active overlay */}
                      {isActive && (
                        <div className="absolute inset-0 bg-emerald-500/15 backdrop-blur-[1px] flex items-center justify-center z-10">
                          <div className="p-2 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]">
                            <Check size={18} className="text-black" strokeWidth={3} />
                          </div>
                        </div>
                      )}

                      {/* Hover overlay */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white/10 backdrop-blur-md rounded-full">
                            <Check size={16} className="text-white" />
                          </div>
                        </div>
                      )}

                      {/* Delete button for user wallpapers */}
                      {preset.category === 'Custom' && (
                        <button
                          onClick={(e) => deleteWallpaper(e, preset.code)}
                          className="absolute top-2 left-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Label */}
                    <div className="p-2.5 bg-[#0a0a0c]">
                      <div className="text-[11px] font-bold text-white truncate">{preset.name}</div>
                      <div className="text-[9px] text-zinc-500 truncate mt-0.5">{preset.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <Paintbrush size={40} className="opacity-20 mb-3" />
                <p className="text-xs uppercase tracking-widest">No wallpapers in this category</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Generator Panel */}
        <div className="w-72 border-l border-white/5 bg-[#030305] flex flex-col shrink-0">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles size={16} />
              <h2 className="text-xs font-black uppercase tracking-[0.2em]">Neural Synthesis</h2>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vision Prompt</label>
              <textarea
                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none placeholder:text-zinc-600"
                placeholder="e.g. A flowing river of binary code in a neon forest..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSuggest}
                disabled={isSuggesting}
                className="flex-1 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isSuggesting ? <Loader2 size={13} className="animate-spin" /> : <Dices size={13} />}
                Suggest
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="flex-[2] h-10 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none"
              >
                {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                Manifest
              </button>
            </div>

            {isGenerating && (
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-mono">
                <Loader2 size={12} className="animate-spin" />
                <span>Architecting visual logic...</span>
              </div>
            )}

            <div className="pt-4 border-t border-white/5">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                  <Star size={10} /> System Capabilities
                </div>
                <div className="text-[10px] text-zinc-500 leading-relaxed">
                  Generates real-time HTML5/Canvas wallpapers. Interactive, lightweight, and adaptive to the system's temporal state. All wallpapers are saved to the VFS and persist across reboots.
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="pt-2 space-y-1.5 text-[10px] font-mono">
              <div className="flex justify-between text-zinc-600">
                <span>System presets:</span>
                <span className="text-zinc-400">{WALLPAPER_LIBRARY.length}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Custom wallpapers:</span>
                <span className="text-zinc-400">{userWallpapers.length}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Current:</span>
                <span className="text-emerald-400 truncate max-w-[140px] ml-2">
                  {currentWallpaper ? currentWallpaper.split('/').pop() : 'none'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
