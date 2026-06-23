import { localBrain } from '../services/localBrain';
import { parseOsActions, ParsedOsAction } from './osManifest';
import { useOS } from '../store/osStore';
import { commander } from './commander';
import { eventBus } from './eventBus';
import { vfs } from './fileSystem';
import { memory } from './memory';

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
  stat: (path: string) => { type?: 'directory' | 'file' } | null | undefined;
  delete: (path: string) => boolean;
};

type MemoryModule = {
  remember: (content: string, tags: string[]) => void;
};

async function getVfs(): Promise<VfsModule> {
  return vfs as VfsModule;
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
    if (this.tools.size === 0) return '';
    let ctx = '\n\n[FORGED TOOLS — User-created, callable with <CALL_TOOL>]\n';
    for (const t of this.tools.values()) {
      ctx += `  • ${t.name}: ${t.description}\n`;
    }
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
          if (this._osActionHandler) {
            result = await this._osActionHandler({ ...action, args: [desc] });
          } else {
            result = `[OS::BUILD_APP] → NeuralForge triggered for: "${desc}"`;
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
            const success = fs.delete(path);
            result = success
              ? `[OS::DELETE_FILE] → ✅ ${path} deleted`
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

        default:
          result = `[OS::${action.type}] → Unknown action type`;
      }

      if (result) results.push(result);
    }

    return results.length > 0 ? '\n\n' + results.join('\n') : '';
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