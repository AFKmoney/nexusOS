import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Paintbrush, Circle, Square, Eraser, Download, Undo, Redo } from 'lucide-react';
import { useOS } from '../../store/osStore';
import type { MobileAppProps } from '../types';

type Tool = 'brush' | 'eraser' | 'rect' | 'circle';

export default function MobilePaintApp({ onBack }: MobileAppProps) {
  const { addNotification } = useOS();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#10b981');
  const [brushSize, setBrushSize] = useState(6);
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{x:number, y:number} | null>(null);
  const [startPos, setStartPos] = useState<{x:number, y:number} | null>(null);
  
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const presetColors = ['#ffffff', '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#000000'];

  const saveState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    // Set canvas size to match container
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0]?.clientX || 0;
      clientY = e.touches[0]?.clientY || 0;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent scrolling when drawing
    if ('touches' in e) {
      // e.preventDefault(); // Might cause issues in React, better to use touch-action: none
    }
    setDrawing(true);
    const pos = getPos(e);
    setLastPos(pos);
    setStartPos(pos);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || !lastPos || !startPos) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pos = getPos(e);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.strokeStyle = tool === 'eraser' ? '#0a0a0c' : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setLastPos(pos);
    } else {
      if (historyIdx >= 0) {
        const savedState = history[historyIdx];
        if (savedState) ctx.putImageData(savedState, 0, 0);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      if (tool === 'rect') {
        ctx.rect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  };

  const stopDraw = () => {
    if (drawing) {
      setDrawing(false);
      saveState();
    }
  };

  const handleUndo = () => {
    if (historyIdx <= 0) return;
    const ctx = canvasRef.current?.getContext('2d');
    const previousState = history[historyIdx - 1];
    if (ctx && previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistoryIdx(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIdx >= history.length - 1) return;
    const ctx = canvasRef.current?.getContext('2d');
    const nextState = history[historyIdx + 1];
    if (ctx && nextState) {
      ctx.putImageData(nextState, 0, 0);
      setHistoryIdx(prev => prev + 1);
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `nexus_mobile_art_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    addNotification({ title: 'Canvas Exported', message: 'Saved to device storage.', type: 'success' });
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100 overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <h1 className="font-bold text-sm tracking-widest uppercase text-white">Neural Canvas</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} disabled={historyIdx <= 0} className="p-2 text-zinc-400 active:text-white disabled:opacity-20 transition-all"><Undo size={18} /></button>
          <button onClick={handleRedo} disabled={historyIdx >= history.length - 1} className="p-2 text-zinc-400 active:text-white disabled:opacity-20 transition-all"><Redo size={18} /></button>
          <button onClick={downloadCanvas} className="ml-2 p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 active:bg-emerald-500 active:text-black transition-all">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative bg-[#0a0a0c] touch-none overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Bottom Toolbar */}
      <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/5 flex flex-col gap-4 shrink-0 pb-8">
        {/* Tool Selector */}
        <div className="flex items-center justify-around bg-white/5 p-1 rounded-2xl border border-white/5">
          {[
            { id: 'brush', icon: Paintbrush },
            { id: 'eraser', icon: Eraser },
            { id: 'rect', icon: Square },
            { id: 'circle', icon: Circle }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as Tool)}
              className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all ${tool === t.id ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-zinc-500 active:bg-white/5'}`}
            >
              <t.icon size={20} />
            </button>
          ))}
        </div>

        {/* Color Palette & Brush Size */}
        <div className="flex items-center gap-4">
          <div className="flex-1 flex justify-between gap-1 overflow-x-auto no-scrollbar py-1">
            {presetColors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full shrink-0 border-2 transition-transform ${color === c ? 'scale-110 border-white shadow-[0_0_10px_currentColor]' : 'border-transparent active:scale-90'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
             <input 
              type="range" min="1" max="50" value={brushSize} 
              onChange={e => setBrushSize(parseInt(e.target.value))}
              className="w-20 accent-emerald-500" 
            />
            <span className="text-[10px] font-mono text-emerald-500 w-4">{brushSize}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
