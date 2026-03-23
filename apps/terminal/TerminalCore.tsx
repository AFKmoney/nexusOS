
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useOS } from '../../store/osStore';
import { commander } from '../../kernel/commander';
import { Sparkles, ChevronRight } from 'lucide-react';

const INITIAL_MESSAGES = [
  { type: 'out' as const, text: '╔══════════════════════════════════════╗' },
  { type: 'out' as const, text: '║  NEXUS OS  ·  Terminal v11.0         ║' },
  { type: 'out' as const, text: '║  DAEMON Neural Shell Active          ║' },
  { type: 'out' as const, text: '╚══════════════════════════════════════╝' },
  { type: 'out' as const, text: 'Type "help" for available commands.' },
];

const HELP_TEXT = `
SYSTEM COMMANDS:
  help                    Show this help
  clear                   Clear terminal
  sysinfo                 System information
  ps                      List running processes (windows)
  ls [path]               List directory contents
  cd <path>               Change current directory
  cat <file>              Read file contents
  write <path> "content"  Write to file
  rm <path>               Delete file or directory
  mkdir <path>            Create directory
  inspect <file>          Open file in Notepad

APP CONTROL:
  open <appId>            Open an application
  close [appId]           Close application
  
NEURAL FORGE:
  build "description"     Create an app with AI
  forge "description"     Alias for build
  
MEMORY:
  remember "text"         Store a memory
  recall "query"          Search memory

SYSTEM:
  alias <name> <cmd>      Create command alias
  history                 Show command history
  neofetch                System info display
`.trim();

