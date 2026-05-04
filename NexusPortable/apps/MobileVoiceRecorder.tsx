import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Mic, MicOff, Square, Trash2, Play, Pause } from 'lucide-react';
import type { MobileAppProps } from '../types';

interface Recording { id: string; name: string; duration: number; date: string; }

export default function MobileVoiceRecorder({ onBack }: MobileAppProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([
    { id: '1', name: 'Voice memo 1', duration: 42, date: 'Today' },
    { id: '2', name: 'Meeting notes', duration: 183, date: 'Yesterday' },
  ]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(20).fill(4));
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  useEffect(() => {
    if (!recording) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setElapsed(e => e + 1);
      setLevels(Array.from({ length: 20 }, () => Math.round(4 + Math.random() * 28)));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [recording]);

  const toggleRecord = () => {
    if (recording) {
      setRecording(false);
      if (elapsed > 0) {
        setRecordings(rs => [
          { id: Date.now().toString(), name: `Voice memo ${rs.length + 1}`, duration: elapsed, date: 'Just now' },
          ...rs,
        ]);
      }
      setElapsed(0);
    } else {
      setRecording(true);
      setElapsed(0);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">Voice Recorder</h1>
      </div>

      {/* Recording UI */}
      <div className="flex flex-col items-center justify-center py-10 px-6 flex-shrink-0">
        {/* Waveform */}
        <div className="flex items-end gap-1 h-16 mb-6">
          {levels.map((h, i) => (
            <div key={i} className="w-2 rounded-full transition-all duration-300"
              style={{
                height: recording ? h : 8,
                background: recording ? '#ef4444' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        <p className="text-white text-4xl font-light mb-8">{fmtTime(elapsed)}</p>

        {/* Record button */}
        <button
          className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: recording ? '#ef4444' : 'rgba(255,255,255,0.1)',
            border: `3px solid ${recording ? '#ef444480' : 'rgba(255,255,255,0.15)'}`,
            boxShadow: recording ? '0 0 24px rgba(239,68,68,0.4)' : 'none',
          }}
          onClick={toggleRecord}
        >
          {recording ? <Square size={28} className="text-white" fill="white" /> : <Mic size={28} className="text-white" />}
        </button>

        <p className="text-white/40 text-[13px] mt-4">
          {recording ? 'Tap to stop' : 'Tap to record'}
        </p>
      </div>

      {/* Recordings list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="section-header pl-0">Recordings ({recordings.length})</p>
        <div className="space-y-2">
          {recordings.map(rec => (
            <div key={rec.id} className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90"
                style={{ background: playing === rec.id ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)' }}
                onClick={() => setPlaying(p => p === rec.id ? null : rec.id)}
              >
                {playing === rec.id
                  ? <Pause size={16} className="text-red-400" />
                  : <Play size={16} className="text-white ml-0.5" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[14px] font-medium truncate">{rec.name}</p>
                <p className="text-white/40 text-[12px]">{fmtTime(rec.duration)} · {rec.date}</p>
              </div>
              <button className="p-1.5 active:opacity-60"
                onClick={() => setRecordings(rs => rs.filter(r => r.id !== rec.id))}>
                <Trash2 size={15} className="text-white/30" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
