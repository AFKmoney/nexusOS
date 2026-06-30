import { localBrain } from '../services/localBrain';
import { AIToolCall } from '../services/aiProviders';
import { parseOsActions, ParsedOsAction } from './osManifest';
import { useOS } from '../store/osStore';
import { commander } from './commander';
import { eventBus } from './eventBus';
import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';
import { memory } from './memory';
import { kernelLog } from './log';
import { skillForge } from './skillForge';
import { autoPilot } from './autoPilot';
import { agentOrchestrator } from './agentOrchestrator';

interface DaemonTool {
  name: string;
  description: string;
  code: string;
  createdAt: number;
}

const STORAGE_KEY = 'daemon_tools_v2';
const MAX_TOOL_NAME_LENGTH = 64;
const MAX_TOOL_DESCRIPTION_LENGTH = 256;
const MAX_TOOL_CODE_LENGTH = 50_000;
const MAX_EXECUTED_ARGS_LENGTH = 4_096;
const MAX_OS_ACTION_ARG_LENGTH = 2_048;
const SAFE_TOOL_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

type VfsModule = {
  writeFile: (path: string, content: string) => void;
  readFile: (path: string) => string | null;
  listDir: (path: string) => string[] | null;
  stat: (path: string) => { type?: 'directory' | 'file' | 'symlink' } | null | undefined;
  delete: (path: string) => boolean;
  moveToTrash: (path: string) => boolean;
  restoreFromTrash: (trashPath: string) => string | null;
  listTrash: () => { name: string; path: string; trashedAt: number | null }[];
};

type MemoryModule = {
  remember: (content: string, tags: string[]) => void;
};

async function getVfs(): Promise<VfsModule> {
  return {
    writeFile: (path: string, content: string) => vfs.writeFile(path, content, SYSTEM_VFS_APP_ID),
    readFile: (path: string) => vfs.readFile(path, SYSTEM_VFS_APP_ID),
    listDir: (path: string) => vfs.listDir(path, SYSTEM_VFS_APP_ID),
    stat: (path: string) => vfs.stat(path),
    delete: (path: string) => vfs.delete(path, SYSTEM_VFS_APP_ID),
    moveToTrash: (path: string) => vfs.moveToTrash(path),
    restoreFromTrash: (trashPath: string) => vfs.restoreFromTrash(trashPath),
    listTrash: () => vfs.listTrash(),
  };
}

async function getMemory(): Promise<MemoryModule> {
  return memory as MemoryModule;
}

function getArg(raw: unknown, fallback = ''): string {
  return typeof raw === 'string' ? raw : fallback;
}

function toStringArg(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isSafeToolName(name: string): boolean {
  return SAFE_TOOL_NAME.test(name) && name.length <= MAX_TOOL_NAME_LENGTH;
}

function clampLength(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function normalizeOsPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('/')) return '';
  if (trimmed.includes('\0')) return '';
  if (trimmed.includes('..')) return '';
  return trimmed.replace(/\/+/g, '/');
}

