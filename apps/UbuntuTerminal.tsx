import React, { useState, useRef, useEffect } from 'react';
import { vfs } from '../kernel/fileSystem';
import { useOS } from '../store/osStore';
import { Info, Terminal as TerminalIcon } from 'lucide-react';

export default function UbuntuTerminalApp({ windowId }: { windowId: string }) {
  const { addNotification } = useOS();
  const [history, setHistory] = useState<string[]>([
    'Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-89-generic x86_64)',
    '',
    ' * Documentation:  https://help.ubuntu.com',
    ' * Management:     https://landscape.canonical.com',
    ' * Support:        https://ubuntu.com/pro',
    '',
    'System information as of ' + new Date().toUTCString(),
    '',
    '0 updates can be applied immediately.',
    '',
  ]);
  
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('/home/user');
  const [installedPackages, setInstalledPackages] = useState<string[]>(['coreutils', 'apt']);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [history]);

  const print = (text: string) => {
    setHistory(prev => [...prev, text]);
  };

  const getPrompt = () => {
    let displayDir = cwd;
    if (cwd.startsWith('/home/user')) {
      displayDir = '~' + cwd.slice('/home/user'.length);
    }
    return (
      <span className="font-bold">
        <span className="text-[#8ae234]">user@nexus-ubuntu</span>
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

    const cmd = args[0].toLowerCase();
    
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

      case 'ls':
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
              print(`${perms} 1 user user ${size.toString().padStart(6)} ${date} ${cstat?.type === 'directory' ? `<span class="text-[#729fcf] font-bold">${c}</span>` : c}`);
            });
          } else {
            const out = children.map(c => vfs.stat(`${targetDir === '/' ? '' : targetDir}/${c}`)?.type === 'directory' ? `<span class="text-[#729fcf] font-bold">${c}</span>` : c).join('  ');
            print(out);
          }
        }
        break;

      case 'cd':
        const newDir = args[1] ? resolvePath(args[1]) : '/home/user';
        const st = vfs.stat(newDir);
        if (!st) {
          print(`bash: cd: ${args[1]}: No such file or directory`);
        } else if (st.type !== 'directory') {
          print(`bash: cd: ${args[1]}: Not a directory`);
        } else {
          setCwd(newDir);
        }
        break;

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
        
      case 'echo':
        const text = args.slice(1).join(' ');
        if (text.includes('>')) {
           const parts = text.split('>');
           const val = parts[0].trim();
           const file = parts[parts.length-1].trim();
           vfs.writeFile(resolvePath(file), val);
        } else {
           print(text);
        }
        break;
        
      case 'grep':
        if (args.length < 3) { print('grep: missing operand'); break; }
        const term = args[1];
        const gcontent = vfs.readFile(resolvePath(args[2]));
        if (gcontent === null) {
            print(`grep: ${args[2]}: No such file or directory`);
        } else {
            gcontent.split('\n').forEach(line => {
                if (line.includes(term)) {
                    // Highlight term
                    const highlighted = line.replace(new RegExp(term, 'g'), `<span class="text-red-500 font-bold">${term}</span>`);
                    print(highlighted);
                }
            });
        }
        break;

      case 'apt':
      case 'apt-get':
        if (args[1] === 'update') {
          print('Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease');
          print('Get:2 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]');
          print('Fetched 110 kB in 1s (110 kB/s)');
          print('Reading package lists... Done');
          print('Building dependency tree... Done');
          print('Reading state information... Done');
        } else if (args[1] === 'install') {
          if (!args[2]) { print('E: No packages found'); break; }
          const pkg = args[2];
          print(`Reading package lists... Done`);
          print(`Building dependency tree... Done`);
          print(`The following NEW packages will be installed:`);
          print(`  ${pkg}`);
          print(`0 upgraded, 1 newly installed, 0 to remove.`);
          print(`Inst ${pkg} (1.0.0 Ubuntu:22.04/jammy [amd64])`);
          print(`Conf ${pkg} (1.0.0 Ubuntu:22.04/jammy [amd64])`);
          setInstalledPackages(prev => [...prev, pkg]);
        }
        break;

      case 'neofetch':
        if (!installedPackages.includes('neofetch')) {
            print("Command 'neofetch' not found, but can be installed with:");
            print("sudo apt install neofetch");
            break;
        }
        print('<div class="flex gap-4">');
        print('<pre class="text-[#E95420]">');
        print('            .-/+oossssoo+/-.               ');
        print('        `:+ssssssssssssssssss+:`           ');
        print('      -+ssssssssssssssssssyyssss+-         ');
        print('    .ossssssssssssssssssdMMMNysssso.       ');
        print('   /ssssssssssshdmmNNmmyNMMMMhssssss/      ');
        print('  +ssssssssshmydMMMMMMMNddddyssssssss+     ');
        print(' /sssssssshNMMMyhhyyyyhmNMMMNhssssssss/    ');
        print('.ssssssssdMMMNhsssssssssshNMMMdssssssss.   ');
        print('+sssshhhyNMMNyssssssssssssyNMMMysssssss+   ');
        print('ossyNMMMNyMMhsssssssssssssshmmmhssssssso   ');
        print('ossyNMMMNyMMhsssssssssssssshmmmhssssssso   ');
        print('+sssshhhyNMMNyssssssssssssyNMMMysssssss+   ');
        print('.ssssssssdMMMNhsssssssssshNMMMdssssssss.   ');
        print(' /sssssssshNMMMyhhyyyyhdNMMMNhssssssss/    ');
        print('  +sssssssssdmydMMMMMMMMddddyssssssss+     ');
        print('   /ssssssssssshdmNNNNmyNMMMMhssssss/      ');
        print('    .ossssssssssssssssssdMMMNysssso.       ');
        print('      -+sssssssssssssssssyyyssss+-         ');
        print('        `:+ssssssssssssssssss+:`           ');
        print('            .-/+oossssoo+/-.               ');
        print('</pre>');
        print('<div class="flex flex-col gap-1 mt-4">');
        print('<div><span class="text-[#E95420] font-bold">user</span>@<span class="text-[#E95420] font-bold">nexus-ubuntu</span></div>');
        print('<div>-----------------</div>');
        print('<div><span class="text-[#E95420] font-bold">OS</span>: Ubuntu 22.04.3 LTS x86_64</div>');
        print('<div><span class="text-[#E95420] font-bold">Host</span>: Nexus VFS Subsystem v10.5</div>');
        print('<div><span class="text-[#E95420] font-bold">Kernel</span>: 5.15.0-89-generic</div>');
        print('<div><span class="text-[#E95420] font-bold">Uptime</span>: 1 hour, 23 mins</div>');
        print('<div><span class="text-[#E95420] font-bold">Packages</span>: ' + installedPackages.length + ' (dpkg)</div>');
        print('<div><span class="text-[#E95420] font-bold">Shell</span>: bash 5.1.16</div>');
        print('<div><span class="text-[#E95420] font-bold">Terminal</span>: nexus-pty</div>');
        print('<div><span class="text-[#E95420] font-bold">CPU</span>: Virtual Processor (16) @ 3.4GHz</div>');
        print('<div><span class="text-[#E95420] font-bold">Memory</span>: 142MB / 8192MB</div>');
        print('<div class="flex mt-2">');
        print('<div class="w-4 h-4 bg-[#2e3436]"></div><div class="w-4 h-4 bg-[#cc0000]"></div><div class="w-4 h-4 bg-[#4e9a06]"></div><div class="w-4 h-4 bg-[#c4a000]"></div><div class="w-4 h-4 bg-[#3465a4]"></div><div class="w-4 h-4 bg-[#75507b]"></div><div class="w-4 h-4 bg-[#06989a]"></div><div class="w-4 h-4 bg-[#d3d7cf]"></div>');
        print('</div>');
        print('</div></div>');
        break;
        
      case 'python3':
        if (!installedPackages.includes('python3')) {
            print("Command 'python3' not found, but can be installed with:");
            print("sudo apt install python3");
            break;
        }
        print("Python 3.10.12 (main, Nov 20 2023, 15:14:05) [GCC 11.4.0] on linux");
        print("Type \"help\", \"copyright\", \"credits\" or \"license\" for more information.");
        print(">>> Nexus Virtual REPL active. Evaluating expression...");
        try {
            // simple eval just for fun
            if (args.length > 1 && args[1] === '-c') {
                const res = Function(`"use strict";return (${args[2]})`)();
                print(String(res));
            } else {
                print("Pass -c 'expression' to evaluate.");
            }
        } catch(e:any) {
            print(`Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\nNameError: ${e.message}`);
        }
        break;

      default:
        print(`bash: ${cmd}: command not found`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = input;
      setHistory(prev => [...prev, `${constructPromptString()} ${cmd}`]);
      setInput('');
      if (cmd.trim()) handleCommand(cmd);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#300a24] text-white overflow-hidden custom-scrollbar">
      {/* Header / Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2c001e] border-b border-black/30 shrink-0 select-none">
          <div className="flex items-center gap-2">
              <TerminalIcon size={18} className="text-white/70" />
              <div className="text-sm font-semibold text-white/90 font-sans tracking-wide">user@nexus-ubuntu:~</div>
          </div>
      </div>

      {/* Terminal Content */}
      <div 
        className="flex-1 p-2 font-mono text-base overflow-y-auto" 
        onClick={() => document.getElementById('ubuntu-cli-input')?.focus()}
      >
        {history.map((line, i) => (
          <div key={i} className="min-h-[20px] whitespace-pre-wrap break-all" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
        ))}
        
        <div className="flex">
          <div className="shrink-0 mr-2 whitespace-pre">{getPrompt()}</div>
          <input
            id="ubuntu-cli-input"
            type="text"
            className="flex-1 bg-transparent text-white outline-none caret-white"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
