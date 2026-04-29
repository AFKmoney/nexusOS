import React, { useEffect, useState } from "react";
import { useOS } from "../store/osStore";
import { ArrowRight, Zap, Brain, Shield, Code, Cpu, Globe, Terminal, ChevronRight } from "lucide-react";

const FEATURES = [
  { icon: Brain, title: "DAEMON AI Core", desc: "Autonomous recursive intelligence with persistent memory and self-evolution" },
  { icon: Cpu, title: "Multi-Provider AI", desc: "Connect OpenAI, Anthropic, Google, Groq, or run offline with GGUF models — your choice" },
  { icon: Code, title: "HyperIDE + Neural Forge", desc: "AI-assisted code editor and app builder — describe what you want, it builds it" },
  { icon: Shield, title: "Cipher Vault", desc: "Military-grade AES-GCM encryption for sensitive data, built into the filesystem" },
  { icon: Terminal, title: "50+ Native Apps", desc: "Full OS ecosystem: terminal, file explorer, browser, kanban, music, and more" },
  { icon: Globe, title: "Cloud Multiplexer", desc: "Route AI requests to Clod, OpenAI, Anthropic, DeepSeek, or any OpenAI-compatible endpoint" },
];

export default function WelcomeApp({ id }: { id: string }) {
  const { setHasSeenIntro, closeWindow, openWindow } = useOS();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setHasSeenIntro(true);
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [setHasSeenIntro]);

  return (
    <div className="h-full flex items-center justify-center bg-[#030306] text-zinc-100 p-6 overflow-hidden">
      <div className={`max-w-2xl w-full transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            <Zap size={12} className="animate-pulse" /> System Online
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white mb-2">
            NexusOS
          </h1>
          <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
            AI-native operating system. Built for developers, designed for the future.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-emerald-500/20 transition-all duration-300 cursor-default"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <f.icon size={18} className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white mb-1">{f.title}</div>
              <div className="text-[10px] text-zinc-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              openWindow('daemon_chat');
              closeWindow(id);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
          >
            <Brain size={14} /> Talk to DAEMON
          </button>
          <button
            onClick={() => {
              openWindow('settings');
              closeWindow(id);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Configure AI <ChevronRight size={14} />
          </button>
          <button
            onClick={() => closeWindow(id)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-100 text-black text-xs font-black uppercase tracking-widest hover:bg-white transition-all"
          >
            Enter OS <ArrowRight size={14} />
          </button>
        </div>

        {/* Version */}
        <div className="text-center mt-6 text-[9px] text-zinc-700 font-mono uppercase tracking-[0.2em]">
          NexusOS v2.0.2 — Created by Philippe-Antoine Robert
        </div>
      </div>
    </div>
  );
}