function sanitizeActionArg(value: string): string {
  return clampLength(value.trim(), MAX_OS_ACTION_ARG_LENGTH);
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

export class ToolForge {
  private tools: Map<string, DaemonTool> = new Map();
  private _osActionHandler: ((action: ParsedOsAction) => Promise<string>) | null = null;
  private _saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private _loadPromise: Promise<void>;

  constructor() {
    this._loadPromise = new Promise((resolve) => {
      const load = () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as DaemonTool[];
            for (const t of parsed) {
              if (t && isSafeToolName(t.name)) {
                this.tools.set(t.name, {
                  name: clampLength(t.name.trim(), MAX_TOOL_NAME_LENGTH),
                  description: clampLength(typeof t.description === 'string' ? t.description : '', MAX_TOOL_DESCRIPTION_LENGTH),
                  code: clampLength(typeof t.code === 'string' ? t.code : '', MAX_TOOL_CODE_LENGTH),
                  createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now()
                });
              }
            }
          }
        } catch {
        } finally {
          resolve();
        }
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(load);
      } else {
        setTimeout(load, 0);
      }
    });
  }

  public bindOsActions(handler: (action: ParsedOsAction) => Promise<string>) {
    this._osActionHandler = handler;
  }

  private ensureLoadedAsync(): Promise<void> {
    return this._loadPromise;
  }

  private save() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.tools.values())));
    }, 100);
  }

  private validateToolPayload(name: string, desc: string, code: string): boolean {
    return isSafeToolName(name) && desc.length <= MAX_TOOL_DESCRIPTION_LENGTH && code.length > 0 && code.length <= MAX_TOOL_CODE_LENGTH;
  }

  private extractSingleExpressionResult(code: string, scope: Record<string, unknown>): unknown {
    const trimmed = code.trim();
    if (!trimmed) return undefined;
    if (/[;{}=]/.test(trimmed)) {
      throw new Error('Tool code contains unsupported statements. Only single-expression tools are allowed.');
    }
    const argNames = Object.keys(scope);
    const argValues = Object.values(scope);
    const fn = new Function(...argNames, `return (${trimmed});`) as (...args: unknown[]) => unknown;
    return fn(...argValues);
  }

  public async parseAndRegister(text: string): Promise<boolean> {
    await this.ensureLoadedAsync();
    const rx = /```javascript\s*\/\/\s*@tool\s+([a-zA-Z0-9_]+)\s*\n\/\/\s*@desc\s+(.+)\n([\s\S]+?)```/g;
    let match: RegExpExecArray | null;
    let registered = false;
    while ((match = rx.exec(text)) !== null) {
      const name = match[1]?.trim() || '';
      const desc = clampLength(match[2]?.trim() || '', MAX_TOOL_DESCRIPTION_LENGTH);
      const code = clampLength(match[3]?.trim() || '', MAX_TOOL_CODE_LENGTH);
      if (!this.validateToolPayload(name, desc, code)) continue;
      this.tools.set(name, {
        name,
        description: desc,
        code,
        createdAt: Date.now()
      });
      registered = true;
    }
    if (registered) this.save();
    return registered;
  }

  public async getSystemToolContext(): Promise<string> {
    await this.ensureLoadedAsync();
    let ctx = '';
    if (this.tools.size > 0) {
      ctx += '\n\n[FORGED TOOLS — User-created, callable with <CALL_TOOL>]\n';
      for (const t of this.tools.values()) {
        ctx += `  • ${t.name}: ${t.description}\n`;
      }
    }
    const skillCtx = await skillForge.getSystemSkillContext();
    if (skillCtx) ctx += skillCtx;
    return ctx;
  }

  public async executeTool(name: string, argsString: string): Promise<string> {
    await this.ensureLoadedAsync();
    const toolName = name.trim();
    const t = this.tools.get(toolName);
    if (!t) return `[TOOL ERROR: Tool '${name}' not found. Define it first using // @tool syntax]`;

    if (!isSafeToolName(toolName)) {
      return `\n[TOOL ERROR: ${name}] → Invalid tool name format\n`;
    }

    if (argsString.length > MAX_EXECUTED_ARGS_LENGTH) {
      return `\n[TOOL ERROR: ${name}] → Arguments too long\n`;
    }

    try {
      const scope = {
        args: argsString,
        localBrain,
        commander,
        useOS,
        getVfs,
        getMemory,
        osAction: this._osActionHandler,
        readFile: async (path: string) => {
          const fs = await getVfs();
          return fs.readFile(normalizeOsPath(path));
        },
        writeFile: async (path: string, content: string) => {
          const fs = await getVfs();
          return fs.writeFile(normalizeOsPath(path), content);
        },
        listDir: async (path: string) => {
          const fs = await getVfs();
          return fs.listDir(normalizeOsPath(path));
        },
        emitEvent: (event: string, payload?: unknown) => {
          eventBus.emit(event, payload);
          return true;
        }
      } as const;

      const result = await Promise.resolve(this.extractSingleExpressionResult(t.code, scope as Record<string, unknown>));
      return `\n[TOOL_RESULT: ${name}] → ${safeJsonStringify(result)}\n`;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return `\n[TOOL ERROR: ${name}] → ${clampLength(message, 500)}\n`;
    }
  }

  public async executeOsActions(text: string): Promise<string> {
    const actions = parseOsActions(text);
    if (actions.length === 0) return '';

    const results: string[] = [];

    for (const action of actions) {
      let result = '';
      const actionArgs = Array.isArray(action.args) ? action.args : [];

      switch (action.type) {
        case 'OPEN_APP': {
          const [appIdRaw, filePathRaw = ''] = actionArgs as [unknown, unknown];
          const appId = toStringArg(appIdRaw).split(':')[0] || '';
          const filePath = clampLength(toStringArg(filePathRaw), MAX_OS_ACTION_ARG_LENGTH);
          if (appId) {
            if (this._osActionHandler) {
              result = await this._osActionHandler({ ...action, args: [appId, filePath] });
            } else {
              result = `[OS::OPEN_APP] → App "${appId}" queued (OS handler not bound yet)`;
            }
          }
          break;
        }

        case 'WRITE_FILE': {
          const path = normalizeOsPath(toStringArg(actionArgs[0]));
          const content = clampLength(toStringArg(actionArgs[1]), 100_000);
          if (path && content !== '') {
            const fs = await getVfs();
            fs.writeFile(path, content);
            const mem = await getMemory();
            mem.remember(`File written: ${path}`, ['file', 'vfs']);
            result = `[OS::WRITE_FILE] → ✅ ${path} saved (${content.length} chars)`;
          } else {
            result = `[OS::WRITE_FILE] → ⚠ Invalid args. Format: OS::WRITE_FILE:/path:content`;
          }
          break;
        }

        case 'READ_FILE': {
          const path = normalizeOsPath(toStringArg(actionArgs[0]));
          if (path) {
            const fs = await getVfs();
            const content = fs.readFile(path);
            result = content !== null
              ? `[OS::READ_FILE] → ${path}:\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``
              : `[OS::READ_FILE] → ⚠ File not found: ${path}`;
          } else {
            result = `[OS::READ_FILE] → ⚠ No path provided`;
          }
          break;
        }

        case 'NOTIFY': {
          const raw = getArg(actionArgs[0]);
          const [title = 'DAEMON', ...messageParts] = raw.split(':');
          const message = clampLength(messageParts.join(':') || raw, 512);
          if (this._osActionHandler) {
            result = await this._osActionHandler({ ...action, args: [sanitizeActionArg(title), message] });
          } else {
            result = `[OS::NOTIFY] → "${title}: ${message}"`;
          }
          break;
        }

        case 'REMEMBER': {
          const content = clampLength(toStringArg(action.args[0]), 4_096);
          if (content) {
            const mem = await getMemory();
            mem.remember(content, ['daemon', 'ai']);
            result = `[OS::REMEMBER] → ✅ Stored in persistent memory`;
          }
          break;
        }

        case 'SEARCH_FILES': {
          const query = clampLength(toStringArg(action.args[0]), 128);
          if (query) {
            const fs = await getVfs();
            const hits: string[] = [];
            const searchDir = (dir: string) => {
              const items = fs.listDir(dir) || [];
              items.forEach((name: string) => {
                const p = `${dir}/${name}`;
                const stat = fs.stat(p);
                if (stat?.type === 'directory') {
                  searchDir(p);
                  return;
                }
                const content = fs.readFile(p) || '';
                if (content.toLowerCase().includes(query.toLowerCase())) {
                  const lines = content.split('\n');
                  lines.forEach((line: string, i: number) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                      hits.push(`  ${p}:${i + 1} → ${line.trim().slice(0, 80)}`);
                    }
                  });
                }
              });
            };
            searchDir('/home/user');
            result = hits.length > 0
              ? `[OS::SEARCH_FILES: "${query}"] → ${hits.length} hits:\n${hits.slice(0, 20).join('\n')}`
              : `[OS::SEARCH_FILES: "${query}"] → No results found`;
          }
          break;
        }

        case 'CREATE_FOLDER': {
          const path = normalizeOsPath(toStringArg(action.args[0]));
          if (path) {
            const fs = await getVfs();
            fs.writeFile(`${path}/.keep`, '');
            result = `[OS::CREATE_FOLDER] → ✅ ${path} created`;
          }
          break;
        }

        case 'BUILD_APP': {
          const desc = clampLength(toStringArg(action.args[0]), 512);
          if (desc) {
            try {
              const { appGenerator } = await import('./appGenerator');
              const app = await appGenerator.generate(desc);
              result = `[OS::BUILD_APP] → ✅ Generated "${app.name}" with ${app.files.length} files at ${app.path}\nFiles:\n${app.files.map(f => `  • ${f}`).join('\n')}`;
            } catch (e: any) {
              result = `[OS::BUILD_APP] → ⚠ ${e?.message || 'Generation failed'}`;
            }
          }
          break;
        }

        case 'OPEN_URL': {
          const url = clampLength(toStringArg(action.args[0]), 2_048);
          if (this._osActionHandler) {
            result = await this._osActionHandler({ ...action, args: [url] });
          } else {
            result = `[OS::OPEN_URL] → NetRunner navigating to ${url}`;
          }
          break;
        }

        case 'EXECUTE_JS': {
          const code = clampLength(toStringArg(action.args[0]), 2_048);
          if (code) {
            try {
              const execResult = this.extractSingleExpressionResult(code, {});
              result = `[OS::EXECUTE_JS] → ${safeJsonStringify(execResult)}`;
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::EXECUTE_JS ERROR] → ${message}`;
            }
          }
          break;
        }

        case 'DELETE_FILE': {
          const path = normalizeOsPath(toStringArg(action.args[0]));
          if (path) {
            const fs = await getVfs();
            // Use moveToTrash instead of permanent delete — safer, and
            // the user can restore from the Recycle Bin app.
            const success = fs.moveToTrash(path);
            result = success
              ? `[OS::DELETE_FILE] → ✅ ${path} moved to Recycle Bin`
              : `[OS::DELETE_FILE] → ⚠ File not found: ${path}`;
          }
          break;
        }

        case 'MOVE_FILE': {
          const rawArgs = getArg(action.args[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const src = normalizeOsPath(rawArgs.slice(0, colonIdx));
            const dest = normalizeOsPath(rawArgs.slice(colonIdx + 1));
            const fs = await getVfs();
            const content = fs.readFile(src);
            if (content !== null) {
              fs.writeFile(dest, content);
              fs.delete(src);
              const mem = await getMemory();
              mem.remember(`File moved: ${src} → ${dest}`, ['file', 'vfs']);
              result = `[OS::MOVE_FILE] → ✅ ${src} → ${dest}`;
            } else {
              result = `[OS::MOVE_FILE] → ⚠ Source not found: ${src}`;
            }
          } else {
            result = `[OS::MOVE_FILE] → ⚠ Format: OS::MOVE_FILE:/src/path:/dest/path`;
          }
          break;
        }

        case 'COPY_FILE': {
          const rawArgs = getArg(action.args[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const src = normalizeOsPath(rawArgs.slice(0, colonIdx));
            const dest = normalizeOsPath(rawArgs.slice(colonIdx + 1));
            const fs = await getVfs();
            const content = fs.readFile(src);
            if (content !== null) {
              fs.writeFile(dest, content);
              result = `[OS::COPY_FILE] → ✅ ${src} copied to ${dest}`;
            } else {
              result = `[OS::COPY_FILE] → ⚠ Source not found: ${src}`;
            }
          } else {
            result = `[OS::COPY_FILE] → ⚠ Format: OS::COPY_FILE:/src/path:/dest/path`;
          }
          break;
        }

        case 'LIST_DIR': {
          const path = normalizeOsPath(toStringArg(action.args[0])) || '/home/user';
          const fs = await getVfs();
          const items = fs.listDir(path) || [];
          if (items.length > 0) {
            const listing = items.map((item: string) => {
              const stat = fs.stat(`${path}/${item}`);
              return stat?.type === 'directory' ? `📁 ${item}/` : `📄 ${item}`;
            }).join('\n');
            result = `[OS::LIST_DIR: ${path}]\n${listing}`;
          } else {
            result = `[OS::LIST_DIR: ${path}] → (empty directory)`;
          }
          break;
        }

        case 'CLOSE_APP': {
          const windowIdOrAppId = sanitizeActionArg(toStringArg(actionArgs[0]));
          if (windowIdOrAppId) {
            const osState = useOS.getState();
            const win = osState.windows.find((w) => w.id === windowIdOrAppId || w.appId === windowIdOrAppId);
            if (win) {
              osState.closeWindow(win.id);
              result = `[OS::CLOSE_APP] → ✅ Closed ${win.title}`;
            } else {
              result = `[OS::CLOSE_APP] → ⚠ Window not found: ${windowIdOrAppId}`;
            }
          }
          break;
        }

        case 'FOCUS_APP': {
          const appId = sanitizeActionArg(toStringArg(actionArgs[0]));
          if (appId) {
            const osState = useOS.getState();
            const win = osState.windows.find((w) => w.appId === appId);
            if (win) {
              osState.focusWindow(win.id);
              result = `[OS::FOCUS_APP] → ✅ Focused ${win.title}`;
            } else {
              osState.openWindow(appId);
              result = `[OS::FOCUS_APP] → ✅ Opened and focused ${appId}`;
            }
          }
          break;
        }

        case 'MINIMIZE_ALL': {
          const osState = useOS.getState();
          osState.windows.forEach((w) => {
            if (!w.isMinimized) osState.minimizeWindow(w.id);
          });
          result = `[OS::MINIMIZE_ALL] → ✅ All ${osState.windows.length} windows minimized`;
          break;
        }

        case 'SET_WALLPAPER': {
          const wallpaperId = sanitizeActionArg(toStringArg(actionArgs[0]));
          if (wallpaperId) {
            useOS.getState().setWallpaper(wallpaperId);
            result = `[OS::SET_WALLPAPER] → ✅ Wallpaper set to ${wallpaperId}`;
          }
          break;
        }

        case 'RUN_COMMAND': {
          const cmd = clampLength(toStringArg(actionArgs[0]), 2_048);
          if (cmd) {
            const output: string[] = [];
            await commander.execute(
              cmd,
              (text, type) => {
                if (type === 'out') output.push(text);
              },
              useOS.getState().kernelRules
            );
            result = `[OS::RUN_COMMAND: ${cmd}]\n${output.join('\n')}`;
          }
          break;
        }

        case 'RUN_NATIVE': {
          const cmd = clampLength(toStringArg(actionArgs[0]), 512);
          if (cmd && window.electron && window.electron.invoke) {
            try {
              const res = await window.electron.invoke('native-exec', cmd);
              if (res.success) {
                result = `[OS::RUN_NATIVE: ${cmd}] SUCCESS\nSTDOUT: ${res.stdout}\nSTDERR: ${res.stderr}`;
              } else {
                result = `[OS::RUN_NATIVE: ${cmd}] ERROR\n${res.error || res.stderr}`;
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              result = `[OS::RUN_NATIVE: ${cmd}] IPC ERROR: ${message}`;
            }
          } else {
            result = `[OS::RUN_NATIVE: ${cmd}] FAILED: Native execution unavailable (Electron IPC required).`;
          }
          break;
        }

        case 'SCHEDULE_TASK': {
          const rawArgs = getArg(actionArgs[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const interval = parseInt(rawArgs.slice(0, colonIdx));
            const cmd = clampLength(rawArgs.slice(colonIdx + 1), 2_048);
            if (interval > 0 && cmd) {
              const { cronScheduler } = await import('./cronScheduler');
              const jobId = cronScheduler.register(`daemon_task_${Date.now()}`, { intervalMs: interval * 1000 }, `OS::RUN_COMMAND:${cmd}`);
              result = `[OS::SCHEDULE_TASK] → ✅ Task scheduled every ${interval}s (job: ${jobId})`;
            }
          } else {
            result = `[OS::SCHEDULE_TASK] → ⚠ Format: OS::SCHEDULE_TASK:<seconds>:<command>`;
          }
          break;
        }

        case 'EMIT_EVENT': {
          const rawArgs = getArg(actionArgs[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const event = sanitizeActionArg(rawArgs.slice(0, colonIdx));
            const data = rawArgs.slice(colonIdx + 1);
            try {
              eventBus.emit(event, JSON.parse(data));
            } catch {
              eventBus.emit(event, data);
            }
            result = `[OS::EMIT_EVENT] → ✅ Event "${event}" emitted`;
          }
          break;
        }

        case 'BROWSE_NAVIGATE': {
          const url = clampLength(toStringArg(actionArgs[0]), 2_048);
          if (url) {
            try {
              const { browserBridge } = await import('./browserBridge');
              await browserBridge.navigate(url);
              result = `[OS::BROWSE_NAVIGATE] → ✅ Navigating to ${url}`;
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::BROWSE_NAVIGATE] → ⚠ ${message}`;
            }
          }
          break;
        }

        case 'BROWSE_BACK': {
          try {
            const { browserBridge } = await import('./browserBridge');
            await browserBridge.back();
            result = `[OS::BROWSE_BACK] → ✅ Navigated back`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::BROWSE_BACK] → ⚠ ${message}`;
          }
          break;
        }

        case 'BROWSE_FORWARD': {
          try {
            const { browserBridge } = await import('./browserBridge');
            await browserBridge.forward();
            result = `[OS::BROWSE_FORWARD] → ✅ Navigated forward`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::BROWSE_FORWARD] → ⚠ ${message}`;
          }
          break;
        }

        case 'BROWSE_RELOAD': {
          try {
            const { browserBridge } = await import('./browserBridge');
            await browserBridge.reload();
            result = `[OS::BROWSE_RELOAD] → ✅ Page reloaded`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::BROWSE_RELOAD] → ⚠ ${message}`;
          }
          break;
        }

        case 'BROWSE_EXTRACT': {
          // Optional first arg = CSS selector (default: 'body')
          // Optional second arg = max chars (default: 8000)
          const selector = clampLength(toStringArg(actionArgs[0] ?? 'body'), 256) || 'body';
          const maxCharsArg = parseInt(toStringArg(actionArgs[1] ?? '8000'), 10);
          const maxChars = Number.isFinite(maxCharsArg) && maxCharsArg > 0 ? Math.min(maxCharsArg, 50_000) : 8000;
          try {
            const { browserBridge } = await import('./browserBridge');
            const extracted = await browserBridge.extract(selector, maxChars);
            result = `[OS::BROWSE_EXTRACT: ${selector}] → URL: ${extracted.url}\nTITLE: ${extracted.title}\nTEXT (${extracted.text.length} chars):\n${extracted.text.slice(0, maxChars)}\nLINKS: ${extracted.links.slice(0, 20).map(l => l.href).join(' | ') || '(none)'}`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::BROWSE_EXTRACT] → ⚠ ${message}`;
          }
          break;
        }

        case 'BROWSE_CLICK': {
          const selector = clampLength(toStringArg(actionArgs[0]), 256);
          if (selector) {
            try {
              const { browserBridge } = await import('./browserBridge');
              await browserBridge.click(selector);
              result = `[OS::BROWSE_CLICK: ${selector}] → ✅ Clicked`;
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::BROWSE_CLICK: ${selector}] → ⚠ ${message}`;
            }
          }
          break;
        }

        case 'BROWSE_INPUT': {
          // Format: OS::BROWSE_INPUT:<selector>:<value>
          // The selector is the first colon-delimited token; the value is
          // everything after (so values can contain colons).
          const rawArgs = getArg(actionArgs[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const selector = clampLength(rawArgs.slice(0, colonIdx), 256);
            const value = clampLength(rawArgs.slice(colonIdx + 1), 4_096);
            if (selector && value) {
              try {
                const { browserBridge } = await import('./browserBridge');
                await browserBridge.input(selector, value);
                result = `[OS::BROWSE_INPUT: ${selector}] → ✅ Input "${value.slice(0, 50)}${value.length > 50 ? '…' : ''}"`;
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                result = `[OS::BROWSE_INPUT: ${selector}] → ⚠ ${message}`;
              }
            }
          } else {
            result = `[OS::BROWSE_INPUT] → ⚠ Format: OS::BROWSE_INPUT:<selector>:<value>`;
          }
          break;
        }

        case 'BROWSE_SCROLL': {
          // Format: OS::BROWSE_SCROLL:<deltaX>:<deltaY> (pixels, can be negative)
          const rawArgs = getArg(actionArgs[0], '');
          const parts = rawArgs.split(':');
          const deltaX = parseInt(parts[0] ?? '0', 10) || 0;
          const deltaY = parseInt(parts[1] ?? '0', 10) || 0;
          try {
            const { browserBridge } = await import('./browserBridge');
            await browserBridge.scroll(deltaX, deltaY);
            result = `[OS::BROWSE_SCROLL] → ✅ Scrolled by (${deltaX}, ${deltaY})`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::BROWSE_SCROLL] → ⚠ ${message}`;
          }
          break;
        }

        case 'BROWSE_STATE': {
          try {
            const { browserBridge } = await import('./browserBridge');
            const state = browserBridge.getState();
            result = `[OS::BROWSE_STATE] → URL: ${state.url || '(none)'} | TITLE: ${state.title || '(none)'} | LOADING: ${state.isLoading} | CAN_BACK: ${state.canGoBack} | CAN_FWD: ${state.canGoForward} | NATIVE: ${state.isNative}`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::BROWSE_STATE] → ⚠ ${message}`;
          }
          break;
        }

        // ─── Phase 1: Web search ───────────────────────────────────
        case 'WEB_SEARCH': {
          const query = clampLength(toStringArg(actionArgs[0]), 500);
          if (query) {
            try {
              const { webSearch } = await import('./webSearch');
              const results = await webSearch.search(query);
              result = `[OS::WEB_SEARCH: "${query}"] → ${results.length} results:\n${webSearch.formatResults(results)}`;
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::WEB_SEARCH] → ⚠ ${message}`;
            }
          }
          break;
        }

        // ─── Phase 1: Code execution ───────────────────────────────
        case 'EXEC_CODE': {
          // Format: OS::EXEC_CODE:<lang>:<code>
          const rawArgs = getArg(actionArgs[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const lang = clampLength(rawArgs.slice(0, colonIdx), 32);
            const code = clampLength(rawArgs.slice(colonIdx + 1), 10_000);
            if (lang && code) {
              try {
                const { codeExecutor } = await import('./codeExecution');
                const execResult = await codeExecutor.execute(lang, code);
                result = `[OS::EXEC_CODE: ${lang}] → ${execResult.success ? 'SUCCESS' : 'FAILED'} (${execResult.durationMs}ms)\nSTDOUT:\n${execResult.stdout}\n${execResult.stderr ? 'STDERR:\n' + execResult.stderr : ''}`;
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                result = `[OS::EXEC_CODE: ${lang}] → ⚠ ${message}`;
              }
            }
          } else {
            result = `[OS::EXEC_CODE] → ⚠ Format: OS::EXEC_CODE:<lang>:<code>`;
          }
          break;
        }

        // ─── Phase 1: Git operations ───────────────────────────────
        case 'GIT_INIT': {
          const repoPath = normalizeOsPath(toStringArg(actionArgs[0]));
          if (repoPath) {
            const { gitKernel } = await import('./git');
            result = `[OS::GIT_INIT] → ${await gitKernel.init(repoPath)}`;
          }
          break;
        }
        case 'GIT_ADD': {
          const rawArgs = getArg(actionArgs[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const { gitKernel } = await import('./git');
            const repoPath = normalizeOsPath(rawArgs.slice(0, colonIdx));
            const filepath = rawArgs.slice(colonIdx + 1);
            result = `[OS::GIT_ADD] → ${await gitKernel.add(repoPath, filepath)}`;
          }
          break;
        }
        case 'GIT_ADD_ALL': {
          const repoPath = normalizeOsPath(toStringArg(actionArgs[0]));
          if (repoPath) {
            const { gitKernel } = await import('./git');
            result = `[OS::GIT_ADD_ALL] → ${await gitKernel.addAll(repoPath)}`;
          }
          break;
        }
        case 'GIT_COMMIT': {
          const rawArgs = getArg(actionArgs[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const { gitKernel } = await import('./git');
            const repoPath = normalizeOsPath(rawArgs.slice(0, colonIdx));
            const message = rawArgs.slice(colonIdx + 1);
            const os = useOS.getState();
            const author = {
              name: os.currentUser?.name || 'NexusOS AI',
              email: `${os.currentUser?.id || 'ai'}@nexusos.local`,
            };
            result = `[OS::GIT_COMMIT] → ${await gitKernel.commit(repoPath, message, author)}`;
          }
          break;
        }
        case 'GIT_LOG': {
          const repoPath = normalizeOsPath(toStringArg(actionArgs[0]));
          if (repoPath) {
            const { gitKernel } = await import('./git');
            result = `[OS::GIT_LOG]\n${await gitKernel.log(repoPath)}`;
          }
          break;
        }
        case 'GIT_DIFF': {
          const repoPath = normalizeOsPath(toStringArg(actionArgs[0]));
          if (repoPath) {
            const { gitKernel } = await import('./git');
            result = `[OS::GIT_DIFF]\n${await gitKernel.diff(repoPath)}`;
          }
          break;
        }
        case 'GIT_STATUS': {
          const repoPath = normalizeOsPath(toStringArg(actionArgs[0]));
          if (repoPath) {
            const { gitKernel } = await import('./git');
            result = `[OS::GIT_STATUS]\n${await gitKernel.status(repoPath)}`;
          }
          break;
        }
        case 'GIT_BRANCH': {
          const repoPath = normalizeOsPath(toStringArg(actionArgs[0]));
          if (repoPath) {
            const { gitKernel } = await import('./git');
            result = `[OS::GIT_BRANCH] → ${await gitKernel.branch(repoPath)}`;
          }
          break;
        }
        case 'GIT_CHECKOUT': {
          const rawArgs = getArg(actionArgs[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const { gitKernel } = await import('./git');
            const repoPath = normalizeOsPath(rawArgs.slice(0, colonIdx));
            const ref = rawArgs.slice(colonIdx + 1);
            result = `[OS::GIT_CHECKOUT] → ${await gitKernel.checkout(repoPath, ref)}`;
          }
          break;
        }

        // ─── Phase 2: Multi-agent + vision + voice ─────────────────
        case 'SPAWN_AGENT': {
          const goal = clampLength(toStringArg(actionArgs[0]), 2000);
          if (goal) {
            try {
              result = `[OS::SPAWN_AGENT] → Agent orchestrator launched for: "${goal}". Task running in background. Results will appear in the audit log.`;
              // Run in background — don't block the response
              void agentOrchestrator.run(goal).catch(e => {
                const msg = e instanceof Error ? e.message : String(e);
                kernelLog.error('[Agent] Background task failed:', msg);
              });
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::SPAWN_AGENT] → ⚠ ${message}`;
            }
          }
          break;
        }
        case 'ANALYZE_SCREEN': {
          const question = clampLength(toStringArg(actionArgs[0] ?? ''), 500) || undefined;
          try {
            const { vision } = await import('./vision');
            const { screenshot, analysis } = await vision.captureAndAnalyze(question);
            if (!screenshot) {
              result = `[OS::ANALYZE_SCREEN] → ⚠ Could not capture screen`;
            } else if (!analysis) {
              result = `[OS::ANALYZE_SCREEN] → ⚠ Could not analyze screenshot`;
            } else {
              result = `[OS::ANALYZE_SCREEN] → ${analysis.description}${analysis.suggestedActions.length > 0 ? '\nSuggested actions: ' + analysis.suggestedActions.join(', ') : ''}`;
            }
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::ANALYZE_SCREEN] → ⚠ ${message}`;
          }
          break;
        }
        case 'SPEAK': {
          const text = clampLength(toStringArg(actionArgs[0]), 1000);
          if (text) {
            try {
              const { voice } = await import('./voice');
              await voice.speak(text);
              result = `[OS::SPEAK] → ✅ Spoke: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`;
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::SPEAK] → ⚠ ${message}`;
            }
          }
          break;
        }
        case 'LISTEN': {
          try {
            const { voice } = await import('./voice');
            const transcript = await voice.listen(10000);
            result = `[OS::LISTEN] → Heard: "${transcript}"`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::LISTEN] → ⚠ ${message}`;
          }
          break;
        }

        // ─── Phase 3: RAG ──────────────────────────────────────────
        case 'INDEX_DOCS': {
          const path = normalizeOsPath(toStringArg(actionArgs[0]));
          if (path) {
            try {
              const { rag } = await import('./rag');
              const stat = (await getVfs()).stat(path);
              if (stat?.type === 'directory') {
                const count = await rag.indexVfsDirectory(path);
                result = `[OS::INDEX_DOCS] → ✅ Indexed ${count} files from ${path}`;
              } else {
                const doc = await rag.indexVfsFile(path);
                result = doc
                  ? `[OS::INDEX_DOCS] → ✅ Indexed ${path} (${doc.chunks.length} chunks)`
                  : `[OS::INDEX_DOCS] → ⚠ File not found: ${path}`;
              }
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::INDEX_DOCS] → ⚠ ${message}`;
            }
          }
          break;
        }
        case 'SEARCH_RAG': {
          const query = clampLength(toStringArg(actionArgs[0]), 500);
          if (query) {
            try {
              const { rag } = await import('./rag');
              const context = await rag.query(query);
              result = context
                ? `[OS::SEARCH_RAG: "${query}"] → Found relevant context:\n${context}`
                : `[OS::SEARCH_RAG: "${query}"] → No relevant documents found. Use OS::INDEX_DOCS to index files first.`;
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::SEARCH_RAG] → ⚠ ${message}`;
            }
          }
          break;
        }

        // ─── Phase 5: Self-evolution + cluster ─────────────────────
        case 'SELF_EVOLVE': {
          // Format: OS::SELF_EVOLVE:<json-patches>:<rationale>
          // The patches arg is a JSON array of CodePatch objects.
          const rawArgs = getArg(actionArgs[0], '');
          const colonIdx = rawArgs.indexOf(':');
          if (colonIdx > 0) {
            const patchesJson = rawArgs.slice(0, colonIdx);
            const rationale = rawArgs.slice(colonIdx + 1);
            try {
              const patches = JSON.parse(patchesJson);
              if (!Array.isArray(patches) || patches.length === 0) {
                result = `[OS::SELF_EVOLVE] → ⚠ Patches must be a non-empty JSON array`;
                break;
              }
              const { selfEvolution } = await import('./selfEvolution');
              const proposal = await selfEvolution.propose(patches, rationale);
              result = `[OS::SELF_EVOLVE] → Proposal ${proposal.id}: ${proposal.status.toUpperCase()}${proposal.error ? ' — ' + proposal.error : ''}`;
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              result = `[OS::SELF_EVOLVE] → ⚠ Invalid patches JSON: ${message}`;
            }
          } else {
            result = `[OS::SELF_EVOLVE] → ⚠ Format: OS::SELF_EVOLVE:<json-patches>:<rationale>`;
          }
          break;
        }
        case 'CLUSTER_SCAN': {
          try {
            const { cluster } = await import('./cluster');
            const peers = await cluster.scan();
            result = `[OS::CLUSTER_SCAN] → Found ${peers.length} peer(s):${peers.length > 0 ? '\n' + peers.map(p => `  ${p.name} (${p.ip}) — CPU: ${p.capabilities.cpu}, GPU: ${p.capabilities.gpu || 'none'}`).join('\n') : ''}`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::CLUSTER_SCAN] → ⚠ ${message}`;
          }
          break;
        }
        case 'CLUSTER_STATUS': {
          try {
            const { cluster } = await import('./cluster');
            const status = cluster.getStatus();
            result = `[OS::CLUSTER_STATUS] → Device: ${status.deviceId} | Leader: ${status.isLeader ? 'YES' : 'NO (following ' + status.leaderId + ')'} | Peers: ${status.peers.length}${status.computeEndpoint ? ' | Compute: ' + status.computeEndpoint : ''}`;
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            result = `[OS::CLUSTER_STATUS] → ⚠ ${message}`;
          }
          break;
        }

        // ─── New OS:: actions ──────────────────────────────────────────
        case 'EMPTY_TRASH': {
          try {
            const fs = await getVfs();
            const trashItems = fs.listDir('/home/user/Trash') || [];
            for (const item of trashItems) {
              fs.delete(`/home/user/Trash/${item}`);
            }
            result = `[OS::EMPTY_TRASH] → ✅ Emptied ${trashItems.length} item(s) from Recycle Bin`;
          } catch (e: unknown) {
            result = `[OS::EMPTY_TRASH] → ⚠ ${e instanceof Error ? e.message : String(e)}`;
          }
          break;
        }

        case 'SET_THEME': {
          const themeName = clampLength(toStringArg(actionArgs[0]), 64);
          if (themeName) {
            try {
              const os = useOS.getState();
              os.setThemePreset(themeName);
              try {
                const { themeEngine } = await import('./themeEngine');
                themeEngine.setAccent(themeName);
              } catch (e: any) {
                kernelLog.warn('[OS::SET_THEME] themeEngine apply failed (non-fatal):', e?.message);
              }
              result = `[OS::SET_THEME] → ✅ Theme set to ${themeName}`;
            } catch (e: any) {
              result = `[OS::SET_THEME] → ⚠ Could not set theme: ${e?.message || e}`;
            }
          }
          break;
        }

        case 'SET_ACCENT': {
          const hex = clampLength(toStringArg(actionArgs[0]), 7);
          if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) {
            const os = useOS.getState();
            os.setAccentColor(hex);
            try {
              const { themeEngine } = await import('./themeEngine');
              themeEngine.setCustomAccent(hex);
            } catch {}
            result = `[OS::SET_ACCENT] → ✅ Accent set to ${hex}`;
          } else {
            result = `[OS::SET_ACCENT] → ⚠ Invalid hex color. Format: #RRGGBB`;
          }
          break;
        }

        case 'PLAY_AUDIO': {
          const path = normalizeOsPath(toStringArg(actionArgs[0]));
          if (path) {
            const os = useOS.getState();
            os.openWindow('music', { path });
            result = `[OS::PLAY_AUDIO] → ✅ Playing ${path}`;
          }
          break;
        }

        case 'TAKE_SCREENSHOT': {
          try {
            const { vision } = await import('./vision');
            const screenshot = await vision.captureScreen();
            if (screenshot) {
              const fs = await getVfs();
              const path = `/home/user/Desktop/screenshot_${Date.now()}.png`;
              fs.writeFile(path, screenshot);
              result = `[OS::TAKE_SCREENSHOT] → ✅ Screenshot saved to ${path}`;
            } else {
              result = `[OS::TAKE_SCREENSHOT] → ⚠ Could not capture screen`;
            }
          } catch (e: unknown) {
            result = `[OS::TAKE_SCREENSHOT] → ⚠ ${e instanceof Error ? e.message : String(e)}`;
          }
          break;
        }

        case 'IDE_OPEN_FILE': {
          const path = normalizeOsPath(toStringArg(actionArgs[0]));
          if (path) {
            const os = useOS.getState();
            // Check if HyperIDE is already open
            const existingWin = os.windows.find(w => w.appId === 'hyperide');
            if (existingWin) {
              // Update existing window's data to open the file
              os.updateWindow(existingWin.id, { data: { ...existingWin.data, path } });
              os.focusWindow(existingWin.id);
              result = `[OS::IDE_OPEN_FILE] → ✅ Opened ${path} in existing HyperIDE`;
            } else {
              os.openWindow('hyperide', { path });
              result = `[OS::IDE_OPEN_FILE] → ✅ Opened ${path} in new HyperIDE`;
            }
          }
          break;
        }

        // ─── SkillForge — AI self-evolution ────────────────────────────
        case 'CALL_SKILL': {
          const raw = toStringArg(actionArgs[0]);
          const colonIdx = raw.indexOf(':');
          const skillName = colonIdx >= 0 ? raw.slice(0, colonIdx).trim() : raw.trim();
          const skillArgs = colonIdx >= 0 ? raw.slice(colonIdx + 1) : '';
          if (skillName) {
            const execResult = await skillForge.execute(skillName, skillArgs);
            if (execResult.success) {
              const resultStr = typeof execResult.result === 'string'
                ? execResult.result
                : JSON.stringify(execResult.result);
              result = `[OS::CALL_SKILL:${skillName}] → ✅ (${execResult.durationMs}ms)\n${clampLength(resultStr, 2000)}`;
            } else {
              result = `[OS::CALL_SKILL:${skillName}] → ⚠ ${execResult.error}`;
            }
          } else {
            result = `[OS::CALL_SKILL] → ⚠ Format: OS::CALL_SKILL:<name>:<json-args>`;
          }
          break;
        }

        case 'FORGE_SKILL': {
          const raw = toStringArg(actionArgs[0]);
          const parts = raw.split('|');
          if (parts.length >= 3) {
            const skillName = (parts[0] || '').trim();
            const description = (parts[1] || '').trim();
            const code = parts.slice(2).join('|');
            const regResult = await skillForge.register(skillName, description, code);
            result = regResult.success
              ? `[OS::FORGE_SKILL] → ✅ Skill '${skillName}' registered and persisted`
              : `[OS::FORGE_SKILL] → ⚠ ${regResult.error}`;
          } else {
            result = `[OS::FORGE_SKILL] → ⚠ Format: OS::FORGE_SKILL:<name>|<description>|<code>`;
          }
          break;
        }

        case 'LIST_SKILLS': {
          const skills = skillForge.list();
          if (skills.length === 0) {
            result = `[OS::LIST_SKILLS] → No skills registered. Use OS::FORGE_SKILL to create one.`;
          } else {
            const listing = skills.map(s =>
              `⚡ ${s.name}: ${s.description} (used ${s.invocations}x, last: ${s.lastResult || 'never'})`
            ).join('\n');
            result = `[OS::LIST_SKILLS] → ${skills.length} skill(s):\n${listing}`;
          }
          break;
        }

        case 'DELETE_SKILL': {
          const skillName = toStringArg(actionArgs[0]).trim();
          if (skillName) {
            const deleted = await skillForge.delete(skillName);
            result = deleted
              ? `[OS::DELETE_SKILL] → ✅ Skill '${skillName}' deleted`
              : `[OS::DELETE_SKILL] → ⚠ Skill '${skillName}' not found`;
          }
          break;
        }

        // ─── AutoPilot ──────────────────────────────────────────────
        case 'ADD_GOAL': {
          const description = toStringArg(actionArgs[0]).trim();
          if (description) {
            let priority: 'low' | 'normal' | 'high' | 'critical' = 'normal';
            let desc = description;
            const pipeIdx = description.indexOf('|');
            if (pipeIdx > 0 && pipeIdx < 20) {
              const maybePriority = description.slice(0, pipeIdx).trim().toLowerCase();
              if (['low', 'normal', 'high', 'critical'].includes(maybePriority)) {
                priority = maybePriority as any;
                desc = description.slice(pipeIdx + 1).trim();
              }
            }
            const goal = await autoPilot.addGoal(desc, priority);
            result = `[OS::ADD_GOAL] → ✅ Goal added (id: ${goal.id}, priority: ${priority}): ${desc}`;
          } else {
            result = `[OS::ADD_GOAL] → ⚠ Provide a goal description`;
          }
          break;
        }

        case 'GET_GOALS': {
          const goals = autoPilot.getGoals();
          if (goals.length === 0) {
            result = `[OS::GET_GOALS] → Goal queue is empty. Use OS::ADD_GOAL:<description> to add one.`;
          } else {
            const listing = goals.map(g =>
              `${g.status === 'pending' ? '⏳' : g.status === 'in-progress' ? '🔄' : g.status === 'completed' ? '✅' : '❌'} ${g.id} [${g.priority}] ${g.description}${g.lastError ? ` (last error: ${g.lastError})` : ''}`
            ).join('\n');
            result = `[OS::GET_GOALS] → ${goals.length} goal(s):\n${listing}`;
          }
          break;
        }

        case 'COMPLETE_GOAL': {
          const goalId = toStringArg(actionArgs[0]).trim();
          if (goalId) {
            const ok = await autoPilot.completeGoal(goalId, 'Marked complete by AI');
            result = ok
              ? `[OS::COMPLETE_GOAL] → ✅ Goal ${goalId} marked complete`
              : `[OS::COMPLETE_GOAL] → ⚠ Goal ${goalId} not found`;
          }
          break;
        }

        case 'SET_AUTOPILOT': {
          const mode = toStringArg(actionArgs[0]).trim().toLowerCase();
          if (mode === 'on' || mode === 'true' || mode === '1') {
            await autoPilot.setEnabled(true);
            result = `[OS::SET_AUTOPILOT] → ✅ AutoPilot ENGAGED.`;
          } else if (mode === 'off' || mode === 'false' || mode === '0') {
            await autoPilot.setEnabled(false);
            result = `[OS::SET_AUTOPILOT] → ✅ AutoPilot DISENGAGED.`;
          } else {
            result = `[OS::SET_AUTOPILOT] → ⚠ Provide 'on' or 'off'`;
          }
          break;
        }

        // ─── Agent messaging ──────────────────────────────────────────
        case 'AGENT_MESSAGE': {
          const raw = toStringArg(actionArgs[0]);
          const colonIdx = raw.indexOf(':');
          if (colonIdx > 0) {
            const toId = raw.slice(0, colonIdx).trim();
            const message = raw.slice(colonIdx + 1);
            const activeAgents = agentOrchestrator.getActiveAgents();
            const fromId = activeAgents[0]?.id || 'ai-orchestrator';
            const ok = agentOrchestrator.sendMessage(fromId, toId, message);
            result = ok
              ? `[OS::AGENT_MESSAGE] → ✅ Message sent to ${toId}`
              : `[OS::AGENT_MESSAGE] → ⚠ Agent ${toId} not found`;
          } else {
            result = `[OS::AGENT_MESSAGE] → ⚠ Format: OS::AGENT_MESSAGE:<toAgentId>:<message>`;
          }
          break;
        }

        default:
          result = `[OS::${action.type}] → Unknown action type`;
      }

      if (result) results.push(result);
    }

    return results.length > 0 ? '\n\n' + results.join('\n') : '';
  }

  // ─── Native Function-Calling Entry Point ───────────────────
  // Maps each AIToolCall (returned by AIProviderGateway.generateWithTools)
  // back into an OS:: action string and reuses executeOsActions() so all
  // validation, side-effects, and result formatting stay in one place.
  // Any tool name we don't recognize is reported as `[Unknown tool: ...]`
  // and skipped — the surrounding pipeline still returns successfully.
  public async executeToolCalls(toolCalls: AIToolCall[]): Promise<string> {
    const results: string[] = [];
    for (const call of toolCalls) {
      const args = call.arguments || {};
      let osAction = '';
      switch (call.name) {
        case 'write_file':
          osAction = `OS::WRITE_FILE:${args.path}:${args.content}`;
          break;
        case 'read_file':
          osAction = `OS::READ_FILE:${args.path}`;
          break;
        case 'delete_file':
          osAction = `OS::DELETE_FILE:${args.path}`;
          break;
        case 'list_dir':
          osAction = `OS::LIST_DIR:${args.path}`;
          break;
        case 'create_folder':
          osAction = `OS::CREATE_FOLDER:${args.path}`;
          break;
        case 'open_app':
          osAction = `OS::OPEN_APP:${args.appId}`;
          break;
        case 'close_app':
          osAction = `OS::CLOSE_APP:${args.appId}`;
          break;
        case 'notify':
          osAction = `OS::NOTIFY:${args.title}:${args.message}`;
          break;
        case 'remember':
          osAction = `OS::REMEMBER:${args.content}`;
          break;
        case 'set_wallpaper':
          osAction = `OS::SET_WALLPAPER:${args.wallpaperId}`;
          break;
        case 'set_theme':
          osAction = `OS::SET_THEME:${args.name}`;
          break;
        case 'set_accent':
          osAction = `OS::SET_ACCENT:${args.hex}`;
          break;
        case 'search_files':
          osAction = `OS::SEARCH_FILES:${args.query}`;
          break;
        case 'web_search':
          osAction = `OS::WEB_SEARCH:${args.query}`;
          break;
        case 'browse_navigate':
          osAction = `OS::BROWSE_NAVIGATE:${args.url}`;
          break;
        case 'spawn_agent':
          osAction = `OS::SPAWN_AGENT:${args.goal}`;
          break;
        case 'add_goal':
          osAction = `OS::ADD_GOAL:${args.priority || 'normal'}|${args.description}`;
          break;
        case 'forge_skill':
          osAction = `OS::FORGE_SKILL:${args.name}|${args.description}|${args.code}`;
          break;
        case 'call_skill':
          osAction = `OS::CALL_SKILL:${args.name}:${args.args ? JSON.stringify(args.args) : ''}`;
          break;
        case 'build_app':
          osAction = `OS::BUILD_APP:${args.description}`;
          break;
        case 'execute_js':
          osAction = `OS::EXECUTE_JS:${args.code}`;
          break;
        case 'clipboard_copy':
          osAction = `OS::CLIPBOARD_COPY:${args.text}`;
          break;
        case 'take_screenshot':
          osAction = `OS::TAKE_SCREENSHOT`;
          break;
        default:
          results.push(`[Unknown tool: ${call.name}]`);
          continue;
      }
      const result = await this.executeOsActions(osAction);
      if (result) results.push(result);
    }
    return results.join('\n');
  }

  public async getAllTools(): Promise<DaemonTool[]> {
    await this.ensureLoadedAsync();
    return Array.from(this.tools.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public async deleteTool(name: string): Promise<void> {
    await this.ensureLoadedAsync();
    this.tools.delete(name.trim());
    this.save();
  }

  public async toolCount(): Promise<number> {
    await this.ensureLoadedAsync();
    return this.tools.size;
  }
}

export const toolForge = new ToolForge();