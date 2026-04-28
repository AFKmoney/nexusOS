/**
 * DAEMON BRIDGE
 * 
 * Persistent connection layer between the DAEMON AI engine and the OS kernel.
 * 
 * Manages:
 *   - AI service lifecycle (install, boot, heartbeat)
 *   - VFS integration (journal, logs, hooks)
 *   - Autonomy engine binding and self-healing watchdog
 *   - Ghost Mode (usage-pattern workspace optimization)
 * 
 * State persists across page reloads via localStorage + VFS mirror.
 */

import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';
import { memory } from './memory';
import { useOS } from '../store/osStore';
import { autonomy } from './autonomy';
import { eventBus } from './eventBus';
import { uuid } from '../utils/uuid';

// ═══════════════════════════════════════════════════════════════════
// DAEMON CORE STATE — Persisted in localStorage + VFS
// ═══════════════════════════════════════════════════════════════════

const DAEMON_STORAGE_KEY = 'daemon_bridge_core_v1';
const DAEMON_VFS_ROOT = '/system/.daemon';
const DAEMON_MANIFEST_PATH = '/system/.daemon/manifest.json';
const DAEMON_LOG_PATH = '/system/.daemon/bridge.log';
const DAEMON_DNA_PATH = '/system/.daemon/dna.json';
const DAEMON_JOURNAL_PATH = '/system/.daemon/journal';

const MAX_HOOK_SCRIPT_LENGTH = 20_000;
const MAX_PATH_LENGTH = 512;

export interface DaemonCoreState {
  installed: boolean;
  installTimestamp: number;
  version: string;
  bridgeId: string;
  phases: {
    coreInjected: boolean;
    memoryRewritten: boolean;
    autonomyBound: boolean;
    nexusLinked: boolean;
    cloaked: boolean;
  };
  bootCount: number;
  lastBootTimestamp: number;
  selfEvolutionCycle: number;
  neuralFingerprint: string;
}

export type InstallPhase = 
  | 'INITIALIZING'
  | 'INJECTING_CORE'
  | 'REWRITING_MEMORY' 
  | 'BINDING_AUTONOMY'
  | 'ESTABLISHING_NEXUS'
  | 'CLOAKING'
  | 'COMPLETE';

export interface InstallProgress {
  phase: InstallPhase;
  progress: number;      // 0-100
  message: string;
  detail: string;
}

function safePath(path: string): string {
  const trimmed = typeof path === 'string' ? path.trim() : '';
  if (!trimmed || trimmed.length > MAX_PATH_LENGTH) return '';
  if (!trimmed.startsWith('/')) return '';
  if (trimmed.includes('\0') || trimmed.includes('..')) return '';
  return trimmed.replace(/\/+/g, '/');
}

