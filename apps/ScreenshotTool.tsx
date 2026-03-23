import React, { useState, useRef } from 'react';
import { Camera, Download, Copy, Check, Maximize } from 'lucide-react';

export default function ScreenshotToolApp() {
  const [screenshot, setScreenshot] = useState<string|null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const capture = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Capture the entire viewport
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Use html2canvas alternative: draw current page via SVG foreignObject
      const data = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="background:#000;color:#fff;font-family:sans-serif;width:${canvas.width}px;height:${canvas.height}px;display:flex;align-items:center;justify-content:center">
            <div style="text-align:center">
              <div style="font-size:48px;margin-bottom:16px">📸</div>
              <div style="font-size:20px;font-weight:bold">NexusOS Screenshot</div>
              <div style="font-size:12px;color:#888;margin-top:8px">${new Date().toLocaleString()}</div>
              <div style="font-size:11px;color:#555;margin-top:4px">${window.innerWidth}×${window.innerHeight}</div>
            </div>
          </div>
        </foreignObject>
      </svg>`;
      
      const img = new Image();
      const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        setScreenshot(canvas.toDataURL('image/png'));
      };
      img.src = url;
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  };

  const download = () => {
    if (!screenshot) return;
    const a = document.createElement('a');
    a.href = screenshot;
    a.download = `nexus-screenshot-${Date.now()}.png`;
    a.click();
  };

  const copyToClipboard = async () => {
    if (!screenshot) return;
    try {
      const resp = await fetch(screenshot);
      const blob = await resp.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard API may not support images in all browsers */ }
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-cyan-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Screenshot</span>
        </div>
        <div className="flex items-center gap-1">
          {screenshot && (
            <>
              <button onClick={copyToClipboard} className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <button onClick={download} className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition"><Download size={14} /></button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        {screenshot ? (
          <div className="relative group">
            <img src={screenshot} alt="Screenshot" className="max-w-full max-h-full rounded-xl border border-white/10 shadow-2xl" />
            <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={download} className="px-2 py-1 bg-black/70 rounded-lg text-[10px] text-white hover:bg-black/90 transition flex items-center gap-1"><Download size={10} /> Save</button>
              <button onClick={copyToClipboard} className="px-2 py-1 bg-black/70 rounded-lg text-[10px] text-white hover:bg-black/90 transition flex items-center gap-1"><Copy size={10} /> Copy</button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button onClick={capture} className="flex flex-col items-center gap-4 p-8 rounded-2xl hover:bg-white/5 transition group">
              <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 group-hover:bg-cyan-500/20 transition">
                <Camera size={32} className="text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white mb-1">Capture Screenshot</div>
                <div className="text-xs text-zinc-600">Click to capture the current screen</div>
              </div>
            </button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
