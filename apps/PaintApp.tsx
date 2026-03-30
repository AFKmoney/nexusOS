import React, { useState, useRef, useEffect } from 'react';
import { Paintbrush, Circle, Square, Eraser, Download, Undo, Redo, Type, MousePointer2 } from 'lucide-react';
import { useOS } from '../store/osStore';

export default function PaintApp() {
  const { addNotification } = useOS();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [tool, setTool] = useState<'brush'|'eraser'|'rect'|'circle'>('brush');
  const [color, setColor] = useState('#10b981');
  const [brushSize, setBrushSize] = useState(4);
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{x:number, y:number} | null>(null);
  const [startPos, setStartPos] = useState<{x:number, y:number} | null>(null);
  
  // History for undo/redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const presetColors = ['#ffffff', '#000000', '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

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
    
    // Set exact physical pixels
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a0c'; // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveState();
    }
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const pos = getPos(e);
    setLastPos(pos);
    setStartPos(pos);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
      // Shape preview requires restoring the last saved state, then drawing the shape
      if (historyIdx >= 0) {
        ctx.putImageData(history[historyIdx], 0, 0);
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
    if (ctx) {
      ctx.putImageData(history[historyIdx - 1], 0, 0);
      setHistoryIdx(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIdx >= history.length - 1) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.putImageData(history[historyIdx + 1], 0, 0);
      setHistoryIdx(prev => prev + 1);
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `nexus_art_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    addNotification({ title: 'Export Complete', message: 'Canvas saved to native filesystem.', type: 'success' });
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100 font-sans select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-14 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center px-4 justify-between shrink-0 shadow-lg z-10">
        
        {/* Tools */}
        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/5">
          {[
            { id: 'brush', icon: Paintbrush },
            { id: 'eraser', icon: Eraser },
            { id: 'rect', icon: Square },
            { id: 'circle', icon: Circle }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as any)}
              className={`p-2 rounded-lg transition-all ${tool === t.id ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
              title={t.id}
            >
              <t.icon size={16} />
            </button>
          ))}
        </div>

        {/* Colors & Size */}
        <div className="flex items-center gap-4 bg-black/50 px-4 py-1.5 rounded-xl border border-white/5">
          <div className="flex gap-1.5">
            {presetColors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white shadow-[0_0_8px_currentColor]' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <input 
            type="range" 
            min="1" max="50" 
            value={brushSize} 
            onChange={e => setBrushSize(parseInt(e.target.value))}
            className="w-24 accent-emerald-500 cursor-pointer"
            title="Brush Size"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={handleUndo} disabled={historyIdx <= 0} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all"><Undo size={16} /></button>
          <button onClick={handleRedo} disabled={historyIdx >= history.length - 1} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all"><Redo size={16} /></button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={downloadCanvas} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold uppercase tracking-wider transition-all"><Download size={14} /> Export</button>
        </div>

      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative bg-[#0a0a0c] cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          className="absolute top-0 left-0 w-full h-full shadow-inner"
        />
      </div>
    </div>
  );
}

