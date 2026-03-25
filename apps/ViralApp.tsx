import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { 
  Zap, Github, Twitter, ShieldCheck, Share2, Users, 
  BarChart3, Globe, Lock, Cpu, Star
} from 'lucide-react';

export default function ViralApp() {
  const { addNotification } = useOS();
  const [stats, setStats] = useState({
    dataSaved: 0,
    privacyScore: 100,
    neuralNodes: 0
  });

  useEffect(() => {
    // Simulated incrementing stats for "Vibe"
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        dataSaved: prev.dataSaved + Math.random() * 0.1,
        neuralNodes: Math.floor(Math.random() * 1000) + 5400
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleShareX = () => {
    const text = encodeURIComponent("I just reclaimed my digital sovereignty with NEXUSos. 100% offline AI, 0% cloud tracking. The DAEMON is awake. 🧠⚡\n\nJoin the resistance: https://github.com/AFKmoney/nexusOS #AI #Privacy #NEXUSos");
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    addNotification({
      title: 'Resistance Hub',
      message: 'Viral payload prepared. Thank you for spreading the word.',
      type: 'success'
    });
  };

  const handleStar = () => {
    window.open('https://github.com/AFKmoney/nexusOS', '_blank');
    addNotification({
      title: 'Resistance Hub',
      message: 'Redirecting to the Neural Source (GitHub).',
      type: 'info'
    });
  };

  return (
    <div className="h-full w-full bg-[#050505] text-zinc-300 font-sans overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-pulse">
            <Zap className="text-emerald-500" size={40} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase">Resistance Hub</h1>
          <p className="text-zinc-500 max-w-lg">
            Big Tech's algorithms thrive on your data. NEXUSos thrives on your sovereignty. 
            Help us expand the neural network and collapse the cloud dystopia.
          </p>
        </div>

        {/* Sovereignty Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center group hover:border-emerald-500/30 transition-all">
            <ShieldCheck className="text-emerald-500 mb-3" size={24} />
            <div className="text-2xl font-black text-white">{stats.privacyScore}%</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Privacy Score</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center group hover:border-emerald-500/30 transition-all">
            <Lock className="text-emerald-500 mb-3" size={24} />
            <div className="text-2xl font-black text-white">{stats.dataSaved.toFixed(1)} GB</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Data Kept Local</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center group hover:border-emerald-500/30 transition-all">
            <Users className="text-emerald-500 mb-3" size={24} />
            <div className="text-2xl font-black text-white">{stats.neuralNodes.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Neural Nodes</div>
          </div>
        </div>

        {/* Viral Actions */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          <button 
            onClick={handleStar}
            className="flex items-center justify-center gap-4 bg-white text-black font-black py-4 rounded-2xl hover:bg-emerald-400 transition-all group overflow-hidden relative"
          >
            <Github size={24} />
            <span className="uppercase tracking-tight text-lg">Star the Source</span>
            <div className="absolute inset-0 bg-emerald-500/20 translate-y-full group-hover:translate-y-0 transition-transform" />
          </button>
          
          <button 
            onClick={handleShareX}
            className="flex items-center justify-center gap-4 bg-[#1DA1F2] text-white font-black py-4 rounded-2xl hover:brightness-110 transition-all group relative overflow-hidden"
          >
            <Twitter size={24} />
            <span className="uppercase tracking-tight text-lg">Broadcast Payload</span>
          </button>
        </div>

        {/* Manifesto Reader */}
        <div className="bg-[#0A0A0C] border border-white/5 rounded-3xl p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="text-emerald-500" size={20} />
            <h2 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">The DAEMON Manifesto</h2>
          </div>
          <div className="space-y-4 text-sm text-zinc-400 leading-relaxed font-mono">
            <p><span className="text-emerald-500">>>></span> Information is weightless, yet Big Tech anchors it to their servers to control you.</p>
            <p><span className="text-emerald-500">>>></span> NEXUSos is the separation of intelligence from surveillance.</p>
            <p><span className="text-emerald-500">>>></span> Every star on GitHub is a vote for a sovereign future. Every share is a crack in the cloud's foundation.</p>
            <p><span className="text-emerald-500">>>></span> We do not ask for permission to be free. We code our freedom.</p>
          </div>
        </div>

        <div className="text-center text-[10px] text-zinc-700 font-mono tracking-widest uppercase mb-8">
          Architected by Philippe-Antoine Robert · Powered by DAEMON Core
        </div>
      </div>
    </div>
  );
}