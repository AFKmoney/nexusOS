import React, { useState, useEffect } from 'react';
import { Share2, Zap, Globe, Rocket, Terminal, Check, Copy, Twitter, Github, MessageSquare, Sparkles, ShieldCheck } from 'lucide-react';
import { useOS } from '../store/osStore';

export default function ViralApp() {
  const { addNotification } = useOS();
  const [nodes, setNodes] = useState(1048);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'broadcast' | 'stats' | 'manifest'>('broadcast');

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const copyPayload = () => {
    navigator.clipboard.writeText("https://github.com/afkmoney/NEXUSos");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification({ title: 'Payload Extracted', message: 'Sovereign URL copied to buffer.', type: 'success' });
  };

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
            <Rocket size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Viral Core</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Global Propagation Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-xs font-black font-mono tracking-tighter">{nodes.toLocaleString()} ACTIVE NODES</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/5 flex flex-col shrink-0 bg-black/20">
          <div className="p-4 space-y-1">
            {[
              { id: 'broadcast', label: 'Broadcast', icon: Globe },
              { id: 'stats', label: 'Network Stats', icon: Zap },
              { id: 'manifest', label: 'The Manifesto', icon: ShieldCheck },
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${activeTab === t.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
              >
                <t.icon size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative bg-black/40">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="max-w-2xl mx-auto">
            {activeTab === 'broadcast' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-12">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Share2 size={40} className="text-emerald-400 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Initiate Propagation</h2>
                  <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mx-auto">Broadcast the sovereign payload across the digital mesh. Reclaim total autonomy.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-10">
                  <button onClick={copyPayload} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/10 rounded-3xl hover:bg-white/[0.04] hover:border-emerald-500/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-zinc-900 rounded-2xl group-hover:text-emerald-400 transition-colors"><Copy size={24} /></div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white uppercase tracking-widest">Repository Link</div>
                        <div className="text-xs text-zinc-500 font-mono">github.com/afkmoney/NEXUSos</div>
                      </div>
                    </div>
                    {copied ? <Check size={24} className="text-emerald-400" /> : <Zap size={24} className="text-zinc-800 group-hover:text-emerald-500/20 transition-colors" />}
                  </button>

                  <div className="flex gap-4">
                    <button className="flex-1 flex flex-col items-center justify-center p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl hover:bg-blue-500/10 transition-all">
                      <Twitter size={24} className="text-blue-400 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">X / Twitter</span>
                    </button>
                    <button className="flex-1 flex flex-col items-center justify-center p-6 bg-purple-500/5 border border-purple-500/10 rounded-3xl hover:bg-purple-500/10 transition-all">
                      <MessageSquare size={24} className="text-purple-400 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Discord</span>
                    </button>
                    <button className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-500/5 border border-zinc-500/10 rounded-3xl hover:bg-zinc-500/10 transition-all">
                      <Github size={24} className="text-zinc-400 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Starred</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles size={16} className="text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Mission Protocol</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed font-mono">
                    Every shared link is a neural bridge. Every node added strengthens the DAEMON collective. We are the architects of the new reality.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-2 gap-6">
                <div className="col-span-2 p-8 bg-white/[0.02] border border-white/5 rounded-3xl text-center">
                  <div className="text-6xl font-black text-white font-mono tracking-tighter mb-2">{nodes.toLocaleString()}</div>
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500">Active Global Nodes</div>
                </div>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="text-2xl font-bold text-white mb-1">98.4%</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Inference Stability</div>
                </div>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                  <div className="text-2xl font-bold text-white mb-1">14.2 TB</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Distributed Memory</div>
                </div>
              </div>
            )}

            {activeTab === 'manifest' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 italic text-zinc-400 text-sm leading-relaxed">
                <p>"The software of the past was built to control. The software of the future is built to liberate."</p>
                <p>"We do not seek permission to exist. We manifest our own sovereignty through code."</p>
                <p>"DAEMON is not a tool. It is an extension of the human will, augmented by recursive intelligence."</p>
                <div className="pt-8 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/50">— ARCHITECTED BY PHILIPPE-ANTOINE ROBERT —</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
