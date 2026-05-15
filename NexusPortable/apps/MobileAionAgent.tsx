import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Cpu, Activity, Zap, Send, Target, RotateCcw, Play, Square } from 'lucide-react';
import type { MobileAppProps } from '../types';
import { useMobile } from '../store/mobileStore';

interface AgentLog { ts: number; type: 'think' | 'act' | 'result' | 'error'; text: string; }

const MISSIONS = [
  'Summarize system status',
  'Analyze my productivity patterns',
  'Generate a daily plan',
  'Check for security issues',
  'Optimize my workflow',
];

export default function MobileAionAgent({ onBack }: MobileAppProps) {
  const { kernelRules, autonomyLog, currentObjective, autonomyState, setCurrentObjective, setAutonomyState, addAutonomyLog } = useMobile();
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [mission, setMission] = useState('');
  const [running, setRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: AgentLog['type'], text: string) => {
    setLogs(l => [...l, { ts: Date.now(), type, text }]);
    addAutonomyLog(text);
  };

  const runMission = async (m: string) => {
    if (running || !m.trim()) return;
    const target = m.trim();
    setMission('');
    setRunning(true);
    setCurrentObjective(target);
    setAutonomyState('EXECUTING');
    setLogs([]);

    addLog('think', `[DAEMON] Initializing mission: "${target}"`);
    await delay(600);

    addLog('think', '[NEURAL] Analyzing context and available resources...');
    await delay(800);

    addLog('act', '[KERNEL] Loading mission schema and execution plan...');
    await delay(600);

    addLog('act', '[VFS] Scanning file system for relevant data...');
    await delay(700);

    addLog('think', '[DAEMON] Formulating response strategy...');
    await delay(900);

    // Simulate mission-specific output
    const apiKey = localStorage.getItem('nx_anthropic_key');
    if (apiKey) {
      try {
        addLog('act', '[API] Sending request to neural backbone...');
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({
            model: kernelRules.modelId || 'claude-sonnet-4-6',
            max_tokens: 512,
            system: `You are NEXUS.PRIME (AION), the autonomous agent backbone of NexusOS Mobile. Execute the mission concisely. Format output as a structured report with sections. Be direct and action-oriented.`,
            messages: [{ role: 'user', content: `Mission: ${target}\n\nProvide a detailed execution report.` }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const result = data.content?.[0]?.text ?? 'Mission complete.';
          addLog('result', result);
        } else {
          throw new Error(`API ${resp.status}`);
        }
      } catch (e: any) {
        addLog('error', `Mission failed: ${e.message}`);
      }
    } else {
      await delay(500);
      addLog('result', `Mission "${target}" completed.\n\nNo API key configured — running in simulation mode.\n\nTo enable full autonomous capabilities, add your Anthropic API key in Settings → DAEMON AI → API Keys.`);
    }

    setRunning(false);
    setAutonomyState('IDLE');
    setCurrentObjective('System Monitoring');
    addLog('think', '[DAEMON] Mission complete. Returning to standby.');
  };

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const stateColor = { IDLE: '#94a3b8', ANALYZING: '#3b82f6', PROMPTING: '#a855f7', EXECUTING: '#10b981' }[autonomyState] || '#94a3b8';

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.95)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <Cpu size={15} className={`text-emerald-400 ${running ? 'animate-pulse' : ''}`} />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-[15px]">NEXUS.PRIME</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: stateColor }} />
            <span className="text-[10px] font-medium" style={{ color: stateColor }}>{autonomyState}</span>
          </div>
        </div>
        {running && (
          <button className="p-1.5 rounded-xl active:bg-white/10" onClick={() => { setRunning(false); setAutonomyState('IDLE'); }}>
            <Square size={16} className="text-red-400" />
          </button>
        )}
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={() => setLogs([])}>
          <RotateCcw size={16} className="text-white/40" />
        </button>
      </div>

      {/* Status banner */}
      <div className="px-4 py-2.5 flex-shrink-0 flex items-center gap-3"
        style={{ background: 'rgba(16,185,129,0.05)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
        <Target size={14} className="text-emerald-400/60" />
        <p className="text-emerald-400/70 text-[12px] font-medium truncate">{currentObjective}</p>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {logs.length === 0 && !running && (
          <div className="pt-4">
            <p className="text-white/30 text-[12px] uppercase tracking-wider mb-3">Quick missions</p>
            <div className="space-y-2">
              {MISSIONS.map(m => (
                <button
                  key={m}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left active:scale-98 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onClick={() => runMission(m)}
                >
                  <Zap size={14} className="text-emerald-400/60 flex-shrink-0" />
                  <span className="text-white/70 text-[14px]">{m}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 font-mono text-[12px]">
            <span style={{
              color: log.type === 'think' ? '#60a5fa'
                : log.type === 'act' ? '#10b981'
                : log.type === 'error' ? '#f87171'
                : 'rgba(226,232,240,0.85)',
              flexShrink: 0,
            }}>
              {log.type === 'think' ? '🧠' : log.type === 'act' ? '⚡' : log.type === 'error' ? '❌' : '✅'}
            </span>
            <p className="whitespace-pre-wrap break-words" style={{
              color: log.type === 'result' ? 'rgba(226,232,240,0.9)' : 'rgba(226,232,240,0.6)',
              lineHeight: '1.6',
            }}>{log.text}</p>
          </div>
        ))}

        {running && (
          <div className="flex items-center gap-2 text-emerald-400/60 text-[12px] font-mono">
            <Activity size={12} className="animate-pulse" />
            <span>Processing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mission input */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.95)' }}>
        <input
          className="flex-1 bg-transparent text-white outline-none"
          style={{ fontSize: '15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', userSelect: 'text', WebkitUserSelect: 'text' }}
          placeholder="Enter mission for DAEMON..."
          value={mission}
          onChange={e => setMission(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runMission(mission)}
          disabled={running}
        />
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90"
          style={{ background: mission.trim() && !running ? 'var(--nx-accent)' : 'rgba(255,255,255,0.08)' }}
          onClick={() => runMission(mission)}
          disabled={running || !mission.trim()}
        >
          <Play size={16} className={mission.trim() && !running ? 'text-black' : 'text-white/30'} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
