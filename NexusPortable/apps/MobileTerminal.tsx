import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Trash2, ChevronRight } from 'lucide-react';
import type { MobileAppProps } from '../types';

interface TermLine {
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  ts: number;
}

const COMMANDS: Record<string, (args: string[]) => string> = {
  help: () => `Available commands:
  help       Show this help
  clear      Clear terminal
  echo       Print text
  ls         List files
  pwd        Print working directory
  whoami     Show current user
  date       Show current date/time
  uname      System information
  uptime     System uptime
  neofetch   System info (fancy)`,
  echo: (args) => args.join(' '),
  ls: () => 'bin  boot  dev  etc  home  lib  proc  sys  tmp  usr  var',
  pwd: () => '/home/user',
  whoami: () => 'user',
  date: () => new Date().toString(),
  uname: (args) => {
    if (args.includes('-a')) return 'NexusOS 1.0.0 Mobile ARM64 Android/PWA';
    return 'NexusOS';
  },
  uptime: () => {
    const s = Math.floor(performance.now() / 1000);
    return `up ${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
  },
  neofetch: () => `
    ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
    ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
    ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
    ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
    ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
    ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝

  OS:       NexusOS Mobile 1.0.0
  Host:     ARM64 Device
  Kernel:   Neural 2.0
  Shell:    nexsh 1.0
  Terminal: NexusTerm Mobile
  CPU:      Neural Engine
  Memory:   ████████░░ 80%`,
};

export default function MobileTerminal({ onBack }: MobileAppProps) {
  const [lines, setLines] = useState<TermLine[]>([
    { type: 'system', text: 'NexusOS Terminal v1.0 — type "help" for commands', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const run = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory(h => [trimmed, ...h.slice(0, 49)]);
    setHistIdx(-1);

    const newLines: TermLine[] = [
      { type: 'input', text: `$ ${trimmed}`, ts: Date.now() },
    ];

    if (trimmed === 'clear') {
      setLines([{ type: 'system', text: 'Terminal cleared.', ts: Date.now() }]);
      return;
    }

    const [name, ...args] = trimmed.split(' ');
    const fn = COMMANDS[name];
    if (fn) {
      const out = fn(args);
      newLines.push({ type: 'output', text: out, ts: Date.now() });
    } else {
      newLines.push({ type: 'error', text: `nexsh: command not found: ${name}`, ts: Date.now() });
    }

    setLines(l => [...l, ...newLines]);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      run(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx] ?? '');
    } else if (e.key === 'ArrowDown') {
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? '' : history[idx]);
    }
  };

  const quickKeys = ['ls', 'help', 'pwd', 'clear', 'neofetch'];

  return (
    <div className="h-full flex flex-col" style={{ background: '#030306' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}
      >
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1">
          <p className="text-white font-semibold text-[15px]">Terminal</p>
          <p className="text-emerald-400/60 text-[11px] font-mono">nexsh · user@nexusos</p>
        </div>
        <button
          className="p-1.5 rounded-xl active:bg-white/10"
          onClick={() => setLines([{ type: 'system', text: 'Terminal cleared.', ts: Date.now() }])}
        >
          <Trash2 size={17} className="text-white/50" />
        </button>
      </div>

      {/* Output */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 font-mono"
        style={{ fontSize: '12.5px', lineHeight: '1.6' }}
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className="mb-0.5 whitespace-pre-wrap break-all"
            style={{
              color:
                line.type === 'input' ? '#10b981' :
                line.type === 'error' ? '#f87171' :
                line.type === 'system' ? '#6366f1' :
                'rgba(226,232,240,0.85)',
            }}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick keys */}
      <div
        className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {quickKeys.map(k => (
          <button
            key={k}
            className="flex-none px-3 py-1 rounded-lg text-[12px] font-mono text-emerald-400/80 active:bg-emerald-500/20"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
            onClick={() => { run(k); }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.95)' }}
      >
        <ChevronRight size={16} className="text-emerald-400 flex-shrink-0" />
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-emerald-300 font-mono outline-none"
          style={{ fontSize: '14px', caretColor: '#10b981', userSelect: 'text', WebkitUserSelect: 'text' }}
          placeholder="type a command..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center active:bg-emerald-500/20"
          style={{ background: 'rgba(16,185,129,0.1)' }}
          onClick={() => { run(input); setInput(''); }}
        >
          <Send size={15} className="text-emerald-400" />
        </button>
      </div>
    </div>
  );
}
