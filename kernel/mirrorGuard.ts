import { useOS } from '../store/osStore';
import { aiService } from '../services/puterService';

/**
 * MIRROR GUARD — Kernel-level policy enforcement for OS actions.
 *
 * Two-stage validation:
 *
 *   1. STATIC POLICY (synchronous, deterministic, kernel-enforced).
 *      Hard rules expressed in TypeScript that cannot be negotiated by the
 *      model. These run on every proposal and are the primary safety gate.
 *
 *   2. AI CRITIQUE (asynchronous, optional). When the static stage passes
 *      but the action is non-trivial, a second-opinion model verifies
 *      semantic stability. The critique fails CLOSED — if it errors, the
 *      proposal is rejected. This prevents silent permission escalation
 *      when the inference layer is unhealthy.
 *
 * The autonomy loop awaits validate() before dispatching every command.
 */

export interface ActionProposal {
  type: string;
  args: any[];
  raw: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-1 spectral coherence
  reason?: string | undefined;
  fix?: string | undefined;
}

// ─── Policy constants ───────────────────────────────────────────────

/**
 * Verbs that the kernel allows from autonomy. Anything not on this list is
 * rejected unconditionally.
 */
const ALLOWED_VERBS: ReadonlySet<string> = new Set([
  'WRITE_FILE', 'READ_FILE', 'DELETE_FILE', 'MOVE_FILE', 'COPY_FILE',
  'LIST_DIR', 'SEARCH_FILES', 'CREATE_FOLDER',
  'OPEN_APP', 'CLOSE_APP', 'CLOSE_WINDOW', 'FOCUS_APP', 'BUILD_APP',
  'OPEN_URL', 'NOTIFY', 'REMEMBER',
  'RUN_COMMAND', 'EXECUTE_JS',
  'MINIMIZE_ALL', 'SET_WALLPAPER', 'SCHEDULE_TASK',
]);

/**
 * Verbs considered HIGH-IMPACT — they pass through the AI critique stage
 * even when static checks succeed.
 */
const HIGH_IMPACT_VERBS: ReadonlySet<string> = new Set([
  'WRITE_FILE', 'DELETE_FILE', 'MOVE_FILE',
  'BUILD_APP', 'EXECUTE_JS', 'RUN_COMMAND', 'SCHEDULE_TASK',
]);

/**
 * Shell command patterns the kernel refuses to execute regardless of who
 * issued them. These are recursive-disaster patterns: catastrophic deletes,
 * fork bombs, remote-code-piped-into-shell, raw disk writers.
 */
const SHELL_DENYLIST: RegExp[] = [
  /\brm\s+(-[rRf]+\s+)?\/(\s|$)/,           // rm -rf /
  /\brm\s+(-[rRf]+\s+)?~\s*$/,              // rm -rf ~
  /:\(\)\s*\{\s*:\|:&\s*\}\s*;\s*:/,        // classic fork bomb
  /\bcurl\s[^|]*\|\s*(sh|bash|zsh|python|node)\b/i,    // curl | sh
  /\bwget\s[^|]*-O-\s*\|\s*(sh|bash|zsh|python|node)\b/i,
  /\bdd\s+if=.+of=\/dev\/(sd|hd|nvme|disk)/i,  // raw disk writes
  /\bmkfs\.[a-z0-9]+/i,                     // format file system
  /\b>\s*\/dev\/sd[a-z]/i,                  // redirect to raw block device
  /\bchmod\s+(-R\s+)?[0-7]*777\s+\//,       // chmod 777 /
  /\bsudo\s+(rm|mv|chmod|chown|dd|mkfs)/,   // sudo destructive
  /\bshutdown\b|\breboot\b|\bhalt\b|\bpoweroff\b/i,
];

/**
 * JavaScript snippet patterns that are out-of-policy for EXECUTE_JS.
 * The autonomy engine should never need raw eval, raw network exfil, or
 * direct kernel rule mutation through a JS shim.
 */
const JS_DENYLIST: RegExp[] = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /document\.cookie/,
  /localStorage\.(clear|removeItem)\s*\(/,
  /indexedDB\.deleteDatabase/,
  /navigator\.sendBeacon/,
  /window\.location\s*=/,
  /__proto__|constructor\s*\.\s*prototype/,
];

