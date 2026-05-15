import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Pause, Volume2, VolumeX, Maximize, Settings, MonitorPlay } from 'lucide-react';
import type { MobileAppProps } from '../types';

export default function MobileVideoPlayerApp({ onBack }: MobileAppProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const autoHide = () => {
      if (isPlaying) {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      }
    };
    autoHide();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPlaying, showControls]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
      setShowControls(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = time;
      setProgress(parseFloat(e.target.value));
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  return (
    <div className="h-full bg-black text-white flex flex-col font-sans overflow-hidden relative group" onClick={toggleControls}>
      
      {/* Top Header Overlay */}
      <div className={`absolute top-0 left-0 right-0 p-4 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={(e) => { e.stopPropagation(); onBack(); }}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <div className="flex items-center gap-2">
            <MonitorPlay size={16} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest truncate w-40">Neural_Stream_01.mp4</span>
          </div>
        </div>
        <button className="p-2 active:bg-white/10 rounded-xl" onClick={(e) => e.stopPropagation()}>
          <Settings size={18} />
        </button>
      </div>

      {/* Video Content */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="w-full max-h-full"
          playsInline
        >
          {/* Mobile video player often needs a source or user interaction to load */}
        </video>

        {/* Big Play/Pause Center Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
            className="w-20 h-20 rounded-full bg-emerald-500/80 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)] active:scale-90 transition-transform"
          >
            {isPlaying ? <Pause size={32} className="text-black" fill="currentColor" /> : <Play size={32} className="text-black ml-1" fill="currentColor" />}
          </button>
        </div>
      </div>

      {/* Bottom Controls Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 p-6 z-50 flex flex-col gap-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Progress Slider */}
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <input 
            type="range" min="0" max="100" step="0.1" value={progress} 
            onChange={handleSeek}
            className="w-full accent-emerald-500 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer" 
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-1 uppercase tracking-tighter">
            <span>{videoRef.current ? Math.floor(videoRef.current.currentTime / 60) + ':' + ('0' + Math.floor(videoRef.current.currentTime % 60)).slice(-2) : '0:00'}</span>
            <span>{videoRef.current && videoRef.current.duration ? Math.floor(videoRef.current.duration / 60) + ':' + ('0' + Math.floor(videoRef.current.duration % 60)).slice(-2) : '0:00'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="active:scale-90 transition-transform">
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted || volume === 0 ? <VolumeX size={20} className="text-zinc-400" /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range" min="0" max="100" value={volume} 
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-20 accent-white h-1 bg-white/10 rounded-full appearance-none" 
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-widest hidden sm:block">
              1080p // Secure Stream
            </div>
            <button className="p-1 active:bg-white/10 rounded-lg" onClick={(e) => e.stopPropagation()}>
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Background Dimmer when controls shown */}
      <div className={`absolute inset-0 bg-black/40 pointer-events-none transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
