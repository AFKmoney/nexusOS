
import { localBrain } from '../services/localBrain';
import { parseOsActions, ParsedOsAction } from './osManifest';
import { vfs } from './fileSystem';
import { memory } from './memory';

interface DaemonTool {
  name: string;
  description: string;
  code: string;
  createdAt: number;
}

const STORAGE_KEY = 'daemon_tools_v2';

export class ToolForge {
  private tools: Map<string, DaemonTool> = new Map();
  // Callback for OS-level actions (set by App.tsx to avoid circular deps)
  private _osActionHandler: ((action: ParsedOsAction) => Promise<string>) | null = null;
  private _loaded = false;
  private _loadPromise: Promise<void> | null = null;
  private _saveTimeout: any = null;

  constructor() {
    // Defer initialization to avoid blocking critical rendering path
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => this.ensureLoaded());
    } else {
      setTimeout(() => this.ensureLoaded(), 0);
    }
  }

  public bindOsActions(handler: (action: ParsedOsAction) => Promise<string>) {
    this._osActionHandler = handler;
  }

  private async ensureLoaded(): Promise<void> {
    if (this._loaded) return;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = new Promise(resolve => {
      const doLoad = () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as DaemonTool[];
            for (const t of parsed) this.tools.set(t.name, t);
          }
        } catch(e) {} finally {
          this._loaded = true;
          resolve();
        }
      };

      // Wrap in setTimeout to ensure it doesn't block the current tick
      setTimeout(doLoad, 0);
    });

    return this._loadPromise;
  }

  private async save() {
    await this.ensureLoaded();
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.tools.values())));
    }, 100);
  }

  // Parse and register user-created tools
  // Format: ```javascript\n// @tool ToolName\n// @desc Description\nfunction ToolName...```
  public async parseAndRegister(text: string): Promise<boolean> {
    await this.ensureLoaded();
    const rx = /```javascript\s*\/\/\s*@tool\s+([a-zA-Z0-9_]+)\s*\n\/\/\s*@desc\s+(.+)\n([\s\S]+?)```/g;
    let match;
    let registered = false;
    while ((match = rx.exec(text)) !== null) {
      const name = match[1].trim();
      const desc = match[2].trim();
      const code = match[3].trim();
      this.tools.set(name, { name, description: desc, code, createdAt: Date.now() });
      registered = true;
    }
    if (registered) this.save();
    return registered;
  }

  // Returns context string for system prompt
  public async getSystemToolContext(): Promise<string> {
    await this.ensureLoaded();
    if (this.tools.size === 0) return '';
    let ctx = '\n\n[FORGED TOOLS — User-created, callable with <CALL_TOOL>]\n';
    for (const t of this.tools.values()) {
      ctx += `  • ${t.name}: ${t.description}\n`;
    }
    return ctx;
  }

  // Executes a forged user tool
  public async executeTool(name: string, argsString: string): Promise<string> {
    await this.ensureLoaded();
    const t = this.tools.get(name);
    if (!t) return `[TOOL ERROR: Tool '${name}' not found. Define it first using // @tool syntax]`;
    try {
      const execCode = `${t.code}\nreturn await ${name}(${argsString});`;
      const asyncFn = new Function(`return (async () => { ${execCode} })()`);
      const result = await asyncFn();
      return `\n[TOOL_RESULT: ${name}] → ${JSON.stringify(result)}\n`;
    } catch (e: any) {
      return `\n[TOOL ERROR: ${name}] → ${e.message}\n`;
    }
  }

  // ─── Execute Native OS Actions from AI response ─────────────────────────────
  // Returns a result string that can be appended to the next AI turn
  public async executeOsActions(text: string): Promise<string> {
    const actions = parseOsActions(text);
    if (actions.length === 0) return '';

    const results: string[] = [];

    for (const action of actions) {
      let result = '';

      switch (action.type) {
        case 'OPEN_APP': {
          const [appIdRaw] = action.args;
          const parts = appIdRaw.split(':');
          const appId = parts[0];
          const filePath = parts[1];
          if (this._osActionHandler) {
            result = await this._osActionHandler({ ...action, args: [appId, filePath || ''] });
          } else {
            result = `[OS::OPEN_APP] → App "${appId}" queued (OS handler not bound yet)`;
          }
          break;
        }

        case 'WRITE_FILE': {
          const [path, content] = action.args;
          if (path && content !== undefined) {
            vfs.writeFile(path, content);
            memory.remember(`File written: ${path}`, ['file', 'vfs']);
            result = `[OS::WRITE_FILE] → ✅ ${path} saved (${content.length} chars)`;
          } else {
            result = `[OS::WRITE_FILE] → ⚠ Invalid args. Format: OS::WRITE_FILE:/path:content`;
          }
          break;
        }

        case 'READ_FILE': {
          const [path] = action.args;
          if (path) {
            const content = vfs.readFile(path);
            result = content !== null
              ? `[OS::READ_FILE] → ${path}:\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``
              : `[OS::READ_FILE] → ⚠ File not found: ${path}`;
          } else {
            result = `[OS::READ_FILE] → ⚠ No path provided`;
          }
          break;
        }

        case 'NOTIFY': {
          const [title, message] = action.args[0].split(':');
          if (this._osActionHandler) {
            result = await this._osActionHandler({ ...action, args: [title || 'DAEMON', message || action.args[0]] });
          } else {
            result = `[OS::NOTIFY] → "${title}: ${message}"`;
          }
          break;
        }

        case 'REMEMBER': {
          const [content] = action.args;
          if (content) {
            memory.remember(content, ['daemon', 'ai']);
            result = `[OS::REMEMBER] → ✅ Stored in persistent memory`;
          }
          break;
        }

        case 'SEARCH_FILES': {
          const [query] = action.args;
          if (query) {
            const hits: string[] = [];
            const searchDir = (dir: string) => {
              const items = vfs.listDir(dir) || [];
              items.forEach(name => {
                const p = `${dir}/${name}`;
                const stat = vfs.stat(p);
                if (stat?.type === 'directory') { searchDir(p); return; }
                const content = vfs.readFile(p) || '';
                if (content.toLowerCase().includes(query.toLowerCase())) {
                  const lines = content.split('\n');
                  lines.forEach((line, i) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                      hits.push(`  ${p}:${i+1} → ${line.trim().slice(0, 80)}`);
                    }
                  });
                }
              });
            };
            searchDir('/home/user');
            result = hits.length > 0
              ? `[OS::SEARCH_FILES: "${query}"] → ${hits.length} hits:\n${hits.slice(0,20).join('\n')}`
              : `[OS::SEARCH_FILES: "${query}"] → No results found`;
          }
          break;
        }

        case 'CREATE_FOLDER': {
          const [path] = action.args;
          if (path) {
            vfs.writeFile(`${path}/.keep`, '');
            result = `[OS::CREATE_FOLDER] → ✅ ${path} created`;
          }
          break;
        }

        case 'BUILD_APP': {
          const [desc] = action.args;
          if (this._osActionHandler) {
            result = await this._osActionHandler({ ...action, args: [desc] });
          } else {
            result = `[OS::BUILD_APP] → NeuralForge triggered for: "${desc}"`;
          }
          break;
        }

        case 'OPEN_URL': {
          const [url] = action.args;
          if (this._osActionHandler) {
            result = await this._osActionHandler({ ...action, args: [url] });
          } else {
            result = `[OS::OPEN_URL] → NetRunner navigating to ${url}`;
          }
          break;
        }

        case 'EXECUTE_JS': {
          const [code] = action.args;
          if (code) {
            try {
              const asyncFn = new Function(`return (async () => { return ${code} })()`);
              const res = await asyncFn();
              result = `[OS::EXECUTE_JS] → ${JSON.stringify(res)}`;
            } catch (e: any) {
              result = `[OS::EXECUTE_JS ERROR] → ${e.message}`;
            }
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
    await this.ensureLoaded();
    return Array.from(this.tools.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public async deleteTool(name: string): Promise<void> {
    await this.ensureLoaded();
    this.tools.delete(name);
    this.save();
  }

  public async toolCount(): Promise<number> {
    await this.ensureLoaded();
    return this.tools.size;
  }
}

export const toolForge = new ToolForge();
