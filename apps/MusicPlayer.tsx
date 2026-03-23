import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Upload, Repeat, Shuffle, List } from 'lucide-react';
import { uuid } from '../utils/uuid';

interface Track { id: string; name: string; url: string; duration?: number; }

export default function MusicPlayerApp() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);

  const currentTrack = currentIdx >= 0 ? tracks[currentIdx] : null;

  const loadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files as FileList).forEach((f: File) => {
      if (!f.type.startsWith('audio/')) return;
      const url = URL.createObjectURL(f as Blob);
      setTracks(prev => [...prev, { id: uuid(), name: f.name.replace(/\.\w+$/, ''), url }]);
    });
  };

  const playTrack = (idx: number) => {
    if (idx < 0 || idx >= tracks.length) return;
    setCurrentIdx(idx);
    setPlaying(true);
  };

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.url;
    audioRef.current.volume = muted ? 0 : volume;
    if (playing) audioRef.current.play().catch(() => {});
  }, [currentIdx, currentTrack?.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
    setDuration(audioRef.current.duration || 0);
  };

  const onEnded = () => {
    if (repeat) { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } return; }
    if (shuffle) { playTrack(Math.floor(Math.random() * tracks.length)); return; }
    if (currentIdx < tracks.length - 1) playTrack(currentIdx + 1);
    else setPlaying(false);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const fmt = (s: number) => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };

  // Visualizer
  useEffect(() => {
    if (!audioRef.current || !canvasRef.current) return;
    try {
      const actx = new AudioContext();
      const src = actx.createMediaElementSource(audioRef.current);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser).connect(actx.destination);
      analyserRef.current = analyser;
    } catch {}

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, w, h);
      const barW = w / data.length;
      data.forEach((v, i) => {
        const barH = (v / 255) * h * 0.8;
        const hue = (i / data.length) * 120 + 150;
        ctx.fillStyle = `hsla(${hue}, 80%, 55%, 0.8)`;
        ctx.fillRect(i * barW, h - barH, barW - 1, barH);
      });
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [currentTrack?.id]);

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} onEnded={onEnded} crossOrigin="anonymous" />

      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <Music size={16} className="text-emerald-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Music</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPlaylist(!showPlaylist)} className="p-1.5 hover:bg-white/10 rounded-lg"><List size={14} className={showPlaylist ? 'text-emerald-400' : 'text-zinc-500'} /></button>
          <button onClick={() => fileRef.current?.click()} className="p-1.5 hover:bg-white/10 rounded-lg"><Upload size={14} className="text-zinc-400" /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Player */}
        <div className="flex-1 flex flex-col">
          {/* Visualizer */}
          <div className="flex-1 relative">
            <canvas ref={canvasRef} className="w-full h-full" />
            {!currentTrack && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                <div className="text-center">
                  <Music size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Load audio files to start</p>
                </div>
              </div>
            )}
          </div>

          {/* Now Playing */}
          <div className="px-5 py-3 border-t border-white/5 bg-black/20">
            <div className="text-center mb-2">
              <div className="text-sm font-semibold text-white truncate">{currentTrack?.name || 'No track selected'}</div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-zinc-500 font-mono w-8 text-right">{fmt(progress)}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full cursor-pointer group" onClick={seek}>
                <div className="h-full bg-emerald-500 rounded-full relative transition-all" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono w-8">{fmt(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setShuffle(!shuffle)} className={`p-1.5 rounded-lg transition ${shuffle ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`}><Shuffle size={14} /></button>
              <button onClick={() => playTrack(Math.max(0, currentIdx - 1))} className="p-1.5 text-zinc-400 hover:text-white transition"><SkipBack size={18} /></button>
              <button onClick={() => setPlaying(!playing)} className="p-3 bg-emerald-500 rounded-full hover:bg-emerald-400 transition text-white">
                {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>
              <button onClick={() => playTrack(Math.min(tracks.length - 1, currentIdx + 1))} className="p-1.5 text-zinc-400 hover:text-white transition"><SkipForward size={18} /></button>
              <button onClick={() => setRepeat(!repeat)} className={`p-1.5 rounded-lg transition ${repeat ? 'text-emerald-400' : 'text-zinc-500 hover:text-white'}`}><Repeat size={14} /></button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 mt-2 justify-center">
              <button onClick={() => setMuted(!muted)} className="text-zinc-400 hover:text-white transition">
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                className="w-24 accent-emerald-500" />
            </div>
          </div>
        </div>

        {/* Playlist */}
        {showPlaylist && (
          <div className="w-52 border-l border-white/5 overflow-y-auto bg-black/20">
            <div className="p-3 text-xs text-zinc-500 uppercase tracking-wider border-b border-white/5">Playlist ({tracks.length})</div>
            {tracks.map((t, i) => (
              <button key={t.id} onClick={() => playTrack(i)}
                className={`w-full text-left px-3 py-2 text-xs truncate border-b border-white/5 transition ${i === currentIdx ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-white/5'}`}>
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="audio/*" multiple onChange={loadFiles} className="hidden" />
    </div>
  );
}