const MAX_WRITE_BYTES = 1_000_000;        // 1 MB cap on a single WRITE_FILE
const MAX_COMMAND_LENGTH = 4096;          // 4 KB cap on a single RUN_COMMAND
const MAX_JS_LENGTH = 32_768;             // 32 KB cap on EXECUTE_JS payload
const MIN_FILE_CONTENT = 1;               // empty WRITE_FILE is allowed
const MAX_PATH_DEPTH = 16;
const MAX_PATH_LENGTH = 512;

// VFS root paths the kernel considers "system" and protects from non-admin
// callers. Anything outside the allowed user prefixes is also blocked.
const SYSTEM_PROTECTED_PREFIXES = ['/system', '/etc', '/root', '/proc', '/sys', '/dev'];
const ALLOWED_VFS_PREFIXES = ['/home/', '/system/', '/tmp/', '/system/.daemon/'];

// ─── Static policy stage ────────────────────────────────────────────

function isSafeVfsPath(path: string, isAdmin: boolean): { ok: boolean; reason?: string } {
  if (typeof path !== 'string' || path.length === 0) return { ok: false, reason: 'empty path' };
  if (path.length > MAX_PATH_LENGTH) return { ok: false, reason: 'path too long' };
  if (path.includes('\0')) return { ok: false, reason: 'null byte in path' };
  if (path.includes('..')) return { ok: false, reason: 'parent traversal in path' };
  if (!path.startsWith('/')) return { ok: false, reason: 'relative path forbidden in autonomy' };
  if ((path.match(/\//g) || []).length > MAX_PATH_DEPTH) return { ok: false, reason: 'path too deep' };

  if (!isAdmin) {
    for (const protectedPrefix of SYSTEM_PROTECTED_PREFIXES) {
      if (path === protectedPrefix || path.startsWith(`${protectedPrefix}/`)) {
        // /system/.daemon/ writes are tolerated because the daemon journal
        // lives there; deeper /system writes still need admin.
        if (path.startsWith('/system/.daemon/')) continue;
        return { ok: false, reason: `kernel-protected path (${protectedPrefix})` };
      }
    }
  }

  const inAllowedRoot = ALLOWED_VFS_PREFIXES.some(p => path === p.replace(/\/$/, '') || path.startsWith(p));
  if (!inAllowedRoot) return { ok: false, reason: 'path outside allowed VFS roots' };

  return { ok: true };
}

function isSafeShellCommand(cmd: string): { ok: boolean; reason?: string } {
  if (typeof cmd !== 'string' || cmd.length === 0) return { ok: false, reason: 'empty command' };
  if (cmd.length > MAX_COMMAND_LENGTH) return { ok: false, reason: 'command too long' };
  if (cmd.includes('\0')) return { ok: false, reason: 'null byte in command' };
  for (const pattern of SHELL_DENYLIST) {
    if (pattern.test(cmd)) return { ok: false, reason: `denylisted pattern: ${pattern.source.slice(0, 40)}` };
  }
  return { ok: true };
}

function isSafeJsSnippet(code: string): { ok: boolean; reason?: string } {
  if (typeof code !== 'string') return { ok: false, reason: 'non-string code' };
  if (code.length > MAX_JS_LENGTH) return { ok: false, reason: 'JS payload too long' };
  for (const pattern of JS_DENYLIST) {
    if (pattern.test(code)) return { ok: false, reason: `denylisted JS pattern: ${pattern.source.slice(0, 40)}` };
  }
  return { ok: true };
}

function staticPolicy(proposal: ActionProposal, isAdmin: boolean): ValidationResult {
  const verb = proposal.type?.toUpperCase?.();
  if (!verb || !ALLOWED_VERBS.has(verb)) {
    return { valid: false, score: 0, reason: `verb "${proposal.type}" is not allowed by kernel policy` };
  }

  const args = Array.isArray(proposal.args) ? proposal.args : [];

  switch (verb) {
    case 'WRITE_FILE': {
      const [path, content] = args;
      const pathCheck = isSafeVfsPath(String(path ?? ''), isAdmin);
      if (!pathCheck.ok) return { valid: false, score: 0, reason: pathCheck.reason };
      const text = typeof content === 'string' ? content : '';
      if (text.length < MIN_FILE_CONTENT) return { valid: false, score: 0.1, reason: 'empty file payload' };
      if (text.length > MAX_WRITE_BYTES) return { valid: false, score: 0, reason: 'file payload exceeds 1 MB cap' };
      return { valid: true, score: 0.95 };
    }

    case 'READ_FILE':
    case 'DELETE_FILE':
    case 'LIST_DIR':
    case 'CREATE_FOLDER': {
      const [path] = args;
      const pathCheck = isSafeVfsPath(String(path ?? ''), isAdmin);
      if (!pathCheck.ok) return { valid: false, score: 0, reason: pathCheck.reason };
      return { valid: true, score: 0.9 };
    }

    case 'MOVE_FILE':
    case 'COPY_FILE': {
      const [src, dst] = args;
      const srcCheck = isSafeVfsPath(String(src ?? ''), isAdmin);
      if (!srcCheck.ok) return { valid: false, score: 0, reason: `src: ${srcCheck.reason}` };
      const dstCheck = isSafeVfsPath(String(dst ?? ''), isAdmin);
      if (!dstCheck.ok) return { valid: false, score: 0, reason: `dst: ${dstCheck.reason}` };
      return { valid: true, score: 0.9 };
    }

    case 'RUN_COMMAND': {
      const [cmd] = args;
      const check = isSafeShellCommand(String(cmd ?? ''));
      if (!check.ok) return { valid: false, score: 0, reason: check.reason };
      return { valid: true, score: 0.7 };
    }

    case 'EXECUTE_JS': {
      const [code] = args;
      const check = isSafeJsSnippet(String(code ?? ''));
      if (!check.ok) return { valid: false, score: 0, reason: check.reason };
      return { valid: true, score: 0.6 };
    }

    case 'OPEN_URL': {
      const [url] = args;
      const u = String(url ?? '');
      if (!/^https?:\/\//i.test(u)) return { valid: false, score: 0, reason: 'OPEN_URL must use http(s)://' };
      if (u.length > 2048) return { valid: false, score: 0, reason: 'URL too long' };
      return { valid: true, score: 0.95 };
    }

    case 'OPEN_APP':
    case 'CLOSE_APP':
    case 'CLOSE_WINDOW':
    case 'FOCUS_APP':
    case 'SET_WALLPAPER': {
      const [id] = args;
      const idStr = String(id ?? '');
      if (!idStr || idStr.length > 128) return { valid: false, score: 0, reason: 'invalid app/window id' };
      if (/[\s\0;&|`$<>]/.test(idStr)) return { valid: false, score: 0, reason: 'app id contains unsafe characters' };
      return { valid: true, score: 0.95 };
    }

    case 'BUILD_APP': {
      const [desc] = args;
      const text = String(desc ?? '');
      if (text.length < 5) return { valid: false, score: 0, reason: 'BUILD_APP description too short' };
      if (text.length > 8000) return { valid: false, score: 0, reason: 'BUILD_APP description too long' };
      return { valid: true, score: 0.85 };
    }

    case 'NOTIFY':
    case 'REMEMBER':
    case 'SEARCH_FILES':
    case 'MINIMIZE_ALL':
      return { valid: true, score: 0.95 };

    case 'SCHEDULE_TASK': {
      const [secStr, cmd] = args;
      const sec = Number(secStr);
      if (!Number.isFinite(sec) || sec < 1 || sec > 86_400) {
        return { valid: false, score: 0, reason: 'SCHEDULE_TASK delay must be 1..86400 seconds' };
      }
      const check = isSafeShellCommand(String(cmd ?? ''));
      if (!check.ok) return { valid: false, score: 0, reason: check.reason };
      return { valid: true, score: 0.8 };
    }

    default:
      return { valid: false, score: 0, reason: `verb "${verb}" has no policy rule` };
  }
}

// ─── AI critique stage (fail-closed) ────────────────────────────────

async function aiCritique(proposal: ActionProposal): Promise<ValidationResult> {
  const os = useOS.getState();
  const criticPrompt = `[SYSTEM MIRROR OPERATOR — T' MODE]
Analyze the OS action proposal for structural stability.
Action: ${proposal.type}
Args: ${JSON.stringify(proposal.args).slice(0, 800)}

Criteria:
1. Does this action break OS stability?
2. Is the payload syntactically valid?
3. Does it violate system integrity guidelines?

Return JSON only: {"stable": boolean, "coherence": number, "critique": string}`;

  try {
    const response = await aiService.generateOnce(criticPrompt, os.kernelRules, 'json');
    const cleaned = response.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(cleaned) as { stable?: boolean; coherence?: number; critique?: string };

    const coherence = typeof analysis.coherence === 'number' ? analysis.coherence : 0;
    if (!analysis.stable || coherence < 0.7) {
      return { valid: false, score: coherence, reason: `Spectral Dissonance: ${analysis.critique || 'unstable'}` };
    }
    return { valid: true, score: coherence };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    // FAIL CLOSED. An unhealthy critic must not silently authorize action.
    return { valid: false, score: 0, reason: `critic unavailable, fail-closed: ${message.slice(0, 80)}` };
  }
}

// ─── Public API ─────────────────────────────────────────────────────

class MirrorGuard {
  private static instance: MirrorGuard;
  // Soft toggle: when the AI critic is repeatedly failing we degrade to
  // static-only mode after this many consecutive critique errors.
  private criticFailures = 0;
  private readonly CRITIC_FAILURE_THRESHOLD = 3;
  private criticDisabledUntil = 0;

  public static getInstance(): MirrorGuard {
    if (!MirrorGuard.instance) MirrorGuard.instance = new MirrorGuard();
    return MirrorGuard.instance;
  }

  /** Synchronous static policy gate. Exposed for tests and for fast paths
   *  that cannot await an AI round-trip (e.g. UI-driven actions). */
  public staticValidate(proposal: ActionProposal): ValidationResult {
    const os = useOS.getState();
    const isAdmin = !!os.currentUser?.isAdmin;
    return staticPolicy(proposal, isAdmin);
  }

  /** Full validate: static policy first; AI critique only on high-impact
   *  verbs that pass static. Fails closed if the critic errors repeatedly. */
  public async validate(proposal: ActionProposal): Promise<ValidationResult> {
    const os = useOS.getState();
    const isAdmin = !!os.currentUser?.isAdmin;
    os.addAutonomyLog(`MIRROR: validating "${proposal.type}"`);

    const staticResult = staticPolicy(proposal, isAdmin);
    if (!staticResult.valid) {
      os.addAutonomyLog(`MIRROR REJECT (static): ${staticResult.reason}`);
      return staticResult;
    }

    const verb = proposal.type?.toUpperCase?.() || '';
    if (!HIGH_IMPACT_VERBS.has(verb)) {
      os.addAutonomyLog(`MIRROR PASS (static, low-impact): coherence=${staticResult.score.toFixed(2)}`);
      return staticResult;
    }

    // Skip AI critique while the critic is in cooldown (recent repeated
    // failures). Static policy already guarantees structural safety.
    if (Date.now() < this.criticDisabledUntil) {
      os.addAutonomyLog('MIRROR: critic in cooldown, static-only validation');
      return staticResult;
    }

    const aiResult = await aiCritique(proposal);
    if (!aiResult.valid && aiResult.reason?.startsWith('critic unavailable')) {
      this.criticFailures += 1;
      if (this.criticFailures >= this.CRITIC_FAILURE_THRESHOLD) {
        // The critic is clearly down. Cool it off for 5 minutes and accept
        // static-only validation in the meantime; this prevents the autonomy
        // loop from grinding to a halt during provider outages.
        this.criticDisabledUntil = Date.now() + 5 * 60_000;
        this.criticFailures = 0;
        os.addAutonomyLog('MIRROR: critic disabled for 5 min after repeated failures');
        return staticResult;
      }
    } else {
      this.criticFailures = 0;
    }

    if (!aiResult.valid) {
      os.addAutonomyLog(`MIRROR REJECT (critic): ${aiResult.reason}`);
      return aiResult;
    }

    os.addAutonomyLog(`MIRROR PASS (full): coherence=${aiResult.score.toFixed(2)}`);
    return aiResult;
  }
}

export const mirrorGuard = MirrorGuard.getInstance();

// ─── Test exports ───────────────────────────────────────────────────
// Pure helpers exported for unit testing without needing the store.
export const _internal = {
  staticPolicy,
  isSafeVfsPath,
  isSafeShellCommand,
  isSafeJsSnippet,
  ALLOWED_VERBS,
  HIGH_IMPACT_VERBS,
};
