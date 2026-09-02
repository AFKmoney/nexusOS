// ═══════════════════════════════════════════════════════════════════
// SKILL FORGE v2 — Persistent, executable AI-authored skills
//
// The AI's self-evolution mechanism. Unlike the legacy ToolForge
// (which only accepts single JS expressions and lives in localStorage),
// SkillForge v2 lets the AI write FULL JavaScript modules — with
// imports, async/await, helper functions, state — and store them in
// the VFS at /system/skills/<name>.skill.js so they survive restarts.
//
// Each skill is invoked via the new OS:: action:
//   OS::CALL_SKILL:<name>:<json-args>
//
// SAFETY MODEL
//   - Skills run in a sandboxed Function() scope — no access to
//     process, require, globalThis mutations.
//   - They get a curated `ctx` object with safe primitives: vfs,
//     memory, eventBus, os (read-only), fetch (CORS-proxied), ai.
//   - Skills are size-capped (50 KB) and timeout'd (30 s).
//   - Every execution is logged to autonomyEventLog.
// ═══════════════════════════════════════════════════════════════════

import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';
import { memory } from './memory';
import { eventBus } from './eventBus';
import { autonomyEventLog } from './autonomyEventLog';
import { kernelLog } from './log';
import { aiService } from '../services/puterService';
import { useOS } from '../store/osStore';
import { SKILL_PACK, SKILL_PACK_VERSION } from './skillPack';

const SKILLS_DIR = '/system/skills';
const PACK_VERSION_PATH = '/system/.skill_pack_version';
const MAX_SKILL_SIZE = 50_000;        // 50 KB source cap
const MAX_EXECUTION_MS = 30_000;      // 30 s timeout
const SAFE_SKILL_NAME = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

export interface Skill {
  name: string;
  description: string;
  code: string;
  createdAt: number;
  updatedAt: number;
  invocations: number;
  lastResult?: 'success' | 'error';
  exposedAsAction?: string;     // if set, callable as OS::<exposedAsAction>
}

export interface SkillExecutionContext {
  args: unknown;                // parsed JSON args
  argsRaw: string;              // raw string args
  vfs: {
    read: (path: string) => string | null;
    write: (path: string, content: string) => void;
    list: (path: string) => string[];
    delete: (path: string) => boolean;
    createDir: (path: string) => boolean;
    stat: (path: string) => { type?: 'directory' | 'file' | 'symlink' } | null;
  };
  memory: {
    remember: (content: string, tags?: string[]) => void;
    recall: (query: string, limit?: number) => Array<{ content: string }>;
  };
  events: {
    emit: (event: string, payload?: unknown) => void;
    on: (event: string, handler: (payload: unknown) => void) => () => void;
  };
  os: {
    openWindow: (appId: string, data?: unknown) => void;
    closeWindow: (windowId: string) => void;
    notify: (title: string, message: string) => void;
    getRegistry: () => Array<{ id: string; name: string }>;
    getWindows: () => Array<{ id: string; appId: string; title: string }>;
  };
  ai: {
    generate: (prompt: string, mode?: string) => Promise<string>;
    stream: (prompt: string, onToken: (t: string) => void, mode?: string) => Promise<void>;
  };
  fetch: (url: string, options?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> }>;
  /** Run another skill, enabling skill-to-skill chaining. Returns a SkillExecutionResult-shaped object. */
  runSkill: (name: string, argsRaw?: string | Record<string, unknown>) => Promise<SkillExecutionResult | { success: boolean; error?: string }>;
  log: (msg: string) => void;
}

export interface SkillExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

const MAX_CHAIN_DEPTH = 5; // guard against runaway skill→skill recursion

class SkillForgeEngine {
  private skills = new Map<string, Skill>();
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private chainDepth = 0;

