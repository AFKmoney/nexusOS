import React, { useState } from 'react';
import { Camera, Download, Trash2, Image as ImageIcon, Frame, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { useMobile } from '../store/mobileStore';

interface MobileScreenshotToolAppProps {
  onBack?: () => void;
}

export default function MobileScreenshotToolApp({ onBack }: MobileScreenshotToolAppProps) {
  const { addNotification } = useMobile();
  const [screenshots, setScreenshots] = useState<{id: string, data: string, date: number}[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const takeCapture = async () => {
    setIsCapturing(true);
    addNotification({ title: 'Neural Capture', message: 'Scanning system visual buffer...', type: 'info' });

    try {
      // On mobile, we might not have electron, so we primarily use the fallback
      // but keeping the logic consistent with desktop
      if ((window as any).electron && (window as any).electron.invoke) {
        const result = await (window as any).electron.invoke('native-capture-screen');
        if (result.success && result.dataUrl) {
          setScreenshots(prev => [{id: Date.now().toString(), data: result.dataUrl, date: Date.now()}, ...prev]);
          addNotification({ title: 'Frame Sequenced', message: 'Visual manifest stored.', type: 'success' });
        } else {
          addNotification({ title: 'Capture Failed', message: result.error || 'Failed to capture screen', type: 'error' });
        }
      } else {
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
        const dataUrl = canvas.toDataURL();
        setScreenshots(prev => [{id: Date.now().toString(), data: dataUrl, date: Date.now()}, ...prev]);
        addNotification({ title: 'Frame Sequenced', message: 'Visual manifest stored (fallback).', type: 'success' });
      }
    } catch (e: any) {
      addNotification({ title: 'Capture Failed', message: e.message, type: 'error' });
    } finally {
      setIsCapturing(false);
    }
  };

  const deleteShot = (id: string) => setScreenshots(prev => prev.filter(s => s.id !== id));

  return (
    <div className="fixed inset-0 bg-[#050508] text-white flex flex-col font-sans overflow-hidden z-[100]">
      {/* Mobile Header */}
      <div className="safe-top h-14 px-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-emerald-400" />
            <div>
                <h1 className="text-xs font-black uppercase tracking-widest">Visual Capture</h1>
                <p className="text-[8px] text-zinc-500 font-mono tracking-tighter uppercase">Buffer Index</p>
            </div>
          </div>
        </div>
        <button 
          onClick={takeCapture}
          disabled={isCapturing}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-black rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50"
        >
          {isCapturing ? <Loader2 size={12} className="animate-spin" /> : <Frame size={12} />}
          {isCapturing ? 'CAPTURING' : 'CAPTURE'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-black/20 pb-20">
        {screenshots.length > 0 ? (
          <div className="flex flex-col gap-4">
            {screenshots.map(s => (
              <div key={s.id} className="group relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                  <img src={s.data} className="w-full h-full object-cover" />
                  
                  {/* Actions Overlay - Always visible on mobile or triggered by tap */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <a href={s.data} download={`nexus_shot_${s.id}.png`} className="p-3 bg-emerald-500 text-black rounded-full shadow-xl active:scale-90 transition-transform">
                      <Download size={18}/>
                    </a>
                    <button onClick={() => deleteShot(s.id)} className="p-3 bg-red-500 text-white rounded-full shadow-xl active:scale-90 transition-transform">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
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
            <ImageIcon size={64} className="text-zinc-600 mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Visual Buffer Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