export default function TerminalCore() {
  const [history, setHistory] = useState<{ type: 'in' | 'out' | 'ai'; text: string }[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentDir, setCurrentDir] = useState('/home/user');
  const [aliases, setAliases] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { kernelRules, windows, registry } = useOS();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const addLine = useCallback((text: string, type: 'in' | 'out' | 'ai' = 'out') => {
    setHistory(prev => [...prev, { type, text }]);
  }, []);

  const handleCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    // Handle aliases
    const expanded = aliases[cmd.split(' ')[0]] 
      ? cmd.replace(cmd.split(' ')[0], aliases[cmd.split(' ')[0]])
      : cmd;

    // Update command history
    setCmdHistory(prev => [cmd, ...prev.slice(0, 99)]);
    setCmdHistoryIdx(-1);
    addLine(`${currentDir} $ ${cmd}`, 'in');

    if (cmd === 'clear') { setHistory([]); return; }
    if (cmd === 'help') { addLine(HELP_TEXT); return; }
    if (cmd === 'history') {
      addLine(cmdHistory.slice(0, 20).map((c, i) => `  ${i + 1}  ${c}`).join('\n'));
      return;
    }

    if (cmd === 'neofetch') {
      addLine([
        '   ██╗  ██╗███████╗██╗  ██╗██╗   ██╗███████╗',
        '   ███╗ ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝',
        '   ████╗██║█████╗   ╚███╔╝ ██║   ██║███████╗',
        '   ██╔████║██╔══╝   ██╔██╗ ██║   ██║╚════██║',
        '   ██║╚███║███████╗██╔╝╚██╗╚██████╔╝███████║',
        '   ╚═╝ ╚══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝',
        '',
        `   OS:       NexusOS v10.5 DAEMON Edition`,
        `   Kernel:   DAEMON v2.0 (AutonomyEngine + LocalBrain)`,
        `   Shell:    Neural Shell v11.0`,
        `   CPU:      ${navigator.hardwareConcurrency || '?'} cores`,
        `   Memory:   ${Math.round((performance as any)?.memory?.totalJSHeapSize / 1024 / 1024) || '?'} MB`,
        `   Apps:     ${registry.length} installed`,
        `   Windows:  ${windows.length} open`,
        `   Built:    March 2026`,
      ].join('\n'));
      return;
    }

    if (cmd === 'ps') {
      if (windows.length === 0) { addLine('No active processes.'); return; }
      addLine('PID  APP_ID           TITLE');
      addLine('─────────────────────────────────────────');
      windows.forEach((w, i) => {
        addLine(`${String(i + 1).padStart(3)}  ${w.appId.padEnd(16)} ${w.title}`);
      });
      return;
    }

    const parts = expanded.split(' ');
    const base = parts[0].toLowerCase();

    if (base === 'cd') {
      const target = parts[1] || '/home/user';
      const resolved = target.startsWith('/') ? target : `${currentDir}/${target}`;
      setCurrentDir(resolved);
      addLine(`Moved to: ${resolved}`);
      return;
    }

    if (base === 'cat') {
      const file = parts.slice(1).join(' ').replace(/^"|"$/g, '');
      const path = file.startsWith('/') ? file : `${currentDir}/${file}`;
      const { vfs } = await import('../../kernel/fileSystem');
      const content = vfs.readFile(path);
      if (content !== null) addLine(content);
      else addLine(`cat: ${path}: No such file`);
      return;
    }

    if (base === 'mkdir') {
      const dir = parts[1];
      if (!dir) { addLine('Usage: mkdir <path>'); return; }
      const path = dir.startsWith('/') ? dir : `${currentDir}/${dir}`;
      const { vfs } = await import('../../kernel/fileSystem');
      vfs.createDir(path);
      addLine(`Directory created: ${path}`);
      return;
    }

    if (base === 'open') {
      const appId = parts[1];
      if (!appId) { addLine('Usage: open <appId>'); return; }
      useOS.getState().openWindow(appId);
      addLine(`Opening: ${appId}`);
      return;
    }

    if (base === 'alias') {
      if (parts.length < 3) { addLine('Usage: alias <name> <command>'); return; }
      const name = parts[1];
      const aliasCmd = parts.slice(2).join(' ');
      setAliases(prev => ({ ...prev, [name]: aliasCmd }));
      addLine(`Alias set: ${name} → ${aliasCmd}`);
      return;
    }

    if (base === 'remember') {
      const text = expanded.replace(/^remember\s+/, '').replace(/^"|"$/g, '');
      const { memory } = await import('../../kernel/memory');
      memory.remember(text);
      addLine(`Memory stored: "${text.slice(0, 60)}..."`);
      return;
    }

    if (base === 'recall') {
      const query = expanded.replace(/^recall\s+/, '').replace(/^"|"$/g, '');
      const { memory } = await import('../../kernel/memory');
      const results = memory.recall(query, 5);
      if (results.length === 0) { addLine('No matching memories.'); return; }
      results.forEach((r, i) => addLine(`  ${i + 1}. ${r.content.slice(0, 100)}`));
      return;
    }

    // Fall through to commander
    setIsProcessing(true);
    const onStream = (text: string) => {
      setHistory(prev => {
        const last = prev[prev.length - 1];
        if (last?.type === 'ai') {
          return [...prev.slice(0, -1), { ...last, text: last.text + text }];
        }
        return [...prev, { type: 'ai', text }];
      });
    };

    await commander.execute(expanded, (text, type) => {
      if (type === 'out') addLine(text, 'out');
    }, kernelRules, onStream);

    setIsProcessing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleCommand(input);
      setInput('');
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = Math.min(cmdHistoryIdx + 1, cmdHistory.length - 1);
      setCmdHistoryIdx(nextIdx);
      setInput(cmdHistory[nextIdx] || '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.max(cmdHistoryIdx - 1, -1);
      setCmdHistoryIdx(nextIdx);
      setInput(nextIdx === -1 ? '' : cmdHistory[nextIdx] || '');
    }
    // Tab completion
    if (e.key === 'Tab') {
      e.preventDefault();
      const cmds = ['help', 'clear', 'ls', 'cd', 'cat', 'write', 'rm', 'mkdir', 'inspect', 'build', 'forge', 'open', 'close', 'ps', 'sysinfo', 'history', 'neofetch', 'remember', 'recall', 'alias'];
      const match = cmds.find(c => c.startsWith(input.toLowerCase()) && c !== input.toLowerCase());
      if (match) setInput(match);
    }
  };

  return (
    <div
      className="h-full bg-[#020204] p-4 font-mono text-base overflow-hidden flex flex-col text-green-500 selection:bg-green-500/30"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto pb-4 space-y-0.5">
        {history.map((h, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap leading-5 text-xs ${
              h.type === 'in'  ? 'text-white' :
              h.type === 'ai'  ? 'text-purple-400' :
              'text-green-400'
            }`}
          >
            {h.type === 'ai' && <Sparkles size={12} className="inline mr-1.5 mb-0.5 opacity-70" />}
            {h.text}
          </div>
        ))}
        {isProcessing && history[history.length - 1]?.type !== 'ai' && (
          <div className="text-emerald-500 animate-pulse">▋</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 items-center border-t border-green-900/30 pt-3 shrink-0">
        <span className="text-blue-400 font-bold text-xs shrink-0">
          <ChevronRight size={16} className="inline" />
          {currentDir.replace('/home/user', '~')} $
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          className="bg-transparent border-none outline-none flex-1 text-white text-xs caret-green-400"
          disabled={isProcessing}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
