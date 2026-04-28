import { vfs } from './fileSystem';
import { memory } from './memory';
import { aiService } from '../services/puterService';
import { useOS } from '../store/osStore';
import { KernelRules } from '../types';
import { processManager } from './processManager';

interface ShellState {
  cwd: string;
  env: Record<string, string>;
  aliases: Record<string, string>;
  history: string[];
  lastExitCode: number;
}

const SHELL_STORAGE_KEY = 'daemon_shell_state_v1';
const MAX_COMMAND_LENGTH = 4_096;
const MAX_PATH_LENGTH = 512;
const MAX_ARG_LENGTH = 1_024;
const MAX_GREP_PATTERN_LENGTH = 256;
const MAX_HISTORY_LENGTH = 500;

function isSafePath(path: string): boolean {
  return typeof path === 'string' && path.length > 0 && path.length <= MAX_PATH_LENGTH && !path.includes('\0') && !path.includes('..');
}

function isSafeCommandName(value: string): boolean {
  return /^[a-z][a-z0-9_-]*$/i.test(value);
}

function clampText(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export class Commander {
    private shell: ShellState;

    constructor() {
      this.shell = this.loadShellState();
    }

    private loadShellState(): ShellState {
      try {
        const raw = localStorage.getItem(SHELL_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return {
        cwd: '/home/user',
        env: {
          HOME: '/home/user',
          USER: 'daemon',
          SHELL: '/bin/nxsh',
          PATH: '/usr/bin:/usr/local/bin',
          TERM: 'nexus-256color',
          EDITOR: 'hyperide',
          LANG: 'en_US.UTF-8',
          PS1: '\\u@nexus:\\w$ ',
          NEXUS_VERSION: '2.0.0',
        },
        aliases: {
          'll': 'ls -la',
          'la': 'ls -a',
          'cls': 'clear',
          '..': 'cd ..',
        },
        history: [],
        lastExitCode: 0,
      };
    }

    private persistShellState() {
      try {
        localStorage.setItem(SHELL_STORAGE_KEY, JSON.stringify(this.shell));
      } catch {}
    }

    private sanitizeCommandInput(input: string): string {
      const trimmed = clampText((input || '').trim(), MAX_COMMAND_LENGTH);
      return trimmed;
    }

    // ─── Path Resolution ────────────────────────────────────────────
    private resolvePath(input: string): string {
      if (!input) return this.shell.cwd;
      let p = input.replace(/\$([A-Z_]+)/g, (_, key) => this.shell.env[key] || '');
      p = p.replace(/^~/, this.shell.env.HOME || '/home/user');
      if (p.startsWith('/')) return this.normalizePath(p);
      return this.normalizePath(`${this.shell.cwd}/${p}`);
    }

    private normalizePath(p: string): string {
      const parts = p.split('/').filter(Boolean);
      const resolved: string[] = [];
      for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') { resolved.pop(); continue; }
        resolved.push(part);
      }
      return '/' + resolved.join('/');
    }

    private safeResolvePath(input: string): string {
      const normalized = this.resolvePath(input);
      return isSafePath(normalized) ? normalized : '';
    }

    // ─── Argument Parser ────────────────────────────────────────────
    private parseArgs(raw: string): string[] {
      const args: string[] = [];
      let current = '';
      let inQuote = false;
      let quoteChar = '';

      for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        if ((char === '"' || char === "'") && !inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar && inQuote) {
          inQuote = false;
          quoteChar = '';
        } else if (char === ' ' && !inQuote) {
          if (current) args.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      if (current) args.push(current);
      return args;
    }

    private getFlagArgs(args: string[], commandName: string): string[] {
      return args.filter(a => a !== commandName && a.startsWith('-'));
    }

    // ─── Pipe & Redirection Engine ─────────────────────────────────
    public async execute(
        cmd: string,
        log: (text: string, type: 'in' | 'out' | 'ai') => void,
        kernelRules: KernelRules,
        onStream?: (text: string) => void
    ): Promise<void> {
        const raw = this.sanitizeCommandInput(cmd);
        if (!raw) return;

        this.shell.history.push(raw);
        if (this.shell.history.length > MAX_HISTORY_LENGTH) this.shell.history = this.shell.history.slice(-MAX_HISTORY_LENGTH);
        this.persistShellState();

        log(`exec: ${raw}`, 'in');

        const firstWord = raw.split(' ')[0] ?? '';
        const aliasValue = firstWord ? this.shell.aliases[firstWord] : undefined;
        if (aliasValue) {
          const expanded = raw.replace(firstWord, aliasValue);
          return this.execute(expanded, log, kernelRules, onStream);
        }

        if (raw.includes(' | ') && !raw.includes('"') ) {
          return this.executePipeline(raw, log, kernelRules);
        }

        const redirectMatch = raw.match(/^(.+?)\s*(\>{1,2})\s*(.+)$/);
        if (redirectMatch) {
          const command = redirectMatch[1]?.trim() ?? '';
          const mode = redirectMatch[2] ?? '>';
          const filePath = this.safeResolvePath(redirectMatch[3]?.trim() ?? '');
          const output = await this.executeCommand(command, kernelRules);
          if (output !== null && filePath) {
            if (mode === '>>') {
              const existing = vfs.readFile(filePath) || '';
              vfs.writeFile(filePath, existing + output);
            } else {
              vfs.writeFile(filePath, output);
            }
            log(`Output redirected to ${filePath}`, 'out');
          }
          return;
        }

        const result = await this.executeCommand(raw, kernelRules, log, onStream);
        if (result !== null && result !== undefined && result !== '') {
          log(result, 'out');
        }
    }

    private async executePipeline(
      raw: string,
      log: (text: string, type: 'in' | 'out' | 'ai') => void,
      kernelRules: KernelRules
    ) {
        const commands = raw.split(' | ').map(c => c.trim()).filter(Boolean);
      let pipeInput = '';

      for (let i = 0; i < commands.length; i++) {
        const pipelineCommand = commands[i];
        if (!pipelineCommand) continue;
        const result = await this.executeCommand(pipelineCommand, kernelRules, undefined, undefined, pipeInput);
        pipeInput = result || '';
      }

      if (pipeInput) log(pipeInput, 'out');
    }

    // ─── Command Dispatcher ────────────────────────────────────────
    private async executeCommand(
        raw: string,
        kernelRules: KernelRules,
        log?: (text: string, type: 'in' | 'out' | 'ai') => void,
        onStream?: (text: string) => void,
        pipeInput?: string
    ): Promise<string | null> {
        const args = this.parseArgs(this.sanitizeCommandInput(raw));
        const command = args[0]?.toLowerCase();
        const os = useOS.getState();
        if (!command) return null;

        if (!isSafeCommandName(command)) return `Command rejected: ${command}`;

        if (command === 'ls') {
          const flags = this.getFlagArgs(args, 'ls').join('');
          const targetArg = args.find(a => !a.startsWith('-') && a !== 'ls') || this.shell.cwd;
          const path = this.safeResolvePath(targetArg);
          if (!path) return 'ls: invalid path';
          const files = vfs.listDir(path);
          if (!files || files.length === 0) return `(empty directory)`;
          
          const showAll = flags.includes('a');
          const showLong = flags.includes('l');
          let items = showAll ? ['.', '..', ...files] : files.filter(f => !f.startsWith('.'));
          
          if (showLong) {
            return items.map(name => {
              const fullPath = `${path}/${name}`;
              const stat = vfs.stat(fullPath);
              const isDir = stat?.type === 'directory';
              const size = stat?.type === 'file' ? (vfs.readFile(fullPath)?.length || 0) : '-';
              const date = stat?.modified ? new Date(stat.modified).toLocaleDateString() : '-';
              const perm = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
              return `${perm}  daemon daemon  ${String(size).padStart(6)}  ${date}  ${name}${isDir ? '/' : ''}`;
            }).join('\n');
          }
          return items.map(f => {
            const st = vfs.stat(`${path}/${f}`);
            return st?.type === 'directory' ? `${f}/` : f;
          }).join('  ');
        }

        if (command === 'cd') {
          const target = args[1] || this.shell.env.HOME || '/home/user';
          const resolved = this.safeResolvePath(target);
          const stat = resolved ? vfs.stat(resolved) : null;
          if (!stat || stat.type !== 'directory') {
            return `cd: ${target}: No such directory`;
          }
          this.shell.cwd = resolved;
          this.shell.env.PWD = resolved;
          this.persistShellState();
          return null;
        }

        if (command === 'pwd') {
          return this.shell.cwd;
        }

        if (command === 'mkdir') {
          const paths = args.filter(a => a !== 'mkdir' && a !== '-p');
          if (paths.length === 0) return 'mkdir: missing operand';
          for (const p of paths) {
            const resolved = this.safeResolvePath(p);
            if (resolved) vfs.createDir(resolved);
          }
          return null;
        }

        if (command === 'touch') {
          const paths = args.slice(1);
          if (paths.length === 0) return 'touch: missing operand';
          for (const p of paths) {
            const resolved = this.safeResolvePath(p);
            if (!resolved) continue;
            const existing = vfs.readFile(resolved);
            if (existing === null) vfs.writeFile(resolved, '');
          }
          return null;
        }

        if (command === 'cat') {
          const paths = args.slice(1);
          if (paths.length === 0 && pipeInput) return pipeInput;
          if (paths.length === 0) return 'cat: missing operand';
          const results: string[] = [];
          for (const p of paths) {
            const resolved = this.safeResolvePath(p);
            if (!resolved) {
              results.push(`cat: ${p}: invalid path`);
              continue;
            }
            const content = vfs.readFile(resolved);
            if (content === null) results.push(`cat: ${p}: No such file`);
            else results.push(content);
          }
          return results.join('\n');
        }

        if (command === 'echo') {
          const text = args.slice(1).join(' ')
            .replace(/\$([A-Z_]+)/g, (_, key) => this.shell.env[key] || '')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t');
          return text;
        }

        if (command === 'cp') {
          if (args.length < 3) return 'cp: missing operand';
          const srcArg = args[1];
          const destArg = args[2];
          if (!srcArg || !destArg) return 'cp: missing operand';
          const src = this.safeResolvePath(srcArg);
          const dest = this.safeResolvePath(destArg);
          if (!src || !dest) return 'cp: invalid path';
          const content = vfs.readFile(src);
          if (content === null) return `cp: ${args[1]}: No such file`;
          vfs.writeFile(dest, content);
          return null;
        }

        if (command === 'mv') {
          if (args.length < 3) return 'mv: missing operand';
          const srcArg = args[1];
          const destArg = args[2];
          if (!srcArg || !destArg) return 'mv: missing operand';
          const src = this.safeResolvePath(srcArg);
          const dest = this.safeResolvePath(destArg);
          if (!src || !dest) return 'mv: invalid path';
          const content = vfs.readFile(src);
          if (content === null) return `mv: ${args[1]}: No such file`;
          vfs.writeFile(dest, content);
          vfs.delete(src);
          return null;
        }

        if (command === 'rm') {
          const paths = args.filter(a => a !== 'rm' && !a.startsWith('-'));
          if (paths.length === 0) return 'rm: missing operand';
          for (const p of paths) {
            const resolved = this.safeResolvePath(p);
            if (!resolved) continue;
            const success = vfs.delete(resolved);
            if (!success) return `rm: ${p}: No such file or directory`;
          }
          return null;
        }

        if (command === 'head') {
          const nFlag = args.indexOf('-n');
          const linesArg = nFlag >= 0 ? args[nFlag + 1] : undefined;
          const lines = linesArg ? parseInt(linesArg) || 10 : 10;
          const filePath = args.find(a => a !== 'head' && a !== '-n' && !(/^\d+$/.test(a)));
          const content = filePath ? vfs.readFile(this.safeResolvePath(filePath)) : pipeInput;
          if (!content) return 'head: no input';
          return content.split('\n').slice(0, lines).join('\n');
        }

        if (command === 'tail') {
          const nFlag = args.indexOf('-n');
          const linesArg = nFlag >= 0 ? args[nFlag + 1] : undefined;
          const lines = linesArg ? parseInt(linesArg) || 10 : 10;
          const filePath = args.find(a => a !== 'tail' && a !== '-n' && !(/^\d+$/.test(a)));
          const content = filePath ? vfs.readFile(this.safeResolvePath(filePath)) : pipeInput;
          if (!content) return 'tail: no input';
          return content.split('\n').slice(-lines).join('\n');
        }

        if (command === 'wc') {
          const filePath = args.find(a => a !== 'wc' && !a.startsWith('-'));
          const content = filePath ? vfs.readFile(this.safeResolvePath(filePath)) : pipeInput;
          if (!content) return 'wc: no input';
          const lineCount = content.split('\n').length;
          const wordCount = content.split(/\s+/).filter(Boolean).length;
          const charCount = content.length;
          const name = filePath || '(stdin)';
          return `  ${lineCount}  ${wordCount}  ${charCount} ${name}`;
        }

        if (command === 'grep') {
          const caseInsensitive = args.includes('-i');
          const showLineNum = args.includes('-n');
          const filteredArgs = args.filter(a => a !== 'grep' && !a.startsWith('-'));
          const pattern = filteredArgs[0];
          const filePath = filteredArgs[1];
          if (!pattern) return 'grep: missing pattern';
          
          const content = filePath ? vfs.readFile(this.safeResolvePath(filePath)) : pipeInput;
          if (!content) return 'grep: no input';
          
          const lines = content.split('\n');
          const results: string[] = [];
          const safePattern = clampText(pattern, MAX_GREP_PATTERN_LENGTH);
          const regex = new RegExp(safePattern, caseInsensitive ? 'i' : '');
          lines.forEach((line, i) => {
            if (regex.test(line)) {
              results.push(showLineNum ? `${i + 1}:${line}` : line);
            }
          });
          return results.length > 0 ? results.join('\n') : `(no matches for "${safePattern}")`;
        }

        if (command === 'find') {
          const startPath = this.safeResolvePath(args[1] || '.');
          if (!startPath) return 'find: invalid path';
          const nameIdx = args.indexOf('-name');
          const pattern = nameIdx >= 0 ? args[nameIdx + 1]?.replace(/\*/g, '.*') : null;
          const results: string[] = [];
          
          const searchRecursive = (dir: string) => {
            const items = vfs.listDir(dir) || [];
            for (const item of items) {
              const fullPath = `${dir}/${item}`;
              if (!pattern || new RegExp(pattern, 'i').test(item)) {
                results.push(fullPath);
              }
              const stat = vfs.stat(fullPath);
              if (stat?.type === 'directory') searchRecursive(fullPath);
            }
          };
          searchRecursive(startPath);
          return results.length > 0 ? results.join('\n') : '(no results)';
        }

        if (command === 'tree') {
          const targetPath = this.safeResolvePath(args[1] || '.');
          if (!targetPath) return 'tree: invalid path';
          const buildTree = (dir: string, prefix: string = ''): string => {
            const items = vfs.listDir(dir) || [];
            return items.map((item, i) => {
              const isLast = i === items.length - 1;
              const connector = isLast ? '└── ' : '├── ';
              const nextPrefix = isLast ? '    ' : '│   ';
              const fullPath = `${dir}/${item}`;
              const stat = vfs.stat(fullPath);
              let line = `${prefix}${connector}${item}`;
              if (stat?.type === 'directory') {
                line += '/\n' + buildTree(fullPath, prefix + nextPrefix);
              }
              return line;
            }).join('\n');
          };
          const dirName = targetPath.split('/').pop() || targetPath;
          return `${dirName}/\n${buildTree(targetPath)}`;
        }

        if (command === 'chmod') {
          return `chmod: permissions updated (VFS simulated)`;
        }

        if (command === 'diff') {
          if (args.length < 3) return 'diff: missing operands';
          const leftArg = args[1];
          const rightArg = args[2];
          if (!leftArg || !rightArg) return 'diff: missing operands';
          const contentA = vfs.readFile(this.safeResolvePath(leftArg)) || '';
          const contentB = vfs.readFile(this.safeResolvePath(rightArg)) || '';
          if (contentA === contentB) return 'Files are identical.';
          const linesA = contentA.split('\n');
          const linesB = contentB.split('\n');
          const result: string[] = [`--- ${args[1]}`, `+++ ${args[2]}`];
          const maxLen = Math.max(linesA.length, linesB.length);
          for (let i = 0; i < maxLen; i++) {
            if (linesA[i] !== linesB[i]) {
              if (linesA[i]) result.push(`- ${linesA[i]}`);
              if (linesB[i]) result.push(`+ ${linesB[i]}`);
            }
          }
          return result.join('\n');
        }

        if (command === 'sysinfo') {
          const apps = os.registry.length;
          const wins = os.windows.length;
          const procs = processManager.count();
          const totalMem = processManager.getTotalMemory();
          return `╔══════════════════════════════════════╗
║       NEXUS SYSTEM INFORMATION       ║
╚══════════════════════════════════════╝
  Kernel:     NexusOS v2.0
  Shell:      NXSH (DAEMON Commander v2)
  Hostname:   ${this.shell.env.USER}@nexus
  Uptime:     ${Math.floor(performance.now() / 1000)}s
  Registry:   ${apps} modules
  Active:     ${wins} windows / ${procs} processes
  Memory:     ${Math.round(totalMem / 1024)}MB estimated
  AI Model:   ${kernelRules.modelId}
  Autonomy:   ${kernelRules.autonomyEnabled ? 'ACTIVE' : 'SUSPENDED'}
  VFS Root:   ${this.shell.cwd}`;
        }

        if (command === 'whoami') {
          return this.shell.env.USER || 'daemon';
        }

        if (command === 'hostname') {
          return 'nexus';
        }

        if (command === 'uptime') {
          const seconds = Math.floor(performance.now() / 1000);
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          const s = seconds % 60;
          return `up ${h}h ${m}m ${s}s, ${os.windows.length} windows, load: ${processManager.count()} processes`;
        }

        if (command === 'date') {
          return new Date().toString();
        }

        if (command === 'ps') {
          const procs = processManager.listAll();
          if (procs.length === 0) return 'No active processes.';
          const header = 'PID    STATE      MEM(KB)  UPTIME    NAME';
          const lines = procs.map(p =>
            `${String(p.pid).padEnd(7)}${p.state.padEnd(11)}${String(p.memoryEstimate).padEnd(9)}${processManager.getUptime(p.windowId).padEnd(10)}${p.name}`
          );
          return header + '\n' + lines.join('\n');
        }

        if (command === 'kill') {
          const target = args[1];
          if (!target) return 'kill: missing PID or window ID';
          const pid = parseInt(target);
          const procs = processManager.listAll();
          const proc = procs.find(p => p.pid === pid || p.windowId === target);
          if (proc) {
            os.closeWindow(proc.windowId);
            return `Killed process ${proc.pid} (${proc.name})`;
          }
          return `kill: (${target}): No such process`;
        }

        if (command === 'clear') {
          return '\x1B[CLEAR]';
        }

        if (command === 'df') {
          let used = 0;
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) used += (localStorage.getItem(key) || '').length;
            }
          } catch {}
          const usedKB = Math.round(used / 1024);
          const totalKB = 5120;
          return `Filesystem     Size   Used   Avail  Use%  Mounted on
VFS-localStorage  ${totalKB}K  ${usedKB}K   ${totalKB - usedKB}K   ${Math.round(usedKB / totalKB * 100)}%   /`;
        }

        if (command === 'du') {
          const targetPath = this.safeResolvePath(args[1] || '.');
          if (!targetPath) return 'du: invalid path';
          const measure = (dir: string): number => {
            const items = vfs.listDir(dir) || [];
            let size = 0;
            for (const item of items) {
              const fp = `${dir}/${item}`;
              const stat = vfs.stat(fp);
              if (stat?.type === 'directory') {
                size += measure(fp);
              } else {
                const content = vfs.readFile(fp);
                size += content?.length || 0;
              }
            }
            return size;
          };
          const totalSize = measure(targetPath);
          return `${Math.round(totalSize / 1024)}K\t${targetPath}`;
        }

        if (command === 'env') {
          return Object.entries(this.shell.env)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');
        }

        if (command === 'export') {
          const assignment = args.slice(1).join(' ');
          const eqIdx = assignment.indexOf('=');
          if (eqIdx <= 0) return 'export: usage: export KEY=VALUE';
          const key = assignment.slice(0, eqIdx);
          const value = assignment.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
          this.shell.env[key] = value;
          this.persistShellState();
          return null;
        }

        if (command === 'alias') {
          if (args.length === 1) {
            return Object.entries(this.shell.aliases)
              .map(([k, v]) => `alias ${k}='${v}'`)
              .join('\n');
          }
          const assignment = args.slice(1).join(' ');
          const eqIdx = assignment.indexOf('=');
          if (eqIdx <= 0) return 'alias: usage: alias name=command';
          const name = assignment.slice(0, eqIdx);
          const value = assignment.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
          this.shell.aliases[name] = value;
          this.persistShellState();
          return `alias ${name}='${value}'`;
        }

        if (command === 'history') {
          const count = args[1] ? parseInt(args[1]) || 20 : 20;
          const recent = this.shell.history.slice(-count);
          return recent.map((cmd, i) => `  ${this.shell.history.length - recent.length + i + 1}  ${cmd}`).join('\n');
        }

        if (command === 'inspect') {
            const file = args[1];
            if (!file) return 'Usage: inspect <filename>';
            const path = this.safeResolvePath(file);
            const content = path ? vfs.readFile(path) : null;
            if (content !== null && path) {
                if (log) log(`[ROUTING] Opening ${path} in Notepad for analysis.`, 'out');
                os.openWindow('notepad', { path, content });
                return null;
            }
            return 'Target module not found.';
        }

        if (command === 'write') {
            if (args.length < 3) return 'Usage: write <path> "content"';
            const inspectTarget = args[1];
            const path = inspectTarget ? this.safeResolvePath(inspectTarget) : '';
            const content = args.slice(2).join(' ').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
            if (!path) return 'VFS: invalid path';
            const success = vfs.writeFile(path, content);
            return success ? `VFS: Sync successful at ${path}` : `VFS: Sync failure`;
        }

        if (['forge', 'build', 'create', 'make'].includes(command) && args.length > 1) {
            const firstSpace = raw.indexOf(' ');
            const promptText = raw.substring(firstSpace + 1).trim().replace(/^['"]|['"]$/g, '');
            if (log) log(`[MANIFESTING] Initiating Forge Synthesis Pipeline: "${promptText}"`, 'out');
            os.openWindow('forge', { autoPrompt: promptText, autoRun: true, mode: 'coder' });
            return null;
        }

        if (command === 'close') {
            const targetId = args[1] || os.activeWindowId;
            if (targetId) os.closeWindow(targetId);
            return null;
        }

        if (command === 'open') {
          const appId = args[1];
          if (!appId) return 'Usage: open <appId>';
          os.openWindow(appId);
          return null;
        }

        if (command === 'help' || command === 'man') {
          return `╔══════════════════════════════════════════╗
║    NXSH — DAEMON COMMANDER v2.0 HELP     ║
╚══════════════════════════════════════════╝

 FILE SYSTEM
  ls [-la] [path]      List directory contents
  cd <path>            Change directory
  pwd                  Print working directory
  mkdir [-p] <path>    Create directory
  touch <file>         Create empty file
  cat <file>           Display file contents
  cp <src> <dest>      Copy file
  mv <src> <dest>      Move/rename file
  rm [-rf] <path>      Remove file/directory
  head [-n N] <file>   Show first N lines
  tail [-n N] <file>   Show last N lines
  grep [-in] <pat> <f> Search in files
  find <path> -name <p>Find files by name
  tree [path]          Show directory tree
  diff <f1> <f2>       Compare two files
  wc <file>            Count lines/words/chars
  df                   Show disk usage
  du [path]            Directory size

 SYSTEM
  sysinfo              Full system information
  ps                   List processes
  kill <PID>           Kill a process
  uptime               System uptime
  whoami               Current user
  hostname             System hostname
  date                 Current date/time
  clear                Clear terminal

 ENVIRONMENT
  env                  Show all variables
  export KEY=VALUE     Set variable
  alias [name=cmd]     Manage aliases
  history [N]          Command history

 OS CONTROL
  open <appId>         Open an application
  close [windowId]     Close a window
  inspect <file>       Open file in editor
  write <path> "text"  Write to VFS
  build "desc"         Build app with NeuralForge

 OPERATORS
  cmd1 | cmd2          Pipe output
  cmd > file           Redirect (overwrite)
  cmd >> file          Redirect (append)

 Type any natural language for DAEMON AI.`;
        }

        try {
            let fullBuffer = "";
            let toolTriggered = false;
            if (onStream) {
                await aiService.streamChat(raw, kernelRules, (token) => {
                    fullBuffer += token;
                    const match = fullBuffer.match(/\[\[BUILD:\s*([\s\S]+?)\]\]/i);
                    if (match && !toolTriggered) {
                        toolTriggered = true;
                        const buildPrompt = match[1]?.trim();
                        if (buildPrompt) {
                            os.openWindow('forge', { autoPrompt: buildPrompt, autoRun: true, mode: 'coder' });
                        }
                    } else if (!toolTriggered) onStream(token);
                });
            } else {
                const res = await aiService.generateOnce(raw, kernelRules);
                return res;
            }
        } catch {
          return "Core link broken.";
        }
        return null;
    }

    public getCwd(): string { return this.shell.cwd; }
    public getHistory(): string[] { return [...this.shell.history]; }
    public getEnv(): Record<string, string> { return { ...this.shell.env }; }
    public getAliases(): Record<string, string> { return { ...this.shell.aliases }; }
}

export const commander = new Commander();