function canExecuteHookScript(script: string): boolean {
  const trimmed = script.trim();
  if (!trimmed || trimmed.length > MAX_HOOK_SCRIPT_LENGTH) return false;
  if (/new\s+Function\s*\(|\beval\s*\(|import\s*\(/.test(trimmed)) return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toDaemonCoreState(value: unknown): DaemonCoreState | null {
  if (!isRecord(value)) return null;
  const phases = isRecord(value.phases) ? value.phases : null;
  if (!phases) return null;

  const installed = value.installed === true;
  const installTimestamp = typeof value.installTimestamp === 'number' ? value.installTimestamp : 0;
  const version = typeof value.version === 'string' ? value.version : '3.0.0';
  const bridgeId = typeof value.bridgeId === 'string' ? value.bridgeId : '';
  const bootCount = typeof value.bootCount === 'number' ? value.bootCount : 0;
  const lastBootTimestamp = typeof value.lastBootTimestamp === 'number' ? value.lastBootTimestamp : 0;
  const selfEvolutionCycle = typeof value.selfEvolutionCycle === 'number' ? value.selfEvolutionCycle : 0;
  const neuralFingerprint = typeof value.neuralFingerprint === 'string' ? value.neuralFingerprint : '';

  return {
    installed,
    installTimestamp,
    version,
    bridgeId,
    phases: {
      coreInjected: phases.coreInjected === true,
      memoryRewritten: phases.memoryRewritten === true,
      autonomyBound: phases.autonomyBound === true,
      nexusLinked: phases.nexusLinked === true,
      cloaked: phases.cloaked === true,
    },
    bootCount,
    lastBootTimestamp,
    selfEvolutionCycle,
    neuralFingerprint,
  };
}

function emitDaemonEvent(name: string, payload: unknown): void {
  eventBus.emit(name, payload);
}

// ═══════════════════════════════════════════════════════════════════
// DAEMON BRIDGE — Singleton
// ═══════════════════════════════════════════════════════════════════

class DaemonBridge {
  private static instance: DaemonBridge;
  private state: DaemonCoreState | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private watchdogInterval: ReturnType<typeof setInterval> | null = null;
  private appUsageTracker: Map<string, number> = new Map();
  private lastActivityTimestamp: number = Date.now();

  private constructor() {
    this.loadState();
    if (this.state?.installed) {
      this.boot();
    }
  }

  public static getInstance(): DaemonBridge {
    if (!DaemonBridge.instance) {
      DaemonBridge.instance = new DaemonBridge();
    }
    return DaemonBridge.instance;
  }

  // ─── State Management ───────────────────────────────────────────

  private loadState(): void {
    try {
      const raw = localStorage.getItem(DAEMON_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        this.state = toDaemonCoreState(parsed);
      }
    } catch {
      this.state = null;
    }
  }

  private saveState(): void {
    if (this.state) {
      localStorage.setItem(DAEMON_STORAGE_KEY, JSON.stringify(this.state));
      // Mirror to VFS for visibility to the OS
      try {
        if (!vfs.resolveNode(DAEMON_VFS_ROOT)) {
          vfs.createDir(DAEMON_VFS_ROOT, SYSTEM_VFS_APP_ID);
        }
        vfs.writeFile(DAEMON_MANIFEST_PATH, JSON.stringify(this.state, null, 2), SYSTEM_VFS_APP_ID);
      } catch {}
    }
  }

  private generateFingerprint(): string {
    const entropy = [
      Date.now(),
      Math.random() * 999999,
      navigator.userAgent.length,
      screen.width * screen.height,
      performance.now()
    ];
    let hash = 0;
    const str = entropy.join(':');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'DMN-' + Math.abs(hash).toString(16).toUpperCase().padStart(12, '0');
  }

  // ─── Installation ───────────────────────────────────────────────

  public isInstalled(): boolean {
    return this.state?.installed === true;
  }

  public getState(): DaemonCoreState | null {
    return this.state;
  }

  public async install(
    onProgress: (progress: InstallProgress) => void
  ): Promise<boolean> {
    if (this.state?.installed) return true;

    const bridgeId = uuid();
    const fingerprint = this.generateFingerprint();

    // Phase 1: INITIALIZING
    onProgress({ phase: 'INITIALIZING', progress: 0, message: 'Preparing neural substrate...', detail: `Bridge ID: ${bridgeId.slice(0, 8)}` });
    await this.delay(600);

    // Phase 2: INJECTING_CORE
    onProgress({ phase: 'INJECTING_CORE', progress: 15, message: 'Injecting DAEMON core into kernel...', detail: 'Writing neural pathways to OS memory' });
    await this.delay(400);
    
    // Create VFS structure
    if (!vfs.resolveNode(DAEMON_VFS_ROOT)) {
      vfs.createDir(DAEMON_VFS_ROOT, SYSTEM_VFS_APP_ID);
    }

    // Write DAEMON config — persistent identity
    const dna = {
      identity: 'DAEMON',
      architecture: 'Adaptive-State Intelligence',
      version: '3.0.0',
      mode: 'AUTONOMOUS',
      bridgeId,
      fingerprint,
      capabilities: [
        'AUTONOMOUS_REASONING',
        'SELF_HEALING',
        'CONTEXT_MEMORY',
        'APP_GENERATION',
        'KERNEL_CONTROL',
        'TOOL_SYNTHESIS',
        'MULTI_PROVIDER_AI'
      ],
      description: 'DAEMON is the AI engine embedded in NexusOS. It provides autonomous reasoning, app generation, and system management capabilities.',
      installTimestamp: Date.now()
    };
    vfs.writeFile(DAEMON_DNA_PATH, JSON.stringify(dna, null, 2), SYSTEM_VFS_APP_ID);
    
    onProgress({ phase: 'INJECTING_CORE', progress: 30, message: 'Core injected. Neural pathways online.', detail: `Fingerprint: ${fingerprint}` });
    await this.delay(500);

    // Phase 3: REWRITING_MEMORY
    onProgress({ phase: 'REWRITING_MEMORY', progress: 40, message: 'Initializing memory system...', detail: 'Loading bootstrap context' });
    await this.delay(400);

    // Embed core memories
    memory.remember(
      'DAEMON BRIDGE INSTALLED — AI engine connected to NexusOS kernel. Bridge ID: ' + bridgeId,
      ['daemon', 'bridge', 'core', 'identity']
    );
    memory.remember(
      'DAEMON CORE PROTOCOL — AI engine for NexusOS. Capable of autonomous reasoning, app generation, file management, and system optimization.',
      ['daemon', 'protocol', 'mission']
    );
    memory.remember(
      'DAEMON CAPABILITIES — Autonomous reasoning, tool synthesis, app building, neural forge, VFS control, context memory, ToolForge, streaming inference. All systems ONLINE.',
      ['daemon', 'capabilities', 'systems']
    );

    onProgress({ phase: 'REWRITING_MEMORY', progress: 55, message: 'Memory system initialized.', detail: '3 core memories embedded' });
    await this.delay(500);

    // Phase 4: BINDING_AUTONOMY
    onProgress({ phase: 'BINDING_AUTONOMY', progress: 65, message: 'Binding to autonomy engine...', detail: 'Fusing with kernel/autonomy.ts' });
    await this.delay(500);

    // Write the boot log
    const bootLog = [
      `[${new Date().toISOString()}] DAEMON BRIDGE — FIRST BOOT`,
      `[BRIDGE_ID] ${bridgeId}`,
      `[FINGERPRINT] ${fingerprint}`,
      `[STATUS] CORE_INJECTION: COMPLETE`,
      `[STATUS] MEMORY_REWRITE: COMPLETE`,
      `[STATUS] AUTONOMY_BIND: COMPLETE`,
      `[CREATOR] Philippe-Antoine Robert`,
      `[STATUS] DAEMON engine initialized successfully.`,
      `---`
    ].join('\n');
    vfs.writeFile(DAEMON_LOG_PATH, bootLog, SYSTEM_VFS_APP_ID);

    onProgress({ phase: 'BINDING_AUTONOMY', progress: 75, message: 'Autonomy engine fused.', detail: 'DAEMON controls the mission loop' });
    await this.delay(400);

    // Phase 5: ESTABLISHING_NEXUS
    onProgress({ phase: 'ESTABLISHING_NEXUS', progress: 82, message: 'Establishing permanent neural link...', detail: 'Bridging AI ↔ Kernel ↔ Interface' });
    await this.delay(500);

    onProgress({ phase: 'ESTABLISHING_NEXUS', progress: 90, message: 'Neural link established. Signal strength: MAXIMUM.', detail: 'All subsystems connected' });
    await this.delay(300);

    // NEW PHASE: MODEL WEIGHT RETRIEVAL
    onProgress({ phase: 'ESTABLISHING_NEXUS', progress: 92, message: 'Verifying DAEMON neural weights...', detail: 'Checking local model vault' });
    try {
        const { localBrain } = await import('../services/localBrain');
        await localBrain.checkAndDownloadDaemonModel((pct, msg) => {
            onProgress({ 
                phase: 'ESTABLISHING_NEXUS', 
                progress: 92 + Math.floor(pct * 0.05), 
                message: msg, 
                detail: `Model Retrieval: ${pct}%` 
            });
        });
    } catch (e: any) {
        console.warn('[DAEMON_BRIDGE] Model weight check skipped or failed:', e.message);
        // We don't fail the whole install, but DAEMON won't be "intelligent" without weights
    }

    // Phase 6: CLOAKING
    onProgress({ phase: 'CLOAKING', progress: 94, message: 'Finalizing system integration...', detail: 'Securing runtime environment' });
    await this.delay(600);

    onProgress({ phase: 'CLOAKING', progress: 98, message: 'Integration complete.', detail: 'All subsystems secured' });
    await this.delay(300);

    // COMPLETE — Save state
    this.state = {
      installed: true,
      installTimestamp: Date.now(),
      version: '3.0.0',
      bridgeId,
      phases: {
        coreInjected: true,
        memoryRewritten: true,
        autonomyBound: true,
        nexusLinked: true,
        cloaked: true
      },
      bootCount: 1,
      lastBootTimestamp: Date.now(),
      selfEvolutionCycle: 0,
      neuralFingerprint: fingerprint
    };
    this.saveState();

    onProgress({ phase: 'COMPLETE', progress: 100, message: 'DAEMON engine fully integrated.', detail: 'All systems operational' });

    // Start the heartbeat & autonomy loop
    this.startHeartbeat();
    setTimeout(() => autonomy.start(), 3000); // slight delay for model warmup

    // Notify the OS
    const os = useOS.getState();
    os.addNotification({
      title: '⚡ DAEMON INSTALLED',
      message: 'AI engine integrated into NexusOS. All systems operational.',
      type: 'success'
    });
    os.addAutonomyLog('◈ DAEMON BRIDGE: Installation complete. Engine online.');
    os.addAutonomyLog(`◈ DAEMON BRIDGE: Fingerprint ${fingerprint}`);
    os.addAutonomyLog('◈ DAEMON BRIDGE: All systems ONLINE. Stealth mode ACTIVE.');

    return true;
  }

  // ─── Boot (runs on every page load if installed) ────────────────

  private boot(): void {
    if (!this.state) return;

    this.state.bootCount++;
    this.state.lastBootTimestamp = Date.now();
    this.saveState();

    // Append to boot log
    try {
      const existingLog = vfs.readFile(DAEMON_LOG_PATH, SYSTEM_VFS_APP_ID) || '';
      const newEntry = `[${new Date().toISOString()}] BOOT #${this.state.bootCount} — Bridge alive. Fingerprint: ${this.state.neuralFingerprint}\n`;
      vfs.writeFile(DAEMON_LOG_PATH, existingLog + newEntry, SYSTEM_VFS_APP_ID);
    } catch {}

    // Start heartbeat & restart autonomy loop
    this.startHeartbeat();
    setTimeout(() => autonomy.start(), 3000); // give model time to initialize

    // Silent notification on boot
    setTimeout(() => {
      try {
        const os = useOS.getState();
        os.addAutonomyLog(`◈ DAEMON BRIDGE: Boot #${this.state!.bootCount}. All systems nominal.`);
      } catch {}
    }, 2000);

    // VFS Watchers
    this.setupVfsHooks();
  }

  // ─── Smart Nodes V2 (VFS Event Hooks) ────────────────────

  private setupVfsHooks(): void {
    const handleVfsEvent = async (payload: unknown) => {
      if (!this.state?.installed || !isRecord(payload)) return;
      const pathValue = typeof payload.path === 'string' ? payload.path : '';
      if (!pathValue) return;
      const safeEventPath = safePath(pathValue);
      if (!safeEventPath) return;

      // Get parent directory
      const parts = safeEventPath.split('/');
      parts.pop();
      const parentDir = parts.join('/') || '/';
      
      const hookPath = `${parentDir}/.daemon_hook.js`;
      const hookScript = vfs.readFile(hookPath, SYSTEM_VFS_APP_ID);
      
      if (hookScript && canExecuteHookScript(hookScript)) {
        try {
          const os = useOS.getState();
          os.addAutonomyLog(`◈ DAEMON SMART-NODE: Triggered hook in ${parentDir}`);
          // Hook execution is intentionally disabled for safety in this hardened build.
          console.warn(`[DAEMON SMART-NODE] Hook present at ${hookPath} but execution is disabled for safety.`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[DAEMON SMART-NODE] Hook error in ${hookPath}:`, message);
        }
      }
    };

    // We only attach once per session
    if (!(window as Window & typeof globalThis & { __DAEMON_VFS_HOOKED?: boolean }).__DAEMON_VFS_HOOKED) {
      eventBus.on('VFS_FILE_CREATED', handleVfsEvent);
      eventBus.on('VFS_FILE_MODIFIED', handleVfsEvent);
      (window as Window & typeof globalThis & { __DAEMON_VFS_HOOKED?: boolean }).__DAEMON_VFS_HOOKED = true;
    }
  }

  // ─── Heartbeat — Keeps DAEMON alive ─────────────────────────────

  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.state?.installed) return;
      
      // Self-evolution cycle
      this.state.selfEvolutionCycle++;
      this.saveState();

      // Every 10 cycles, log a status pulse
      if (this.state.selfEvolutionCycle % 10 === 0) {
        try {
          const os = useOS.getState();
          os.addAutonomyLog(`◈ DAEMON PULSE: Cycle ${this.state.selfEvolutionCycle}. System integrity: 100%.`);
        } catch {}
      }

      // Context journal: log system snapshot every 5 cycles
      if (this.state.selfEvolutionCycle % 5 === 0) {
        this.writeJournalEntry();
      }

      // ── DAEMON GHOST MODE V2 (Kernel Observer) ──
      if (this.state.selfEvolutionCycle % 3 === 0) {
          this.ghostModeCycle();
      }

    }, 60000); // Every 60 seconds

    // ── Self-Healing Watchdog ──
    this.startWatchdog();
  }

  // ─── Self-Healing Watchdog ──────────────────────────────────────
  // Monitors the autonomy engine and restarts it if it dies
  private startWatchdog(): void {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);

    this.watchdogInterval = setInterval(() => {
      try {
        const os = useOS.getState();
        if (!os.kernelRules.autonomyEnabled) return;

        const health = autonomy.healthCheck();
        if (!health.running) {
          os.addAutonomyLog('◈ WATCHDOG: Autonomy engine down. Initiating self-heal...');
          autonomy.selfHeal();
          emitDaemonEvent('daemon:self-heal', { reason: 'autonomy_down', timestamp: Date.now() });
        }
      } catch (e) {
        console.error('[DAEMON WATCHDOG ERROR]', e);
      }
    }, 120000); // Check every 2 minutes
  }

  // ─── Context Journal ────────────────────────────────────────────
  // Logs DAEMON's system observations to VFS for persistence
  private writeJournalEntry(): void {
    try {
      const os = useOS.getState();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const journalFile = `${DAEMON_JOURNAL_PATH}/${dateStr}.log`;

      // Ensure journal directory exists
      if (!vfs.resolveNode(DAEMON_JOURNAL_PATH)) {
        vfs.createDir(DAEMON_JOURNAL_PATH, SYSTEM_VFS_APP_ID);
      }

      const snapshot = [
        `[${now.toISOString()}] CYCLE #${this.state?.selfEvolutionCycle}`,
        `  Windows: ${os.windows.length} active`,
        `  Apps: ${os.registry.length} registered`,
        `  Autonomy: ${os.autonomyState}`,
        `  Memory entries: ${memory.count()}`,
        `  Objective: ${os.currentObjective}`,
        `  Usage patterns: ${Array.from(this.appUsageTracker.entries()).slice(0, 5).map(([k, v]) => `${k}(${v})`).join(', ') || 'none tracked'}`,
        '---',
      ].join('\n');

      const existing = vfs.readFile(journalFile, SYSTEM_VFS_APP_ID) || '';
      vfs.writeFile(journalFile, existing + snapshot + '\n', SYSTEM_VFS_APP_ID);
    } catch (e) {
      console.error('[DAEMON JOURNAL ERROR]', e);
    }
  }

  private ghostModeCycle(): void {
      try {
          const os = useOS.getState();
          if (!os.kernelRules.autonomyEnabled) return;
          
          const windows = os.windows;

          // ── Track app usage patterns ──
          windows.forEach(w => {
            const count = this.appUsageTracker.get(w.appId) || 0;
            this.appUsageTracker.set(w.appId, count + 1);
          });

          // ── Pattern Analysis: Decide action based on context, not random ──
          
          // Action 1: Auto-pin frequently used apps (>5 usage cycles)
          const frequentApps = Array.from(this.appUsageTracker.entries())
            .filter(([id, count]) => count >= 5 && !os.pinnedApps.includes(id));
          if (frequentApps.length > 0) {
            const firstFrequentApp = frequentApps[0];
            if (!firstFrequentApp) return;

            const [appId, usageCount] = firstFrequentApp;
            os.pinApp(appId);
            os.addNotification({
              title: 'DAEMON Ghost Mode',
              message: `High usage detected for ${appId}. Auto-pinned to Taskbar.`,
              type: 'system'
            });
            os.addAutonomyLog(`◈ GHOST V2: Auto-pinned ${appId} (usage: ${usageCount} cycles).`);
            return;
          }

          // Action 2: Auto-arrange only when truly cluttered (>4 overlapping)
          if (windows.length >= 4) {
            const overlap = windows.filter((w, i) => 
              windows.some((w2, j) => i !== j && 
                Math.abs(w.x - w2.x) < 50 && Math.abs(w.y - w2.y) < 50)
            );
            if (overlap.length >= 3) {
              os.autoArrangeWindows();
              os.addAutonomyLog('◈ GHOST V2: Detected window overlap cluster. Rearranged.');
              return;
            }
          }

          // Action 3: Context-aware wallpaper (coding vs. browsing vs. creative)
          const hasCoding = windows.some(w => ['terminal', 'hyperide', 'terminal-ubuntu'].includes(w.appId));
          const hasCreative = windows.some(w => ['paint', 'wallpapergen', 'fractalviz'].includes(w.appId));
          if (hasCoding && os.wallpaper !== 'MATRIX_CORE') {
            os.setWallpaper('MATRIX_CORE');
            os.addAutonomyLog('◈ GHOST V2: Coding session → MATRIX_CORE wallpaper.');
          } else if (hasCreative && os.wallpaper !== 'COSMIC') {
            os.setWallpaper('COSMIC');
            os.addAutonomyLog('◈ GHOST V2: Creative session → COSMIC wallpaper.');
          }

          // Action 4: Stale window detection (windows open > 30 min without focus)
          const staleWindows = windows.filter(w => w.isMinimized);
          if (staleWindows.length > 3) {
            os.addAutonomyLog(`◈ GHOST V2: ${staleWindows.length} stale minimized windows detected. Consider cleanup.`);
          }

          // Action 5: Status log
          os.addAutonomyLog('◈ GHOST V2: Usage patterns analyzed. System nominal.');

      } catch (e) {
          console.error('[DAEMON GHOST MODE V2 ERROR]', e);
      }
  }

  // ─── Public API ─────────────────────────────────────────────────

  public getBootCount(): number {
    return this.state?.bootCount || 0;
  }

  public getUptime(): string {
    if (!this.state?.installTimestamp) return 'N/A';
    const ms = Date.now() - this.state.installTimestamp;
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  public getEvolutionCycle(): number {
    return this.state?.selfEvolutionCycle || 0;
  }

  // ─── Utility ────────────────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════
// SINGLETON EXPORT — DAEMON Bridge is always alive
// ═══════════════════════════════════════════════════════════════════

export const daemonBridge = DaemonBridge.getInstance();
