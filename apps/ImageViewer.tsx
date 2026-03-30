import React, { useState, useEffect } from 'react';
import { Image, ZoomIn, ZoomOut, Maximize, RotateCw, Trash2, ChevronLeft, ChevronRight, Share2, Info, FolderOpen } from 'lucide-react';
import { useOS } from '../store/osStore';
import { vfs } from '../kernel/fileSystem';

export default function ImageViewer() {
  const [images, setImages] = useState<{name: string, path: string}[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const list = vfs.listDir('/home/user/Desktop');
    const filtered = (list || [])
      .filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f))
      .map(f => ({ name: f, path: `/home/user/Desktop/${f}` }));
    setImages(filtered);
  }, []);

  const activeImage = images[activeIdx];

  const nextImg = () => { setActiveIdx((activeIdx + 1) % images.length); setZoom(1); setRotation(0); };
  const prevImg = () => { setActiveIdx((activeIdx - 1 + images.length) % images.length); setZoom(1); setRotation(0); };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header / Controls */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <Image size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] truncate max-w-[200px]">{activeImage?.name || 'Artifact Browser'}</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Visual Manifest Index</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><ZoomOut size={16}/></button>
          <span className="text-[10px] font-mono text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><ZoomIn size={16}/></button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><RotateCw size={16}/></button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><Share2 size={16}/></button>
          <button className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative flex items-center justify-center bg-black/60 p-10 group">
        {activeImage ? (
          <>
            <div 
              className="w-full h-full flex items-center justify-center transition-all duration-300"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            >
              <img 
                src={activeImage.path} // In a real VFS, this would be a Blob URL
                alt={activeImage.name}
                className="max-w-full max-h-full rounded shadow-2xl transition-opacity duration-500"
                onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop'; }}
              />
            </div>

            {/* Navigation Overlays */}
            {images.length > 1 && (
              <>
                <button onClick={prevImg} className="absolute left-6 p-4 rounded-full bg-black/40 border border-white/5 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all shadow-2xl active:scale-90">
                  <ChevronLeft size={32} />
                </button>
                <button onClick={nextImg} className="absolute right-6 p-4 rounded-full bg-black/40 border border-white/5 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all shadow-2xl active:scale-90">
                  <ChevronRight size={32} />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 opacity-20">
            <FolderOpen size={64} className="text-zinc-600" />
            <p className="text-sm font-black uppercase tracking-widest">No visual artifacts found on desktop</p>
          </div>
        )}
      </div>

      {/* Thumbnails Strip */}
      {images.length > 0 && (
        <div className="h-24 border-t border-white/5 bg-black/40 flex items-center gap-3 px-6 overflow-x-auto custom-scrollbar shrink-0">
          {images.map((img, i) => (
            <button 
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${i === activeIdx ? 'border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-transparent opacity-40 hover:opacity-100'}`}
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
  );
}
