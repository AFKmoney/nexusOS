import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Paintbrush, Circle, Square, Minus, Eraser, Download, Palette, Undo, Redo, Type, Droplets } from 'lucide-react';

export default function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'brush'|'line'|'rect'|'circle'|'eraser'|'text'|'fill'>('brush');
  const [color, setColor] = useState('#10b981');
  const [brushSize, setBrushSize] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{x:number,y:number}|null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const presetColors = ['#10b981','#ef4444','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#ffffff','#000000','#6b7280','#06b6d4'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveSnapshot();
  }, []);

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(0, historyIdx + 1), snap]);
    setHistoryIdx(prev => prev + 1);
  };

  const undo = () => {
    if (historyIdx <= 0) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(history[historyIdx - 1], 0, 0);
    setHistoryIdx(prev => prev - 1);
  };

  const redo = () => {
    if (historyIdx >= history.length - 1) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(history[historyIdx + 1], 0, 0);
    setHistoryIdx(prev => prev + 1);
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const pos = getPos(e);
    setLastPos(pos);
    if (tool === 'fill') {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) { ctx.fillStyle = color; ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height); }
      saveSnapshot();
    }
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !lastPos) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    if (tool === 'brush' || tool === 'eraser') {
      ctx.strokeStyle = tool === 'eraser' ? '#111111' : color;
      ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    setLastPos(pos);
  };

  const onUp = () => {
    if (drawing) { setDrawing(false); setLastPos(null); saveSnapshot(); }
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'nexus-paint.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const tools = [
    { id: 'brush', icon: Paintbrush, label: 'Brush' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'fill', icon: Droplets, label: 'Fill' },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0c] text-zinc-100">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-3 bg-black/30 shrink-0 flex-wrap">
        {tools.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} className={`p-1.5 rounded-lg transition ${tool === t.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`} title={t.label}>
            <t.icon size={16} />
          </button>
        ))}
        <div className="h-5 w-px bg-white/10" />
        <div className="flex items-center gap-1">
          {presetColors.map(c => (
            <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border-2 transition ${color === c ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" />
        </div>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <span>Size</span>
          <input type="range" min="1" max="20" value={brushSize} onChange={e => setBrushSize(+e.target.value)} className="w-16 accent-emerald-500" />
          <span className="w-4 text-center">{brushSize}</span>
        </div>
        <div className="h-5 w-px bg-white/10" />
        <button onClick={undo} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition" title="Undo"><Undo size={14} /></button>
        <button onClick={redo} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition" title="Redo"><Redo size={14} /></button>
        <button onClick={download} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition" title="Download"><Download size={14} /></button>
      </div>
      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} />
      </div>
    </div>
  );
}
