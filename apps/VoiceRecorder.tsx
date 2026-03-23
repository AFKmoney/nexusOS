import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Download, Trash2, Clock } from 'lucide-react';

interface Recording { id: string; name: string; url: string; duration: number; created: number; }

export default function VoiceRecorderApp() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState<string|null>(null);
  const mediaRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const audioRef = useRef<HTMLAudioElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings(prev => [...prev, {
          id: uuid(),
          name: `Recording ${prev.length + 1}`,
          url, duration: elapsed, created: Date.now()
        }]);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const playRecording = (rec: Recording) => {
    if (!audioRef.current) return;
    if (playing === rec.id) { audioRef.current.pause(); setPlaying(null); return; }
    audioRef.current.src = rec.url;
    audioRef.current.play();
    setPlaying(rec.id);
  };

  const deleteRec = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (playing === id) { audioRef.current?.pause(); setPlaying(null); }
  };

  const download = (rec: Recording) => {
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = `${rec.name}.webm`;
    a.click();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />

      {/* Recording Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all ${isRecording ? 'bg-red-500/20 animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'bg-zinc-900 border border-white/5'}`}>
          <Mic size={40} className={isRecording ? 'text-red-400' : 'text-zinc-600'} />
        </div>
        <div className="text-3xl font-mono text-white mb-6">{fmt(elapsed)}</div>
        <button onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition ${isRecording ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}>
          {isRecording ? <><Square size={16} /> Stop</> : <><Mic size={16} /> Record</>}
        </button>
      </div>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="border-t border-white/5 max-h-[40%] overflow-y-auto">
          <div className="px-4 py-2 text-xs text-zinc-500 uppercase tracking-wider border-b border-white/5">Recordings ({recordings.length})</div>
          {recordings.map(rec => (
            <div key={rec.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 hover:bg-white/5 transition group">
              <button onClick={() => playRecording(rec)} className={`p-1.5 rounded-lg transition ${playing === rec.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}>
                {playing === rec.id ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{rec.name}</div>
                <div className="text-[10px] text-zinc-600 flex items-center gap-1"><Clock size={8} /> {fmt(rec.duration)} • {new Date(rec.created).toLocaleTimeString()}</div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => download(rec)} className="p-1 text-zinc-500 hover:text-white transition"><Download size={12} /></button>
                <button onClick={() => deleteRec(rec.id)} className="p-1 text-zinc-500 hover:text-red-400 transition"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
