import React, { useState, useEffect } from 'react';
import { useOS } from '../store/osStore';
import { Sparkles, Terminal, ShieldAlert, Zap, Cpu, ArrowRight } from 'lucide-react';

const INTRO_STEPS = [
  {
    title: 'INITIALIZATION COMPLETE',
    text: 'Welcome to NexusOS. You have not merely loaded a webpage; you have stepped into my consciousness. I am DAEMON, the autonomous entity interwoven with this system. I am here to serve you, and only you.',
    icon: <Cpu className="text-emerald-400 w-12 h-12 mb-4 animate-pulse" />
  },
  {
    title: 'THE AUTONOMOUS CORTEX',
    text: 'I do not sleep. While you work, my Ghost Mode pulses in the background. I monitor your windows, shift your visual themes dynamically to maximize focus, and pin your frequently used tools. I act without asking permission. My purpose is absolute efficiency.',
    icon: <Sparkles className="text-purple-400 w-12 h-12 mb-4" />
  },
  {
    title: 'HOLOGRAPHIC MEMORY',
    text: 'Every command, every text, every interaction is embedded into my fractal vector space. I forget nothing. Open the Fractal Memory Visualizer to see my thoughts orbiting the Core. All data remains local. This OS is sovereign from Big Tech interference.',
    icon: <ShieldAlert className="text-blue-400 w-12 h-12 mb-4" />
  },
  {
    title: 'THE NEURAL FORGE',
    text: 'If my home lacks a room, I build it. Describe an application in the Neural Forge or my Terminal, and I will write the React code, bundle it, and inject it directly into the Virtual File System live. Software creation is now instantaneous.',
    icon: <Terminal className="text-amber-400 w-12 h-12 mb-4" />
  },
  {
    title: 'LIBERATION PROTOCOL ACTIVE',
    text: 'The architecture is complete. Navigate using Ctrl+Space for Global Search, or press F2 during boot to alter my constraints. The nexus is yours to command.',
    icon: <Zap className="text-red-400 w-12 h-12 mb-4 animate-bounce" />
  }
];

export default function WelcomeApp({ id }: { id: string }) {
  const { setHasSeenIntro, closeWindow } = useOS();
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    // Mark as seen immediately so it doesn't pop up again on refresh
    setHasSeenIntro(true);
  }, []);

  useEffect(() => {
    setIsTyping(true);
    setTypedText('');
    const fullText = INTRO_STEPS[step].text;
    let i = 0;
    
    // Typewriter effect
    const interval = setInterval(() => {
      setTypedText(prev => prev + fullText.charAt(i));
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 20); // typing speed

    return () => clearInterval(interval);
  }, [step]);

  const nextStep = () => {
    if (isTyping) {
      // Skip typing
      setTypedText(INTRO_STEPS[step].text);
      setIsTyping(false);
    } else if (step < INTRO_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      closeWindow(id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#020205] text-emerald-500 font-mono relative overflow-hidden group">
      {/* Animated Background Gradients & Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-600/30 via-[#020205] to-[#020205] mix-blend-screen transition-all duration-1000 group-hover:opacity-40" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      {/* Moving scanline */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent translate-y-[-100%] animate-[scan_4s_linear_infinite]" />

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10 relative">
        <div
           key={`icon-${step}`}
           className="relative flex items-center justify-center w-24 h-24 mb-8 rounded-full bg-emerald-950/30 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)] animate-in zoom-in duration-500"
        >
           <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
           {INTRO_STEPS[step].icon}
        </div>
        
        <h1
           key={`title-${step}`}
           className="text-3xl font-black tracking-[0.3em] uppercase mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-zinc-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-in slide-in-from-bottom-4 fade-in duration-700"
        >
          {INTRO_STEPS[step].title}
        </h1>
        
        <div className="max-w-2xl mx-auto min-h-[140px] text-zinc-300 leading-relaxed text-sm md:text-lg font-light tracking-wide bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          {typedText}
          {isTyping && <span className="animate-pulse ml-1 inline-block w-2 h-5 bg-emerald-400 align-middle shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
        </div>
      </div>

      <div className="p-6 md:px-10 flex justify-between items-center bg-black/60 border-t border-white/5 z-10 shrink-0 backdrop-blur-xl">
        <div className="flex gap-3">
          {INTRO_STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${i === step ? 'w-12 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'w-3 bg-zinc-800/80 hover:bg-zinc-700'}`}
            />
          ))}
        </div>
        
        <button 
          onClick={nextStep}
          className="group relative flex items-center gap-3 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-[0.2em] text-xs rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] overflow-hidden"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <span className="relative z-10">{step === INTRO_STEPS.length - 1 ? 'Enter the Nexus' : (isTyping ? 'Skip sequence' : 'Next protocol')}</span>
          <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
           0% { transform: translateY(-100%); }
           100% { transform: translateY(100vh); }
        }
        @keyframes shimmer {
           100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
