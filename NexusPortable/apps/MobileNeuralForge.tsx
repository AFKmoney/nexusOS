import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Zap, Code, Send, RotateCcw, Cpu, CheckCircle } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

type Stage = 'idle' | 'analysis' | 'architecting' | 'coding' | 'manifesting' | 'verifying' | 'done';

const STAGE_LABELS: Record<Stage, string> = {
  idle: 'Idle',
  analysis: 'Analysing requirements...',
  architecting: 'Designing architecture...',
  coding: 'Writing code...',
  manifesting: 'Manifesting components...',
  verifying: 'Verifying output...',
  done: 'Complete',
};

const STAGES: Stage[] = ['analysis', 'architecting', 'coding', 'manifesting', 'verifying', 'done'];

export default function MobileNeuralForge({ onBack }: MobileAppProps) {
  const { kernelRules, setForging } = useMobile();
  const [prompt, setPrompt] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [stageIdx, setStageIdx] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const startForge = async () => {
    if (!prompt.trim() || stage !== 'idle') return;
    const desc = prompt.trim();
    setPrompt('');
    setResult('');
    setError('');
    setStageIdx(0);
    setForging(true);

    // Animate through stages
    let i = 0;
    setStage(STAGES[0]!);
    progressRef.current = setInterval(() => {
      i++;
      if (i < STAGES.length - 1) {
        setStage(STAGES[i]!);
        setStageIdx(i);
      } else {
        clearInterval(progressRef.current);
      }
    }, 1200);

    const apiKey = localStorage.getItem('nx_anthropic_key');
    try {
      if (apiKey) {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({
            model: kernelRules.modelId || 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: `You are NeuralForge, the app-building AI within NexusOS Mobile. Generate complete, working React + TypeScript components. Output only the code — no markdown fences, no explanation. The component must export a default function named App that takes no props and returns JSX. Use Tailwind CSS classes. Make it visually impressive, dark themed, and fully functional.`,
            messages: [{ role: 'user', content: `Build: ${desc}` }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          clearInterval(progressRef.current);
          setStage('done');
          setStageIdx(STAGES.length - 1);
          setResult(data.content?.[0]?.text ?? '// No output');
        } else {
          throw new Error(`API error ${resp.status}`);
        }
      } else {
        await new Promise(r => setTimeout(r, 6000));
        clearInterval(progressRef.current);
        setStage('done');
        setStageIdx(STAGES.length - 1);
        setResult(`// NeuralForge — Simulation Mode\n// Add your Anthropic API key in Settings → DAEMON AI\n// to enable real app generation.\n\n// Your request: "${desc}"\n\nfunction App() {\n  return (\n    <div className="p-6 text-white">\n      <h1>App: ${desc}</h1>\n      <p>Configure API key to generate real code.</p>\n    </div>\n  );\n}`);
      }
    } catch (e: any) {
      clearInterval(progressRef.current);
      setError(e.message);
      setStage('idle');
    } finally {
      setForging(false);
    }
  };

  const reset = () => { setStage('idle'); setResult(''); setError(''); setStageIdx(0); clearInterval(progressRef.current); setForging(false); };

  const QUICK = ['To-do list app', 'Expense tracker', 'Pomodoro timer', 'BMI calculator', 'Password generator'];

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <Zap size={17} className="text-emerald-400" />
        <h1 className="text-white font-semibold text-[16px] flex-1">NeuralForge</h1>
        {stage !== 'idle' && (
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={reset}>
            <RotateCcw size={16} className="text-white/50" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {stage === 'idle' && !result && (
          <>
            <div className="flex flex-col items-center py-6 gap-2">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <Zap size={32} className="text-emerald-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-white text-lg font-bold">Build Any App with AI</h2>
              <p className="text-white/40 text-[13px] text-center">Describe your app and DAEMON will write the code</p>
            </div>
            <div className="space-y-2">
              <p className="text-white/30 text-[11px] uppercase tracking-wider">Quick start</p>
              {QUICK.map(q => (
                <button key={q} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left active:bg-white/8"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => { setPrompt(q); }}>
                  <Code size={14} className="text-emerald-400/50" />
                  <span className="text-white/70 text-[14px]">{q}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {stage !== 'idle' && stage !== 'done' && (
          <div className="py-8 flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Cpu size={40} className="text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-[16px]">{STAGE_LABELS[stage]}</p>
              <p className="text-white/40 text-[13px] mt-1">DAEMON is working...</p>
            </div>
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-[11px] text-white/30 mb-2">
                {STAGES.slice(0, -1).map((s, i) => (
                  <div key={s} className="w-1.5 h-1.5 rounded-full" style={{ background: i <= stageIdx ? '#10b981' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(stageIdx / (STAGES.length - 2)) * 100}%`, background: 'var(--nx-accent)' }} />
              </div>
            </div>
          </div>
        )}

        {stage === 'done' && result && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-emerald-400" />
              <p className="text-white font-semibold text-[15px]">App generated!</p>
            </div>
            <pre className="p-4 rounded-2xl text-[12px] font-mono text-emerald-300/80 overflow-x-auto"
              style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {result}
            </pre>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-red-400 text-[14px]">Error: {error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.95)' }}>
        <textarea
          className="flex-1 bg-transparent text-white outline-none resize-none"
          style={{ fontSize: '15px', lineHeight: '1.5', maxHeight: '80px', minHeight: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px', userSelect: 'text', WebkitUserSelect: 'text' }}
          placeholder="Describe the app to build..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), startForge())}
          disabled={stage !== 'idle'}
          rows={1}
        />
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90"
          style={{ background: prompt.trim() && stage === 'idle' ? 'var(--nx-accent)' : 'rgba(255,255,255,0.08)' }}
          onClick={startForge}
          disabled={stage !== 'idle' || !prompt.trim()}
        >
          <Send size={15} className={prompt.trim() && stage === 'idle' ? 'text-black' : 'text-white/30'} />
        </button>
      </div>
    </div>
  );
}
