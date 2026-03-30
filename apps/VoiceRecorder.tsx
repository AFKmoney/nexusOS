import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Trash2, Download, Volume2, Activity, Disc, Loader2 } from 'lucide-react';
import { useOS } from '../store/osStore';
import { uuid } from '../utils/uuid';

interface Recording { id: string; name: string; duration: number; date: number; blob: Blob; url: string; }

export default function VoiceRecorder() {
  const { addNotification } = useOS();
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const url = URL.createObjectURL(blob);
        const newRec: Recording = {
          id: uuid(),
          name: `Neural_Log_${new Date().toLocaleTimeString()}.ogg`,
          duration,
          date: Date.now(),
          blob,
          url
        };
        setRecordings(prev => [newRec, ...prev]);
        addNotification({ title: 'Capture Saved', message: 'Audio manifest stored in local buffer.', type: 'success' });
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      addNotification({ title: 'Uplink Failed', message: 'Microphone access denied.', type: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
            <Mic size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Neural Voice Logger</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Audio Manifest Capture</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black/20 relative overflow-hidden">
        {/* Recording Visualizer (Mock) */}
        {isRecording && (
          <div className="flex items-end gap-1 h-32 mb-12">
            {Array.from({length: 24}).map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-red-500 rounded-full animate-pulse" 
                style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }} 
              />
            ))}
          </div>
        )}

        {!isRecording && !recordings.length && (
          <div className="mb-12 opacity-20 flex flex-col items-center gap-4">
            <Disc size={80} className="text-zinc-600" />
            <div className="text-xs font-black uppercase tracking-widest">Awaiting Capture</div>
          </div>
        )}

        <div className="flex flex-col items-center gap-6">
          <div className="text-4xl font-black font-mono tracking-tighter mb-2">
            {formatTime(duration)}
          </div>
          
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative group ${isRecording ? 'bg-zinc-800 border-4 border-red-500/50' : 'bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(239,68,68,0.3)]'}`}
          >
            {isRecording ? (
              <div className="w-8 h-8 bg-red-500 rounded-sm animate-pulse" />
            ) : (
              <Mic size={40} className="text-white" />
            )}
            <div className={`absolute inset-0 rounded-full bg-red-500/20 animate-ping pointer-events-none ${isRecording ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            {isRecording ? 'Recording Neural Wave...' : 'Initiate New Capture'}
          </div>
        </div>
      </div>

      {/* Recordings List */}
      <div className="h-64 border-t border-white/5 bg-black/40 overflow-y-auto custom-scrollbar p-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {recordings.map(r => (
            <div key={r.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-white transition-colors">
                  <Play size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200">{r.name}</div>
                  <div className="text-[9px] text-zinc-600 font-mono uppercase">{formatTime(r.duration)} · {new Date(r.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={r.url} download={r.name} className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"><Download size={16}/></a>
                <button onClick={() => deleteRecording(r.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
