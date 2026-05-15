import React, { useState, useRef, useEffect } from 'react';
import { vfs } from '../../kernel/fileSystem';
import { useOS } from '../../store/osStore';
import { Terminal as TerminalIcon, ChevronLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { MobileAppProps } from '../types';

type TerminalLine = { type: 'text'; content: string } | { type: 'html'; content: string };

export default function MobileUbuntuTerminalApp({ onBack, appId }: MobileAppProps) {
  const { addNotification } = useOS();
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: 'text', content: 'Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-89-generic x86_64)' },
    { type: 'text', content: '' },
    { type: 'text', content: ' * Documentation:  https://help.ubuntu.com' },
    { type: 'text', content: ' * Management:     https://landscape.canonical.com' },
    { type: 'text', content: ' * Support:        https://ubuntu.com/pro' },
    { type: 'text', content: '' },
    { type: 'text', content: 'System information as of ' + new Date().toUTCString() },
    { type: 'text', content: '' },
    { type: 'text', content: '0 updates can be applied immediately.' },
    { type: 'text', content: '' },
  ]);
  
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('/home/user');
  const [installedPackages, setInstalledPackages] = useState<string[]>(['coreutils', 'apt']);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m] ?? m);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const print = (line: string | TerminalLine) => {
    if (typeof line === 'string') {
      setHistory(prev => [...prev, { type: 'text', content: line }]);
    } else {
      setHistory(prev => [...prev, line]);
    }
  };

  const getPrompt = () => {
    let displayDir = cwd;
    if (cwd.startsWith('/home/user')) {
      displayDir = '~' + cwd.slice('/home/user'.length);
    }
    return (
      <span className="font-bold whitespace-nowrap">
        <span className="text-[#8ae234]">user@nexus</span>
        <span className="text-white">:</span>
        <span className="text-[#729fcf]">{displayDir}</span>
        <span className="text-white">$</span>
      </span>
    );
  };

  const constructPromptString = () => {
    let displayDir = cwd;
    if (cwd.startsWith('/home/user')) displayDir = '~' + cwd.slice(10);
    return `user@nexus-ubuntu:${displayDir}$`;
  };

  const resolvePath = (target: string) => {
    if (target.startsWith('/')) return target;
    if (target === '~') return '/home/user';
    if (target === '.') return cwd;
    if (target === '..') {
      const parts = cwd.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    return cwd === '/' ? `/${target}` : `${cwd}/${target}`;
  };

  const handleCommand = async (cmdString: string) => {
    const rawArgs = cmdString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const args = rawArgs.map(a => a.startsWith('"') && a.endsWith('"') ? a.slice(1, -1) : a);
    if (!args.length) return;

    const rawCmd = args[0];
    if (!rawCmd) return;
    const cmd = rawCmd.toLowerCase();
    
    switch (cmd) {
      case 'clear':
        setHistory([]);
        break;
        
      case 'pwd':
        print(cwd);
        break;
        
      case 'whoami':
        print('user');
        break;
        
      case 'uname':
        print(args[1] === '-a' ? 'Linux nexus-ubuntu 5.15.0-89-generic #99-Ubuntu SMP Mon Oct 30 20:42:41 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux' : 'Linux');
        break;

      case 'ls': {
        const targetDir = args[1] && !args[1].startsWith('-') ? resolvePath(args[1]) : cwd;
        const stat = vfs.stat(targetDir);
        if (!stat || stat.type !== 'directory') {
          print(`ls: cannot access '${targetDir}': No such file or directory`);
        } else {
          const children = vfs.listDir(targetDir) || [];
          if (children.length === 0) break;
          
          if (args.includes('-l')) {
            print(`total ${children.length * 4}`);
            children.forEach(c => {
              const cstat = vfs.stat(`${targetDir === '/' ? '' : targetDir}/${c}`);
              const perms = cstat?.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--';
              const size = cstat?.type === 'directory' ? 4096 : (vfs.readFile(`${targetDir === '/' ? '' : targetDir}/${c}`)?.length || 0);
              const date = new Date(cstat?.modified || Date.now()).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
              const escapedName = escapeHtml(c);
              const nameHtml = cstat?.type === 'directory' ? `<span class="text-[#729fcf] font-bold">${escapedName}</span>` : escapedName;
              print({ type: 'html', content: `${perms} 1 user user ${size.toString().padStart(6)} ${date} ${nameHtml}` });
            });
          } else {
            const out = children.map(c => {
              const cstat = vfs.stat(`${targetDir === '/' ? '' : targetDir}/${c}`);
              const escapedName = escapeHtml(c);
              return cstat?.type === 'directory' ? `<span class="text-[#729fcf] font-bold">${escapedName}</span>` : escapedName;
            }).join('  ');
            print({ type: 'html', content: out });
          }
        }
        break;
      }

      case 'cd': {
        const targetArg = args[1];
        const newDir = targetArg ? resolvePath(targetArg) : '/home/user';
        const st = vfs.stat(newDir);
        if (!st) {
          print(`bash: cd: ${targetArg ?? ''}: No such file or directory`);
        } else if (st.type !== 'directory') {
          print(`bash: cd: ${targetArg ?? ''}: Not a directory`);
        } else {
          setCwd(newDir);
        }
        break;
      }

      case 'mkdir':
        if (!args[1]) { print('mkdir: missing operand'); break; }
        vfs.createDir(resolvePath(args[1]));
        break;

      case 'touch':
        if (!args[1]) { print('touch: missing file operand'); break; }
        vfs.writeFile(resolvePath(args[1]), '');
        break;

      case 'rm':
        if (!args[1]) { print('rm: missing operand'); break; }
        vfs.delete(resolvePath(args[1]));
        break;

      case 'cat':
        if (!args[1]) { print('cat: missing operand'); break; }
        const content = vfs.readFile(resolvePath(args[1]));
        if (content === null) print(`cat: ${args[1]}: No such file or directory`);
        else content.split('\n').forEach(l => print(l));
        break;
        
      case 'echo': {
        const text = args.slice(1).join(' ');
        if (text.includes('>')) {
           const parts = text.split('>');
           const val = parts[0]?.trim() ?? '';
           const file = parts[parts.length - 1]?.trim() ?? '';
           if (file) {
             vfs.writeFile(resolvePath(file), val);
           }
        } else {
           print(text);
        }
        break;
      }

      case 'apt':
      case 'apt-get':
        if (args[1] === 'update') {
          print('Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease');
          print('Get:2 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]');
          print('Fetched 110 kB in 1s (110 kB/s)');
          print('Reading package lists... Done');
        } else if (args[1] === 'install') {
          if (!args[2]) { print('E: No packages found'); break; }
          const pkg = args[2];
          print(`Reading package lists... Done`);
          print(`Building dependency tree... Done`);
          print(`The following NEW packages will be installed:`);
          print(`  ${pkg}`);
          print(`Inst ${pkg} (1.0.0 Ubuntu:22.04/jammy [amd64])`);
          print(`Conf ${pkg} (1.0.0 Ubuntu:22.04/jammy [amd64])`);
          setInstalledPackages(prev => [...prev, pkg]);
        }
        break;

      case 'neofetch':
        if (!installedPackages.includes('neofetch')) {
            print("Command 'neofetch' not found, use: sudo apt install neofetch");
            break;
        }
        print({ type: 'html', content: '<div><span class="text-[#E95420] font-bold">user</span>@<span class="text-[#E95420] font-bold">nexus-mobile</span></div>' });
        print('<div>-----------------</div>');
        print({ type: 'html', content: '<div><span class="text-[#E95420] font-bold">OS</span>: Ubuntu 22.04 LTS (Nexus Mobile)</div>' });
        print({ type: 'html', content: '<div><span class="text-[#E95420] font-bold">Kernel</span>: 5.15.0-mobile</div>' });
        print({ type: 'html', content: '<div><span class="text-[#E95420] font-bold">Shell</span>: bash 5.1.16</div>' });
        break;

      default:
        print(`bash: ${cmd}: command not found`);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const cmd = input;
    setHistory(prev => [...prev, { type: 'text', content: `${constructPromptString()} ${cmd}` }]);
    setInput('');
    handleCommand(cmd);
  };

  return (
    <div className="h-full flex flex-col bg-[#300a24] text-white overflow-hidden">
      {/* Mobile Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-[#2c001e] border-b border-black/30 z-50 relative">
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex items-center gap-2">
          <TerminalIcon size={18} className="text-white/70" />
          <h1 className="text-white font-semibold text-[16px]">Ubuntu Terminal</h1>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        className="flex-1 p-3 font-mono text-sm overflow-y-auto"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, i) => (
          <div key={i} className="min-h-[1.2rem] whitespace-pre-wrap break-all leading-tight mb-0.5">
            {line.type === 'text' ? (
              line.content || ' '
            ) : (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line.content || ' ') }} />
            )}
          </div>
        ))}
        
        <form onSubmit={onSubmit} className="flex flex-wrap items-center mt-1">
          <div className="shrink-0 mr-2">{getPrompt()}</div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 min-w-[100px] bg-transparent text-white outline-none caret-white"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </form>
        <div ref={bottomRef} className="h-20" /> {/* Extra space for keyboard */}
      </div>
    </div>
  );
}