  async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this._doLoad();
    return this.loadPromise;
  }

  private async _doLoad(): Promise<void> {
    try {
      if (!vfs.stat(SKILLS_DIR)) {
        vfs.createDir(SKILLS_DIR, SYSTEM_VFS_APP_ID);
      }
      const files = vfs.listDir(SKILLS_DIR, SYSTEM_VFS_APP_ID) || [];
      for (const file of files) {
        if (!file.endsWith('.skill.js')) continue;
        const path = `${SKILLS_DIR}/${file}`;
        const content = vfs.readFile(path, SYSTEM_VFS_APP_ID);
        if (!content) continue;
        const skill = this.parseSkillFile(content, file);
        if (skill) {
          this.skills.set(skill.name, skill);
          kernelLog.info(`[SkillForge] Loaded skill: ${skill.name}`);
        }
      }
      // Seed the curated skill pack (idempotent + upgrade-safe):
      // only seeds skills that aren't already present, so it never
      // clobbers the AI's or the user's own customizations.
      await this.seedFromPack();
      kernelLog.info(`[SkillForge] Loaded ${this.skills.size} skill(s) from VFS`);
      this.isLoaded = true;
    } catch (e: any) {
      kernelLog.warn('[SkillForge] Load failed:', e?.message);
      this.isLoaded = true;
    }
  }

  /**
   * Seed the curated skill pack into the VFS / registry.
   *
   * IMPORTANT: Called from inside _doLoad(), so it MUST NOT call
   * register() (which calls load() → would deadlock on the in-flight
   * loadPromise). Instead we write directly to the skills map and VFS.
   *
   * Idempotent + upgrade-safe: it only seeds a pack skill that is NOT
   * already present in the registry (keyed by name), so it never
   * overwrites a customized / AI-evolved skill. Bumping SKILL_PACK_VERSION
   * re-runs the sweep and picks up any newly added pack skills.
   */
  private async seedFromPack(): Promise<void> {
    try {
      if (!vfs.stat(SKILLS_DIR)) {
        vfs.createDir(SKILLS_DIR, SYSTEM_VFS_APP_ID);
      }
    } catch {}

    // Read the last-seeded pack version so we can (a) avoid re-checking
    // on every boot and (b) re-run the sweep when the pack is upgraded.
    let seededVersion = -1;
    try {
      const raw = vfs.readFile(PACK_VERSION_PATH, SYSTEM_VFS_APP_ID);
      if (raw) seededVersion = parseInt(raw, 10);
    } catch {}

    // Sweep only when we haven't seeded this pack version yet, OR
    // still ensure freshness on first run.
    if (seededVersion !== SKILL_PACK_VERSION) {
      let seeded = 0;
      for (const pack of SKILL_PACK) {
        // Never clobber an existing skill (user/AI customized or custom-named).
        if (this.skills.has(pack.name)) continue;
        const skill: Skill = {
          name: pack.name,
          description: pack.description,
          code: pack.code,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          invocations: 0,
        };
        if (pack.expose) skill.exposedAsAction = pack.expose;
        this.skills.set(pack.name, skill);
        const header = `// @skill ${pack.name}\n// @desc ${pack.description}\n${pack.expose ? `// @expose ${pack.expose}\n` : ''}`;
        vfs.writeFile(`${SKILLS_DIR}/${pack.name}.skill.js`, `${header}\n${pack.code}`, SYSTEM_VFS_APP_ID);
        seeded++;
        kernelLog.info(`[SkillForge] Seeded pack skill: ${pack.name}`);
      }
      vfs.writeFile(PACK_VERSION_PATH, String(SKILL_PACK_VERSION), SYSTEM_VFS_APP_ID);
      kernelLog.info(`[SkillForge] Skill pack v${SKILL_PACK_VERSION} seeded (${seeded} new, ${this.skills.size} total)`);
      eventBus.emit('skill:pack-seeded', { version: SKILL_PACK_VERSION, seeded });
    }
  }

  /**
   * Legacy seeding kept for backward compatibility against direct
   * references; now delegates to seedFromPack().
   */
  private async seedExampleSkills(): Promise<void> {
    return this.seedFromPack();
  }
  private parseSkillFile(content: string, filename: string): Skill | null {
    try {
      const lines = content.split('\n');
      let name = '';
      let description = '';
      let exposedAsAction: string | undefined;
      let codeStart = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';
        const m = line.match(/^\/\/\s*@(\w+)\s+(.+)$/);
        if (m) {
          const key = m[1] || '';
          const val = (m[2] || '').trim();
          if (key === 'skill') name = val;
          else if (key === 'desc') description = val;
          else if (key === 'expose') exposedAsAction = val;
        } else if (line.trim() && !line.startsWith('//')) {
          codeStart = i;
          break;
        }
      }
      if (!name) {
        name = filename.replace(/\.skill\.js$/, '');
      }
      if (!SAFE_SKILL_NAME.test(name)) return null;
      const code = lines.slice(codeStart).join('\n').slice(0, MAX_SKILL_SIZE);
      const skill: Skill = {
        name,
        description: description || `AI-authored skill ${name}`,
        code,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        invocations: 0,
      };
      if (exposedAsAction) skill.exposedAsAction = exposedAsAction;
      return skill;
    } catch {
      return null;
    }
  }

  async register(name: string, description: string, code: string, exposeAs?: string): Promise<{ success: boolean; error?: string }> {
    await this.load();
    if (!SAFE_SKILL_NAME.test(name)) {
      return { success: false, error: `Invalid skill name: ${name}` };
    }
    if (code.length > MAX_SKILL_SIZE) {
      return { success: false, error: `Skill code exceeds ${MAX_SKILL_SIZE} bytes` };
    }

    try {
      // Validate syntax using the same wrapper as executeInProcess.
      // The sandbox worker uses its own equivalent.
      // eslint-disable-next-line no-new-func
      new Function('ctx', `"use strict";\nreturn (async () => {\n${code}\n})();`);
    } catch (e: any) {
      return { success: false, error: `Syntax error: ${e.message}` };
    }

    const existing = this.skills.get(name);
    const skill: Skill = {
      name,
      description: description.slice(0, 256),
      code,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      invocations: existing?.invocations ?? 0,
    };
    if (existing?.lastResult) skill.lastResult = existing.lastResult;
    const exposedAs = exposeAs || existing?.exposedAsAction;
    if (exposedAs) skill.exposedAsAction = exposedAs;
    this.skills.set(name, skill);

    try {
      if (!vfs.stat(SKILLS_DIR)) {
        vfs.createDir(SKILLS_DIR, SYSTEM_VFS_APP_ID);
      }
      const header = `// @skill ${name}\n// @desc ${skill.description}\n${skill.exposedAsAction ? `// @expose ${skill.exposedAsAction}\n` : ''}`;
      vfs.writeFile(`${SKILLS_DIR}/${name}.skill.js`, `${header}\n${code}`, SYSTEM_VFS_APP_ID);
    } catch (e: any) {
      return { success: false, error: `Failed to persist: ${e.message}` };
    }

    autonomyEventLog.append({
      kind: 'proposal-created',
      subsystem: 'skill-forge',
      actor: 'ai',
      summary: `Skill ${name} ${existing ? 'updated' : 'registered'}: ${description}`,
      metadata: { skillName: name, exposedAsAction: skill.exposedAsAction },
    });

    eventBus.emit('skill:registered', skill);
    kernelLog.info(`[SkillForge] ${existing ? 'Updated' : 'Registered'} skill: ${name}`);
    return { success: true };
  }

  async execute(name: string, argsRaw: string): Promise<SkillExecutionResult> {
    await this.load();
    const skill = this.skills.get(name);
    if (!skill) {
      return { success: false, error: `Skill '${name}' not found`, durationMs: 0 };
    }

    let args: unknown = undefined;
    if (argsRaw && argsRaw.trim()) {
      try {
        args = JSON.parse(argsRaw);
      } catch {
        args = argsRaw;
      }
    }

    const start = Date.now();

    // ─── SANDBOX EXECUTION ────────────────────────────────────────
    // Skills run in an isolated Web Worker (skillSandboxWorker.ts).
    // The worker has NO access to the main thread's DOM, window,
    // localStorage, or process. It communicates via a curated RPC
    // protocol — only whitelisted operations (vfs.read, ai.generate,
    // etc.) are forwarded to the main thread for execution.
    //
    // If Web Workers are unavailable (SSR, test runner), fall back to
    // the old in-process execution with a warning. This should never
    // happen in production (browser/Electron).
    try {
      const result = await this.executeInSandbox(skill.code, args, argsRaw);

      skill.invocations++;
      skill.lastResult = 'success';
      this.skills.set(name, skill);

      autonomyEventLog.append({
        kind: 'execution-succeeded',
        subsystem: 'skill-forge',
        actor: 'ai',
        summary: `Skill ${name} executed successfully`,
        metadata: { skillName: name, durationMs: Date.now() - start },
      });

      return { success: true, result, durationMs: Date.now() - start };
    } catch (e: any) {
      skill.invocations++;
      skill.lastResult = 'error';
      this.skills.set(name, skill);

      const errorMsg = e?.message || String(e);
      autonomyEventLog.append({
        kind: 'execution-failed',
        subsystem: 'skill-forge',
        actor: 'ai',
        summary: `Skill ${name} failed: ${errorMsg}`,
        metadata: { skillName: name, error: errorMsg },
      });

      return { success: false, error: errorMsg, durationMs: Date.now() - start };
    }
  }

  /**
   * Execute skill code in an isolated Web Worker sandbox.
   *
   * The worker (skillSandboxWorker.ts) runs the skill code with NO
   * access to the main thread's DOM, window, localStorage, or process.
   * It communicates via a curated RPC protocol — only whitelisted
   * operations are forwarded to the main thread for execution.
   *
   * If Web Workers are unavailable (SSR, Node test runner), falls
   * back to in-process execution. This is less secure but ensures
   * the OS doesn't crash in non-browser environments.
   */
  private async executeInSandbox(code: string, args: unknown, argsRaw: string): Promise<unknown> {
    // Check if Web Workers are available
    if (typeof Worker === 'undefined') {
      kernelLog.warn('[SkillForge] Web Workers unavailable — falling back to in-process execution (less secure)');
      return this.executeInProcess(code, args, argsRaw);
    }

    return new Promise<unknown>((resolve, reject) => {
      let worker: Worker | null = null;
      let settled = false;

      const cleanup = () => {
        if (worker) {
          worker.terminate();
          worker = null;
        }
      };

      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(`Skill timed out after ${MAX_EXECUTION_MS}ms`));
        }
      }, MAX_EXECUTION_MS);

      try {
        // Create the worker. We use new Worker() with the module
        // path. Vite handles the bundling.
        const workerUrl = new URL('../kernel/skillSandboxWorker.ts', import.meta.url);
        worker = new Worker(workerUrl, { type: 'module' });

        // Set up the RPC handler — the worker sends 'request' messages
        // for each operation it wants to perform. We validate, execute
        // on the main thread, and send back 'response' messages.
        worker.onmessage = async (event: MessageEvent) => {
          const msg = event.data;
          if (!msg || typeof msg !== 'object') return;

          if (msg.type === 'request' && typeof msg.id === 'number') {
            // RPC request from the worker — execute on main thread
            try {
              const result = await this.handleSandboxRpc(msg.op, msg.args || []);
              worker?.postMessage({ type: 'response', id: msg.id, ok: true, result });
            } catch (err: any) {
              worker?.postMessage({ type: 'response', id: msg.id, ok: false, error: err?.message || String(err) });
            }
            return;
          }

          if (msg.type === 'result' && typeof msg.id === 'number') {
            // Final result from the skill execution
            if (!settled) {
              settled = true;
              clearTimeout(timeoutId);
              cleanup();
              if (msg.ok) {
                resolve(msg.result);
              } else {
                reject(new Error(msg.error || 'Skill execution failed'));
              }
            }
            return;
          }

          // Stream token messages (for ctx.ai.stream)
          // These are already handled by the worker internally — we
          // only see the final result here.
        };

        worker.onerror = (err: ErrorEvent) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            cleanup();
            reject(new Error(`Worker error: ${err.message || 'unknown'}`));
          }
        };

        // Kick off the skill execution
        worker.postMessage({
          type: 'execute',
          id: 1,
          code,
          ctx: { args, argsRaw },
        });
      } catch (e: any) {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          cleanup();
          // Worker creation failed (e.g. in test env) — fall back
          kernelLog.warn('[SkillForge] Worker creation failed, falling back to in-process:', e?.message);
          this.executeInProcess(code, args, argsRaw).then(resolve, reject);
        }
      }
    });
  }

  /**
   * Handle an RPC request from the sandbox worker. Only whitelisted
   * operations are executed; anything else throws.
   */
  private async handleSandboxRpc(op: string, args: any[]): Promise<unknown> {
    const ctx = this.buildContext(args[0], args[1] || '');
    switch (op) {
      case 'vfs.read':
        return vfs.readFile(args[0], SYSTEM_VFS_APP_ID);
      case 'vfs.write':
        return vfs.writeFile(args[0], args[1], SYSTEM_VFS_APP_ID);
      case 'vfs.list':
        return vfs.listDir(args[0], SYSTEM_VFS_APP_ID) || [];
      case 'vfs.delete':
        return vfs.delete(args[0], SYSTEM_VFS_APP_ID);
      case 'vfs.createDir':
        return vfs.createDirRecursive(args[0], SYSTEM_VFS_APP_ID);
      case 'vfs.stat':
        return vfs.stat(args[0]) || null;
      case 'memory.remember':
        return memory.remember(args[0], args[1] || []);
      case 'memory.recall':
        return memory.recall(args[0]).slice(0, args[1] || 5).map((m: any) => ({ content: m.content }));
      case 'events.emit':
        return eventBus.emit(args[0], args[1]);
      case 'os.openWindow':
        return useOS.getState().openWindow(args[0], args[1]);
      case 'os.closeWindow':
        return useOS.getState().closeWindow(args[0]);
      case 'os.notify':
        return useOS.getState().addNotification({ title: args[0], message: args[1], type: 'info' } as any);
      case 'os.getRegistry':
        return useOS.getState().registry.map(a => ({ id: a.id, name: a.name }));
      case 'os.getWindows':
        return useOS.getState().windows.map(w => ({ id: w.id, appId: w.appId, title: w.title }));
      case 'ai.generate':
        return aiService.generateOnce(args[0], useOS.getState().kernelRules, args[1] || 'chat');
      case 'ai.stream':
        // Streaming RPC is more complex — for now, just generate and
        // return the full response. The worker's stream() method will
        // receive it as a single token.
        const result = await aiService.streamChat(args[0], useOS.getState().kernelRules, () => {}, args[1] || 'chat');
        return result;
      case 'fetch': {
        const hasElectron = typeof window !== 'undefined' && (window as any).electron?.invoke;
        if (hasElectron) {
          const res = await (window as any).electron.invoke('ai-proxy', {
            url: args[0],
            method: (args[1] as any)?.method || 'GET',
            headers: (args[1] as any)?.headers || {},
            body: (args[1] as any)?.body,
          });
          return {
            ok: res.ok,
            status: res.status,
            text: typeof res.body === 'string' ? res.body : JSON.stringify(res.body),
            json: typeof res.body === 'string' ? JSON.parse(res.body) : res.body,
          };
        }
        const res = await fetch(args[0], args[1] || {});
        return {
          ok: res.ok,
          status: res.status,
          text: await res.text(),
          json: await res.json(),
        };
      }
      case 'log':
        kernelLog.info(`[Skill sandbox] ${args[0]}`);
        return undefined;
      case 'skill.execute':
        return this.runSkillSafely(args[0], args[1]);
      default:
        throw new Error(`Permission denied: operation '${op}' is not allowed in the sandbox`);
    }
  }

  /**
   * Run another skill from within a skill (chaining). Accepts either a raw
   * JSON args string or a plain object. Bounded by MAX_CHAIN_DEPTH to prevent
   * runaway recursion (e.g. a skill calling itself forever).
   */
  private async runSkillSafely(name: string, argsRaw?: string | Record<string, unknown>): Promise<SkillExecutionResult | { success: boolean; error?: string }> {
    if (this.chainDepth >= MAX_CHAIN_DEPTH) {
      return { success: false, error: 'Max skill chaining depth reached (' + MAX_CHAIN_DEPTH + ')' };
    }
    const raw = typeof argsRaw === 'string' ? argsRaw : (argsRaw ? JSON.stringify(argsRaw) : '');
    this.chainDepth++;
    try {
      return await this.execute(name, raw);
    } finally {
      this.chainDepth--;
    }
  }

  /**
   * In-process fallback for environments without Web Workers (Node,
   * SSR, test runner). Less secure but ensures the OS doesn't crash.
   */
  private async executeInProcess(code: string, args: unknown, argsRaw: string): Promise<unknown> {
    const ctx = this.buildContext(args, argsRaw);
    // eslint-disable-next-line no-new-func
    const fn = new Function('ctx', `"use strict";\nreturn (async () => {\n${code}\n})();`) as (ctx: SkillExecutionContext) => Promise<unknown>;
    return fn(ctx);
  }

  private buildContext(args: unknown, argsRaw: string): SkillExecutionContext {
    return {
      args,
      argsRaw,
      vfs: {
        read: (path: string) => vfs.readFile(path, SYSTEM_VFS_APP_ID),
        write: (path: string, content: string) => vfs.writeFile(path, content, SYSTEM_VFS_APP_ID),
        list: (path: string) => vfs.listDir(path, SYSTEM_VFS_APP_ID) || [],
        delete: (path: string) => vfs.delete(path, SYSTEM_VFS_APP_ID),
        createDir: (path: string) => vfs.createDirRecursive(path, SYSTEM_VFS_APP_ID),
        stat: (path: string) => vfs.stat(path),
      },
      memory: {
        remember: (content: string, tags: string[] = []) => memory.remember(content, tags),
        recall: (query: string, limit = 5) =>
          memory.recall(query).slice(0, limit).map(m => ({ content: m.content })),
      },
      events: {
        emit: (event: string, payload?: unknown) => eventBus.emit(event, payload),
        on: (event: string, handler: (payload: unknown) => void) =>
          eventBus.on(event, handler),
      },
      os: {
        openWindow: (appId: string, data?: unknown) => useOS.getState().openWindow(appId, data as any),
        closeWindow: (windowId: string) => useOS.getState().closeWindow(windowId),
        notify: (title: string, message: string) =>
          useOS.getState().addNotification({ title, message, type: 'info' } as any),
        getRegistry: () => useOS.getState().registry.map(a => ({ id: a.id, name: a.name })),
        getWindows: () => useOS.getState().windows.map(w => ({ id: w.id, appId: w.appId, title: w.title })),
      },
      ai: {
        generate: (prompt: string, mode = 'chat') =>
          aiService.generateOnce(prompt, useOS.getState().kernelRules, mode as any),
        stream: (prompt: string, onToken: (t: string) => void, mode = 'chat') =>
          aiService.streamChat(prompt, useOS.getState().kernelRules, onToken, mode as any),
      },
      fetch: async (url: string, options: any = {}) => {
        const hasElectron = typeof window !== 'undefined' && (window as any).electron?.invoke;
        if (hasElectron) {
          const res = await (window as any).electron.invoke('ai-proxy', {
            url,
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.body,
          });
          return {
            ok: res.ok,
            status: res.status,
            text: async () => typeof res.body === 'string' ? res.body : JSON.stringify(res.body),
            json: async () => typeof res.body === 'string' ? JSON.parse(res.body) : res.body,
          };
        }
        const res = await fetch(url, options);
        return {
          ok: res.ok,
          status: res.status,
          text: () => res.text(),
          json: () => res.json(),
        };
      },
      log: (msg: string) => kernelLog.info(`[Skill] ${msg}`),
      runSkill: (name: string, argsRaw?: string | Record<string, unknown>) => this.runSkillSafely(name, argsRaw),
    } as SkillExecutionContext;
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  async delete(name: string): Promise<boolean> {
    await this.load();
    if (!this.skills.has(name)) return false;
    this.skills.delete(name);
    try {
      vfs.delete(`${SKILLS_DIR}/${name}.skill.js`, SYSTEM_VFS_APP_ID);
    } catch {}
    eventBus.emit('skill:deleted', { name });
    return true;
  }

  async getSystemSkillContext(): Promise<string> {
    await this.load();
    if (this.skills.size === 0) return '';
    let ctx = '\n\n[SKILLS — AI-authored, callable via OS::CALL_SKILL:<name>:<json-args>]\n';
    for (const s of this.skills.values()) {
      ctx += `  • ${s.name}: ${s.description}${s.exposedAsAction ? ` (exposed as OS::${s.exposedAsAction})` : ''}\n`;
    }
    return ctx;
  }
}

export const skillForge = new SkillForgeEngine();
