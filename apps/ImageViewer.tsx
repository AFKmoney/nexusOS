import React, { useState, useRef } from 'react';
import { Image as ImgIcon, ZoomIn, ZoomOut, RotateCw, Maximize2, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

export default function ImageViewerApp() {
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files as FileList).forEach((f: File) => {
      if (!f.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, { name: f.name, url: reader.result as string }]);
        if (images.length === 0) setCurrentIdx(0);
      };
      reader.readAsDataURL(f as Blob);
    });
  };

  const img = images[currentIdx];
  const prevImg = () => { if (currentIdx > 0) { setCurrentIdx(currentIdx - 1); setZoom(1); setRotation(0); } };
  const nextImg = () => { if (currentIdx < images.length - 1) { setCurrentIdx(currentIdx + 1); setZoom(1); setRotation(0); } };
  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 5));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));
  const rotate = () => setRotation(r => (r + 90) % 360);
  const fit = () => { setZoom(1); setRotation(0); };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <ImgIcon size={16} className="text-violet-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Image Viewer</span>
          {img && <span className="text-xs text-zinc-500 ml-2">{img.name}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="p-1.5 hover:bg-white/10 rounded-lg transition"><ZoomOut size={14} className="text-zinc-400" /></button>
          <span className="text-xs text-zinc-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 hover:bg-white/10 rounded-lg transition"><ZoomIn size={14} className="text-zinc-400" /></button>
          <button onClick={rotate} className="p-1.5 hover:bg-white/10 rounded-lg transition"><RotateCw size={14} className="text-zinc-400" /></button>
          <button onClick={fit} className="p-1.5 hover:bg-white/10 rounded-lg transition"><Maximize2 size={14} className="text-zinc-400" /></button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden relative bg-black/40">
        {!img ? (
          <div className="flex flex-col items-center gap-4 text-zinc-600">
            <ImgIcon size={48} className="opacity-30" />
            <span className="text-sm">No image loaded</span>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 rounded-xl text-sm hover:bg-violet-500/30 transition">
              <Upload size={14} /> Open Image
            </button>
          </div>
        ) : (
          <>
            <img
              src={img.url}
              alt={img.name}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              draggable={false}
            />
            {images.length > 1 && (
              <>
                <button onClick={prevImg} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-30" disabled={currentIdx === 0}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={nextImg} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition disabled:opacity-30" disabled={currentIdx === images.length - 1}>
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto bg-black/20">
          {images.map((im, i) => (
            <button key={i} onClick={() => { setCurrentIdx(i); setZoom(1); setRotation(0); }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition ${i === currentIdx ? 'border-violet-500' : 'border-transparent hover:border-white/20'}`}>
              <img src={im.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple onChange={loadImage} className="hidden" />

      {images.length === 0 && (
        <div className="px-4 py-2 border-t border-white/5 text-center">
          <button onClick={() => fileRef.current?.click()} className="text-xs text-violet-400 hover:text-violet-300 transition">
            Click to open images from your device
          </button>
        </div>
      )}
    </div>
  );
}
