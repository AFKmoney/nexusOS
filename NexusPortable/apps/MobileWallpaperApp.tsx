import React, { useState, useEffect } from 'react';
import { ChevronLeft, Paintbrush, Loader2, Check, Wand2, Sparkles, Dices, Zap, Star, Trash2 } from 'lucide-react';
import { useOS } from '../../store/osStore';
import { vfs } from '../../kernel/fileSystem';
import { aiService } from '../../services/puterService';
import { WALLPAPER_LIBRARY } from '../../kernel/wallpaperLibrary';
import type { MobileAppProps } from '../types';

export default function MobileWallpaperApp({ onBack }: MobileAppProps) {
  const { setWallpaper, kernelRules, addNotification, wallpaper: currentWallpaper } = useOS();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [userWallpapers, setUserWallpapers] = useState<any[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);

  const categories = ['All', 'Neural', 'Space', 'Cyberpunk', 'Hacker', 'Abstract', 'Interactive', 'Custom'];

  useEffect(() => {
    loadUserWallpapers();
  }, []);

  const loadUserWallpapers = () => {
    try {
      if (!vfs.resolveNode('/home/user/Wallpapers')) {
        vfs.createDir('/home/user/Wallpapers');
      }
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
    } catch (e) {
      console.error("Failed to load user wallpapers", e);
    }
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
        vfs.createDir('/home/user/Wallpapers');
        const filePath = `/home/user/Wallpapers/Synthesis_${timestamp}.html`;
        vfs.writeFile(filePath, cleanCode);
        setWallpaper(filePath);
        loadUserWallpapers();
        setShowGenerator(false);
        addNotification({ title: 'Neural Art', message: `Wallpaper synthesized and saved`, type: 'success' });
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
    <div className="h-full flex flex-col bg-[#050508] text-white overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#080808]/80 backdrop-blur-md border-b border-white/5 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors" onClick={onBack}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-[14px] font-black uppercase tracking-[0.2em] leading-tight">Wallpaper</h1>
            <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">Neural Engine</p>
          </div>
        </div>
        <button 
          onClick={() => setShowGenerator(!showGenerator)}
          className={`p-2 rounded-xl border transition-all ${showGenerator ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 border-white/10 text-emerald-400'}`}
        >
          <Sparkles size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* Category horizontal scroll */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-black/40 border-b border-white/5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-zinc-500 border border-white/5'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Grid */}
        <div className="h-full overflow-y-auto pb-24 px-4 pt-4 custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(preset => {
              const isActive = currentWallpaper === preset.code;
              return (
                <button
                  key={preset.id}
                  onClick={() => setWallpaper(preset.code)}
                  className={`group relative aspect-[9/16] rounded-2xl overflow-hidden border transition-all duration-300 text-left ${isActive ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-white/5 active:scale-[0.98]'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${preset.preview}`} />
                  
                  {/* Visual indicators */}
                  <div className="absolute bottom-4 left-4 right-4 flex gap-0.5 items-end h-8 opacity-40">
                    {Array.from({length: 8}, (_,i) => (
                      <div key={i} className="flex-1 bg-white/40 rounded-full animate-pulse" style={{height:`${30+Math.sin(i)*70}%`, animationDelay:`${i*0.1}s`}} />
                    ))}
                  </div>

                  {isActive && (
                    <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <Check size={24} className="text-emerald-500" />
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="text-[10px] font-black text-white uppercase tracking-wider truncate">{preset.name}</div>
                    <div className="text-[8px] text-zinc-400 uppercase tracking-widest">{preset.category}</div>
                  </div>

                  {preset.category === 'Custom' && (
                    <button 
                      onClick={(e) => deleteWallpaper(e, preset.code)}
                      className="absolute top-2 left-2 p-1.5 bg-red-500/80 text-white rounded-lg active:bg-red-600 transition-colors z-20"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generator Drawer/Overlay */}
        {showGenerator && (
          <div className="absolute inset-0 bg-[#050508]/95 backdrop-blur-xl z-40 p-6 flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <Wand2 size={20} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em]">Neural Synthesis</h2>
              </div>
              <button onClick={() => setShowGenerator(false)} className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Close</button>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Vision Prompt</label>
                <textarea
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none placeholder:text-zinc-600 font-mono"
                  placeholder="e.g. A digital rain of starlight in a futuristic garden..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSuggest}
                  disabled={isSuggesting}
                  className="w-full h-14 bg-white/5 active:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {isSuggesting ? <Loader2 size={18} className="animate-spin" /> : <Dices size={18} />}
                  Random Suggestion
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="w-full h-14 bg-emerald-500 active:bg-emerald-400 text-black rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  Manifest Vision
                </button>
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                  <Star size={10} className="text-emerald-500" /> Evolution Protocol
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                  Synthesizing real-time HTML5 kernels. Each creation is unique, interactive, and optimized for mobile performance.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
