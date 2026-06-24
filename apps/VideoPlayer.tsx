import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Settings, FileVideo, ShieldAlert, MonitorPlay } from 'lucide-react';
import { useOS } from '../store/osStore';

export default function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync volume and mute state to native video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = (parseInt(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = time;
      setProgress(parseInt(e.target.value));
    }
  };

  return (
    <div className="h-full bg-black text-white flex flex-col font-sans overflow-hidden group">
      
      {/* Video Content */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-950 overflow-hidden">
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="max-w-full max-h-full"
        >
          {/* No hardcoded source — user opens files via File Explorer */}
        </video>

        {/* Big Play Overlay (visible when paused) */}
        {!isPlaying && (
          <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-opacity">
            <div className="w-20 h-20 rounded-full bg-emerald-500/80 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:scale-110 transition-transform">
              <Play size={40} className="text-black ml-1" fill="currentColor" />
            </div>
          </button>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-20 bg-gradient-to-t from-black to-black/40 px-6 flex flex-col justify-center gap-2 shrink-0 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        
        {/* Progress Slider */}
        <input 
          type="range" min="0" max="100" value={progress} 
          onChange={handleSeek}
          className="w-full accent-emerald-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer" 
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-lg transition-all">
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-lg transition-all text-zinc-400 hover:text-white">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input 
                type="range" min="0" max="100" value={volume} 
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-20 accent-zinc-400 h-1 bg-white/5 rounded-full appearance-none" 
              />
            </div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Live Neural Stream // Buffer: OK
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => { if (videoRef.current) { const speeds = [1, 1.25, 1.5, 2, 0.5]; const cur = videoRef.current.playbackRate; const idx = speeds.indexOf(cur); const next = speeds[(idx + 1) % speeds.length] ?? 1; videoRef.current.playbackRate = next; } }} className="p-2 text-zinc-500 hover:text-white transition-all" title="Playback Speed"><Settings size={18} /></button>
            <button onClick={() => { if (videoRef.current?.parentElement) { if (document.fullscreenElement) document.exitFullscreen(); else videoRef.current.parentElement.requestFullscreen(); } }} className="p-2 text-zinc-500 hover:text-white transition-all" title="Fullscreen"><Maximize size={18} /></button>
          </div>
        </div>
      </div>

      {/* Floating Info Overlay */}
      <div className="absolute top-6 left-6 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
          <MonitorPlay size={16} className="text-emerald-400" />
        </div>
        <div className="text-xs font-black uppercase tracking-widest text-white drop-shadow-md">
          sample_video_01.mp4
        </div>
      </div>
    </div>
  );
}
