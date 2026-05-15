import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, Trash2, ChevronLeft, ChevronRight, Share2, Info, FolderOpen, Maximize2 } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { vfs } from '../../kernel/fileSystem';
import type { MobileAppProps } from '../types';

export default function MobileImageViewerApp({ onBack }: MobileAppProps) {
  const [images, setImages] = useState<{name: string, path: string}[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const list = vfs.listDir('/home/user/Desktop');
    const filtered = (list || [])
      .filter((f: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(f))
      .map((f: string) => ({ name: f, path: `/home/user/Desktop/${f}` }));
    setImages(filtered);
  }, []);

  const activeImage = images[activeIdx];

  const nextImg = () => { setActiveIdx((activeIdx + 1) % images.length); setZoom(1); setRotation(0); };
  const prevImg = () => { setActiveIdx((activeIdx - 1 + images.length) % images.length); setZoom(1); setRotation(0); };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <button className="p-2 -ml-2 rounded-xl active:bg-white/10 transition-colors" onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-bold uppercase tracking-wider truncate">
            {activeImage?.name || 'Artifact Browser'}
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Visual Manifest Index</p>
        </div>
        <div className="flex gap-1">
          <button className="p-2 text-zinc-400 active:text-white"><Share2 size={20}/></button>
          <button className="p-2 text-zinc-400 active:text-red-400"><Trash2 size={20}/></button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative flex items-center justify-center bg-black/60 overflow-hidden">
        {activeImage ? (
          <>
            <div 
              className="w-full h-full flex items-center justify-center transition-all duration-300 touch-none"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            >
              <img 
                src={activeImage.path}
                alt={activeImage.name}
                className="max-w-full max-h-full object-contain shadow-2xl"
                onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop'; }}
              />
            </div>

            {/* Navigation Overlays */}
            {images.length > 1 && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
                <button onClick={prevImg} className="p-3 rounded-full bg-black/40 border border-white/10 text-white pointer-events-auto active:scale-90 transition-transform">
                  <ChevronLeft size={28} />
                </button>
                <button onClick={nextImg} className="p-3 rounded-full bg-black/40 border border-white/10 text-white pointer-events-auto active:scale-90 transition-transform">
                  <ChevronRight size={28} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 opacity-30 text-center px-8">
            <FolderOpen size={64} className="text-zinc-600" />
            <p className="text-sm font-black uppercase tracking-widest">No visual artifacts found on desktop</p>
          </div>
        )}
      </div>

      {/* Mobile Controls & Thumbnails */}
      <div className="shrink-0 bg-black/80 backdrop-blur-2xl border-t border-white/10">
        {/* Action Bar */}
        <div className="flex items-center justify-around py-2 px-4 border-b border-white/5">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-3 text-zinc-400 active:text-white active:bg-white/5 rounded-full"><ZoomOut size={22}/></button>
          <span className="text-[12px] font-mono text-zinc-500 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-3 text-zinc-400 active:text-white active:bg-white/5 rounded-full"><ZoomIn size={22}/></button>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-3 text-zinc-400 active:text-white active:bg-white/5 rounded-full"><RotateCw size={22}/></button>
          <button className="p-3 text-zinc-400 active:text-white active:bg-white/5 rounded-full"><Info size={22}/></button>
        </div>

        {/* Thumbnails */}
        {images.length > 0 && (
          <div className="h-20 flex items-center gap-3 px-4 overflow-x-auto scrollbar-hide py-2">
            {images.map((img, i) => (
              <button 
                key={i}
                onClick={() => { setActiveIdx(i); setZoom(1); setRotation(0); }}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === activeIdx ? 'border-blue-500 scale-105' : 'border-transparent opacity-50'}`}
              >
                <img 
                  src={img.path} 
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=100&auto=format&fit=crop'; }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
