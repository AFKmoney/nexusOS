import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';
import { aiService } from '../services/puterService';
import { Paintbrush, Loader2, Check, Wand2, Sparkles, Dices, Zap, Star, Eye, Code, Trash2 } from 'lucide-react';
import { WALLPAPER_LIBRARY } from '../kernel/wallpaperLibrary';

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
    const files = vfs.listDir('/home/user/Wallpapers');
    const wallFiles = files.map(name => {
      const path = `/home/user/Wallpapers/${name}`;
      const stat = vfs.stat(path);
      return {
        id: name,
        name: name.replace('.html', '').replace('Synthesis_', 'Custom '),
        category: 'Custom',
        desc: `Generated on ${new Date(stat?.created || 0).toLocaleDateString()}`,
        preview: 'from-zinc-900 to-zinc-800',
        code: path
      };
    });
    setUserWallpapers(wallFiles);
  };

  const systemPresets = WALLPAPER_LIBRARY.map(wp => {
    const path = `/system/wallpapers/${wp.id}.html`;
    // If the file exists in system VFS, use the path as code
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
        "Give me a one-sentence artistic prompt for an animated HTML5/Canvas cyberpunk sci-fi wallpaper. Be creative, vivid, specific. One sentence only.",
        kernelRules
      );
      setPrompt(suggestion.replace(/"/g, ''));
    } catch (e) {
      addNotification({ title: 'AI Error', message: 'Failed to generate suggestion.', type: 'error' });
    }
    setIsSuggesting(false);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      addNotification({ title: 'Neural Core', message: 'Architecting visual logic...', type: 'info' });
      const systemPrompt = `You are a generative art engine. Create a FULLY ANIMATED HTML5/Canvas wallpaper.
REQUIREMENTS:
- Single HTML file starting with <!DOCTYPE html>
- Full-screen, no scrollbars (body: margin:0; overflow:hidden)
- Must use requestAnimationFrame animation loop
- Must be visually stunning with particle systems, waves, or geometric patterns
- Cyberpunk/Sci-Fi/Abstract aesthetics only
- Use only vanilla JS and Canvas API — no external libraries
- Must react to ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'night'} time of day for colors

USER VISION: "${prompt}"

RETURN: ONLY the single HTML file. No markdown. No code blocks. Start with <!DOCTYPE html>.`;

      const code = await aiService.generateOnce(systemPrompt, kernelRules);
      const cleanCode = code.replace(/```html(\s|\\n)*/gi, '').replace(/```(\s|\\n)*/g, '').trim();

      if (cleanCode.includes('<!DOCTYPE') || cleanCode.includes('<html')) {
        const timestamp = Date.now();
        const filePath = `/home/user/Wallpapers/Synthesis_${timestamp}.html`;
        vfs.writeFile(filePath, cleanCode);
        setWallpaper(filePath);
        loadUserWallpapers(); // Refresh list
        addNotification({ title: 'Neural Art', message: `Wallpaper synthesized and saved to ${filePath}`, type: 'success' });
      } else {
        throw new Error("Invalid generation format");
      }
    } catch (e) {
      addNotification({ title: 'Synthesis Error', message: 'Could not manifest vision.', type: 'error' });
    }
    setIsGenerating(false);
  };

  const deleteWallpaper = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (vfs.delete(path)) {
      loadUserWallpapers();
      addNotification({ title: 'System', message: 'Wallpaper deleted.', type: 'info' });
    }
  };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/5 shrink-0 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Paintbrush size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-[0.25em]">Wallpaper Engine</h1>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Sovereign Visual Manifestation</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Presets */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20">
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-emerald-400">
                <Zap size={16} className="animate-pulse" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Live Presets</h2>
              </div>
              {/* Category filter */}
              <div className="flex gap-1.5">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-zinc-500 hover:text-zinc-300 bg-white/5'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(preset => {
                const isActive = currentWallpaper === preset.code;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setWallpaper(preset.code)}
                    className={`group relative rounded-2xl overflow-hidden border transition-all duration-500 text-left ${isActive ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-[1.02]' : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'}`}
                  >
                    {/* Animated preview thumbnail */}
                    <div className={`h-32 bg-gradient-to-br ${preset.preview} relative overflow-hidden`}>
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <div className="text-4xl font-black opacity-10">{preset.name.charAt(0)}</div>
                      </div>
                      {/* Animated bars */}
                      <div className="absolute bottom-3 left-3 right-3 flex gap-1 items-end h-10">
                        {Array.from({length: 16}, (_,i) => (
                          <div key={i} className="flex-1 bg-white/20 rounded-full animate-pulse" style={{height:`${20+Math.sin(i)*60}%`, animationDelay:`${i*0.05}s`}} />
                        ))}
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]">LIVE</div>
                      {isActive && (
                        <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center">
                          <Check size={32} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        </div>
                      )}
                      
                      {/* Delete Action for User Wallpapers */}
                      {preset.category === 'Custom' && (
                        <button 
                          onClick={(e) => deleteWallpaper(e, preset.code)}
                          className="absolute top-3 left-3 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="p-4 bg-[#0a0a0c]">
                      <div className="text-xs font-black text-white mb-1 uppercase tracking-wider">{preset.name}</div>
                      <div className="text-[10px] text-zinc-500 line-clamp-1">{preset.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: AI Generator */}
        <div className="w-80 border-l border-white/5 bg-[#030305] flex flex-col shrink-0">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles size={18} />
                <h2 className="text-xs font-black uppercase tracking-[0.2em]">Neural Synthesis</h2>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Vision Prompt</label>
                <textarea
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none placeholder:text-zinc-700"
                  placeholder="e.g. A flowing river of binary code in a neon forest..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSuggest}
                  disabled={isSuggesting}
                  className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Dices size={14} />}
                  Suggest
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="flex-[2] h-12 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  Manifest
                </button>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                    <Star size={10} className="text-emerald-500" /> System Capabilities
                  </div>
                  <div className="text-[10px] text-zinc-600 leading-relaxed font-mono">
                    Generates real-time HTML5/Canvas kernels. Wallpapers are interactive, lightweight, and adapt to the system's temporal state.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
