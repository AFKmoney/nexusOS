import React, { useState, useRef, useEffect } from 'react';
import { Film, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Upload } from 'lucide-react';

export default function VideoPlayerApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState('');
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [title, setTitle] = useState('');

  const loadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSrc(URL.createObjectURL(file));
    setTitle(file.name.replace(/\.\w+$/, ''));
  };

  useEffect(() => {
    if (!videoRef.current || !src) return;
    videoRef.current.src = src;
    videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
  }, [src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const pct = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.offsetWidth;
    videoRef.current.currentTime = pct * duration;
  };

  const skip = (sec: number) => { if (videoRef.current) videoRef.current.currentTime += sec; };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const fullscreen = () => {
    const el = videoRef.current?.parentElement;
    if (el?.requestFullscreen) el.requestFullscreen();
  };

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100">
      <video
        ref={videoRef}
        className="flex-1 bg-black object-contain"
        onTimeUpdate={() => { if (videoRef.current) { setProgress(videoRef.current.currentTime); setDuration(videoRef.current.duration || 0); } }}
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
      />
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-3 text-zinc-600 hover:text-zinc-400 transition">
            <Film size={48} className="opacity-30" />
            <span className="text-sm">Load Video</span>
            <span className="text-xs text-zinc-700">Supports MP4, WebM, OGG</span>
          </button>
        </div>
      )}
      {/* Controls */}
      <div className="px-4 py-2 border-t border-white/5 bg-black/80 backdrop-blur shrink-0">
        {title && <div className="text-xs text-zinc-500 mb-1 truncate">{title}</div>}
        <div className="flex items-center gap-2 mb-2 cursor-pointer group" onClick={seek}>
          <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{fmt(progress)}</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full">
            <div className="h-full bg-violet-500 rounded-full relative transition-all" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition" />
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono w-8">{fmt(duration)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => skip(-10)} className="p-1 text-zinc-500 hover:text-white transition"><SkipBack size={14} /></button>
            <button onClick={togglePlay} className="p-2 bg-violet-500 rounded-full hover:bg-violet-400 transition text-white">
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button onClick={() => skip(10)} className="p-1 text-zinc-500 hover:text-white transition"><SkipForward size={14} /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMuted(!muted)} className="text-zinc-500 hover:text-white transition">
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={e => { setVolume(+e.target.value); setMuted(false); }} className="w-16 accent-violet-500" />
            <button onClick={fullscreen} className="p-1 text-zinc-500 hover:text-white transition"><Maximize size={14} /></button>
            <button onClick={() => fileRef.current?.click()} className="p-1 text-zinc-500 hover:text-white transition"><Upload size={14} /></button>
          </div>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="video/*" onChange={loadFile} className="hidden" />
    </div>
  );
}
