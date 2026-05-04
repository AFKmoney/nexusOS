import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart, Volume2, List } from 'lucide-react';
import type { MobileAppProps } from '../types';

const TRACKS = [
  { id: '1', title: 'Neural Drift', artist: 'DAEMON Sounds', album: 'NexusOS OST', duration: 243, color: '#10b981' },
  { id: '2', title: 'Quantum Pulse', artist: 'System Voices', album: 'Digital Dreams', duration: 187, color: '#6366f1' },
  { id: '3', title: 'Emerald Code', artist: 'DAEMON Sounds', album: 'NexusOS OST', duration: 312, color: '#f59e0b' },
  { id: '4', title: 'Dark Circuit', artist: 'Neural Noise', album: 'Electric Soul', duration: 224, color: '#ec4899' },
  { id: '5', title: 'Binary Sunset', artist: 'System Voices', album: 'Digital Dreams', duration: 198, color: '#06b6d4' },
];

function fmtTime(s: number) {
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

export default function MobileMusic({ onBack }: MobileAppProps) {
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [showQueue, setShowQueue] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(75);

  const track = TRACKS[trackIdx];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPos(p => {
        if (p >= track.duration) { next(); return 0; }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing, trackIdx]);

  const next = () => {
    const idx = shuffle
      ? Math.floor(Math.random() * TRACKS.length)
      : (trackIdx + 1) % TRACKS.length;
    setTrackIdx(idx);
    setPos(0);
  };

  const prev = () => {
    if (pos > 3) { setPos(0); return; }
    setTrackIdx((trackIdx - 1 + TRACKS.length) % TRACKS.length);
    setPos(0);
  };

  const progress = track.duration > 0 ? (pos / track.duration) * 100 : 0;

  if (showQueue) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={() => setShowQueue(false)}>
            <ChevronLeft size={22} className="text-white" />
          </button>
          <h1 className="text-white font-semibold text-[16px]">Queue</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {TRACKS.map((t, i) => (
            <button
              key={t.id}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
              style={{
                background: i === trackIdx ? `${t.color}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === trackIdx ? t.color + '30' : 'rgba(255,255,255,0.05)'}`,
              }}
              onClick={() => { setTrackIdx(i); setPos(0); setShowQueue(false); }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: t.color + '25' }}>
                {i === trackIdx && playing
                  ? <div className="flex gap-0.5 items-end h-4">
                      {[4,6,3,5,4].map((h,j) => <div key={j} className="w-1 rounded-t animate-pulse" style={{ height: h*2, background: t.color, animationDelay: `${j*0.1}s` }} />)}
                    </div>
                  : <span className="text-white/60 text-[13px] font-medium">{i+1}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[14px] font-medium truncate">{t.title}</p>
                <p className="text-white/40 text-[12px]">{t.artist}</p>
              </div>
              <span className="text-white/30 text-[12px]">{fmtTime(t.duration)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${track.color}15 0%, var(--nx-surface) 65%)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="text-center">
          <p className="text-white/70 text-[12px] font-semibold uppercase tracking-wider">Now Playing</p>
        </div>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={() => setShowQueue(true)}>
          <List size={20} className="text-white/60" />
        </button>
      </div>

      {/* Album Art */}
      <div className="flex-1 flex flex-col items-center justify-center px-10">
        <div
          className="w-56 h-56 rounded-3xl flex items-center justify-center mb-8"
          style={{
            background: `radial-gradient(135deg, ${track.color}40, ${track.color}10)`,
            border: `1px solid ${track.color}40`,
            boxShadow: `0 16px 48px ${track.color}30`,
          }}
        >
          <div className="flex gap-1 items-end h-16">
            {[20,28,16,32,24,20,30].map((h, i) => (
              <div
                key={i}
                className={`w-2 rounded-t transition-all`}
                style={{
                  height: playing ? h : 8,
                  background: track.color,
                  opacity: playing ? 0.9 : 0.3,
                  transition: `height ${0.3 + i * 0.05}s ease`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Track Info */}
        <div className="w-full flex items-center justify-between px-2 mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-white text-xl font-bold truncate">{track.title}</h2>
            <p className="text-white/50 text-[14px] mt-0.5">{track.artist}</p>
          </div>
          <button
            className="p-2 ml-4 transition-all active:scale-90"
            onClick={() => setLiked(s => { const n = new Set(s); n.has(track.id) ? n.delete(track.id) : n.add(track.id); return n; })}
          >
            <Heart
              size={22}
              className={liked.has(track.id) ? 'text-red-400' : 'text-white/30'}
              fill={liked.has(track.id) ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        {/* Progress */}
        <div className="w-full px-2 mb-5">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const p = (e.clientX - rect.left) / rect.width;
              setPos(Math.round(p * track.duration));
            }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: track.color }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/40 text-[11px]">{fmtTime(pos)}</span>
            <span className="text-white/40 text-[11px]">{fmtTime(track.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full px-2 mb-6">
          <button className="p-2 active:scale-90 transition-all" onClick={() => setShuffle(s => !s)}>
            <Shuffle size={20} style={{ color: shuffle ? track.color : 'rgba(255,255,255,0.4)' }} />
          </button>
          <button className="p-2 active:scale-90 transition-all" onClick={prev}>
            <SkipBack size={28} className="text-white" fill="white" />
          </button>
          <button
            className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{ background: track.color, boxShadow: `0 0 24px ${track.color}50` }}
            onClick={() => setPlaying(p => !p)}
          >
            {playing
              ? <Pause size={26} className="text-black" fill="black" />
              : <Play size={26} className="text-black ml-1" fill="black" />
            }
          </button>
          <button className="p-2 active:scale-90 transition-all" onClick={next}>
            <SkipForward size={28} className="text-white" fill="white" />
          </button>
          <button className="p-2 active:scale-90 transition-all" onClick={() => setRepeat(r => !r)}>
            <Repeat size={20} style={{ color: repeat ? track.color : 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full px-2">
          <Volume2 size={16} className="text-white/30 flex-shrink-0" />
          <input
            type="range" min={0} max={100} value={volume}
            onChange={e => setVolume(+e.target.value)}
            className="flex-1 h-1"
            style={{ accentColor: track.color }}
          />
          <Volume2 size={20} className="text-white/60 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
