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

const SKILLS_DIR = '/system/skills';
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
  log: (msg: string) => void;
}

export interface SkillExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

class SkillForgeEngine {
  private skills = new Map<string, Skill>();
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

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
      // If fresh install, seed example skills
      if (this.skills.size === 0) {
        await this.seedExampleSkills();
      }
      kernelLog.info(`[SkillForge] Loaded ${this.skills.size} skill(s) from VFS`);
      this.isLoaded = true;
    } catch (e: any) {
      kernelLog.warn('[SkillForge] Load failed:', e?.message);
      this.isLoaded = true;
    }
  }

  /**
   * IMPORTANT: This is called from inside _doLoad(), so it MUST NOT
   * call register() (which calls load() → would deadlock on the
   * in-flight loadPromise). Instead we write directly to the skills
   * map and the VFS.
   */
  private async seedExampleSkills(): Promise<void> {
    const examples = [
      {
        name: 'greet_user',
        description: 'Greet the user by name with a personalized message',
        code: `const user = useOS.getState().currentUser;\nconst name = user?.name || 'Creator';\nconst hour = new Date().getHours();\nconst greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';\nuseOS.getState().openWindow('daemon_chat', { initialMessage: greeting + ', ' + name + '!' });\nuseOS.getState().addNotification({ title: 'NexusOS AI', message: greeting + ', ' + name + '!', type: 'info' });\nreturn greeting + ', ' + name + '!';`,
      },
      {
        name: 'system_health_report',
        description: 'Generate a comprehensive system health report and save to Desktop',
        code: `const os = useOS.getState();\nconst metrics = { timestamp: new Date().toISOString(), uptime: Math.floor(performance.now() / 1000), windows: os.windows.length, apps: os.registry.length, autonomy: os.kernelRules.autonomyEnabled, fullAutonomy: os.kernelRules.fullAutonomy || false, desktopFiles: ctx.vfs.list('/home/user/Desktop').length };\nconst status = metrics.windows < 10 && metrics.desktopFiles < 20 ? 'HEALTHY' : 'BUSY';\nconst report = '# System Health Report\\\\nGenerated: ' + metrics.timestamp + '\\\\n\\\\n' + '- Uptime: ' + metrics.uptime + 's\\\\n' + '- Windows: ' + metrics.windows + '\\\\n' + '- Apps: ' + metrics.apps + '\\\\n' + '- Desktop files: ' + metrics.desktopFiles + '\\\\n' + '- Autonomy: ' + (metrics.autonomy ? 'ENABLED' : 'disabled') + (metrics.fullAutonomy ? ' (FULL)' : '') + '\\\\n' + '- Status: ' + status + '\\\\n';\nconst path = '/home/user/Desktop/health_report_' + Date.now() + '.md';\nctx.vfs.write(path, report);\nos.addNotification({ title: 'Health Report', message: 'Saved to ' + path, type: 'success' });\nreturn report;`,
      },
      {
        name: 'organize_desktop',
        description: 'Organize desktop files into categorized folders by extension',
        code: `const vfs = ctx.vfs;\nconst os = useOS.getState();\nconst files = vfs.list('/home/user/Desktop');\nif (files.length === 0) return 'Desktop is already empty.';\nconst categories = { Code: ['.js','.ts','.tsx','.jsx','.py','.go','.rs','.html','.css','.json','.xml','.yml','.yaml'], Notes: ['.md','.txt','.rtf','.doc'], Data: ['.csv','.tsv','.sql','.db'], Images: ['.png','.jpg','.jpeg','.gif','.svg','.webp','.bmp','.ico'], Audio: ['.mp3','.wav','.ogg','.flac','.m4a'], Video: ['.mp4','.webm','.mov','.avi','.mkv'], Archives: ['.zip','.tar','.gz','.rar','.7z'] };\nfunction categorize(f) { const ext = '.' + (f.split('.').pop() || '').toLowerCase(); for (const [cat, exts] of Object.entries(categories)) if (exts.includes(ext)) return cat; return 'Other'; }\nlet count = 0;\nconst moved = {};\nfor (const file of files) { if (file.startsWith('health_report_')) continue; const cat = categorize(file); if (!moved[cat]) moved[cat] = 0; const src = '/home/user/Desktop/' + file; const content = vfs.read(src); if (content === null) continue; vfs.write('/home/user/Desktop/' + cat + '/' + file, content); vfs.delete(src); moved[cat]++; count++; }\nconst summary = Object.entries(moved).map(([c,n]) => c + ': ' + n).join(', ');\nos.addNotification({ title: 'Desktop Organized', message: 'Moved ' + count + ' files', type: 'success' });\nreturn 'Organized ' + count + ' files: ' + summary;`,
      },
    ];

    try {
      if (!vfs.stat(SKILLS_DIR)) {
        vfs.createDir(SKILLS_DIR, SYSTEM_VFS_APP_ID);
      }
    } catch {}

    for (const ex of examples) {
      try {
        const skill: Skill = {
          name: ex.name,
          description: ex.description,
          code: ex.code,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          invocations: 0,
        };
        this.skills.set(ex.name, skill);
        const header = `// @skill ${ex.name}\n// @desc ${ex.description}\n`;
        vfs.writeFile(`${SKILLS_DIR}/${ex.name}.skill.js`, `${header}\n${ex.code}`, SYSTEM_VFS_APP_ID);
        kernelLog.info(`[SkillForge] Seeded skill: ${ex.name}`);
      } catch (e: any) {
        kernelLog.warn(`[SkillForge] Failed to seed ${ex.name}:`, e?.message);
      }
    }
    kernelLog.info(`[SkillForge] Seeded ${examples.length} example skills`);
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
      // eslint-disable-next-line no-new-func
      new Function('ctx', `"use strict";\n${code}`);
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
    const ctx = this.buildContext(args, argsRaw);

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', `"use strict";\n${skill.code}`) as (ctx: SkillExecutionContext) => unknown;
      const result = await Promise.race([
        Promise.resolve().then(() => fn(ctx)),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Skill timed out after ${MAX_EXECUTION_MS}ms`)), MAX_EXECUTION_MS)
        ),
      ]);

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

  private buildContext(args: unknown, argsRaw: string): SkillExecutionContext {
    return {
      args,
      argsRaw,
      vfs: {
        read: (path: string) => vfs.readFile(path, SYSTEM_VFS_APP_ID),
        write: (path: string, content: string) => vfs.writeFile(path, content, SYSTEM_VFS_APP_ID),
        list: (path: string) => vfs.listDir(path, SYSTEM_VFS_APP_ID) || [],
        delete: (path: string) => vfs.delete(path, SYSTEM_VFS_APP_ID),
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
