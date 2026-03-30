import React, { useState, useEffect } from 'react';
import { Camera, Download, Trash2, Image as ImageIcon, Frame, Scissors, Check, X, Loader2, Zap } from 'lucide-react';
import { useOS } from '../store/osStore';

export default function ScreenshotTool() {
  const { addNotification } = useOS();
  const [screenshots, setScreenshots] = useState<{id: string, data: string, date: number}[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const takeCapture = () => {
    setIsCapturing(true);
    addNotification({ title: 'Neural Capture', message: 'Scanning system visual buffer...', type: 'info' });
    
    // Simulate capture delay
    setTimeout(() => {
      // In a real Electron app, we'd use desktopCapturer. 
      // Here we mock the result with a cool abstract system state image.
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
      }
      
      const data = canvas.toDataURL();
      setScreenshots(prev => [{id: Date.now().toString(), data, date: Date.now()}, ...prev]);
      setIsCapturing(false);
      addNotification({ title: 'Frame Sequenced', message: 'Visual manifest stored in local repository.', type: 'success' });
    }, 1000);
  };

  const deleteShot = (id: string) => setScreenshots(prev => prev.filter(s => s.id !== id));

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
            <Camera size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Visual Capture</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">System Frame Buffer Index</p>
          </div>
        </div>
        <button 
          onClick={takeCapture}
          disabled={isCapturing}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50"
        >
          {isCapturing ? <Loader2 size={14} className="animate-spin" /> : <Frame size={14} />}
          {isCapturing ? 'CAPTURING' : 'NEW CAPTURE'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/20">
        {screenshots.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {screenshots.map(s => (
              <div key={s.id} className="group relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                  <img src={s.data} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Actions Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                    <a href={s.data} download={`nexus_shot_${s.id}.png`} className="p-3 bg-emerald-500 text-black rounded-full shadow-xl hover:scale-110 transition-transform"><Download size={20}/></a>
                    <button onClick={() => deleteShot(s.id)} className="p-3 bg-red-500 text-white rounded-full shadow-xl hover:scale-110 transition-transform"><Trash2 size={20}/></button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-200">SHOT_{s.id.slice(-6)}</div>
                    <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{new Date(s.date).toLocaleString()}</div>
                  </div>
                  <Zap size={14} className="text-emerald-500 opacity-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <ImageIcon size={80} className="text-zinc-600 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">Visual Buffer Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
