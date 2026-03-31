
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         DAEMON ERROR GUARD — AI Output Validation Engine        ║
 * ║                                                                  ║
 * ║  A 5-layer defense system that categorically prevents the AI    ║
 * ║  from delivering broken, incomplete, or hallucinated outputs.   ║
 * ║                                                                  ║
 * ║  Layer 1 — Structural Integrity     (HTML, JSON, brackets)      ║
 * ║  Layer 2 — OS Protocol Validation   (OS:: action syntax)        ║
 * ║  Layer 3 — Hallucination Detection  (fake appIds, paths)        ║
 * ║  Layer 4 — Self-Correction Retry    (re-prompt with exact error) ║
 * ║  Layer 5 — Surgical Recovery        (auto-repair what we can)   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { localBrain } from '../services/localBrain';

// ─── Valid App Registry ────────────────────────────────────────────────────────
// Used by the hallucination detector to catch fake app IDs
const VALID_APP_IDS = new Set([
  'hyperide', 'terminal', 'netrunner', 'explorer', 'neuralforge',
  'modelmanager', 'notepad', 'dashboard', 'daemonjournal', 'agent',
  'settings', 'calculator', 'webrunner', 'terminal-ubuntu', 'wallpaper',
]);

// Dynamically extend valid app IDs from the OS registry (includes forged apps)
function getValidAppIds(): Set<string> {
  try {
    const { useOS } = require('../store/osStore');
    const registry = useOS.getState().registry;
    const dynamicIds = new Set(VALID_APP_IDS);
    registry.forEach((app: any) => dynamicIds.add(app.id));
    return dynamicIds;
  } catch {
    return VALID_APP_IDS;
  }
}

// ─── Error Types ───────────────────────────────────────────────────────────────
export type ErrorType =
  | 'HTML_INCOMPLETE'
  | 'HTML_MISSING_DOCTYPE'
  | 'JSON_MALFORMED'
  | 'BRACKETS_UNBALANCED'
  | 'OS_ACTION_INVALID'
  | 'APP_ID_HALLUCINATED'
  | 'RESPONSE_EMPTY'
  | 'RESPONSE_TRUNCATED'
  | 'CODE_BLOCK_UNCLOSED';

export interface ValidationError {
  type: ErrorType;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  autoFixed: boolean;
}

export interface ValidationResult {
  valid: boolean;
  output: string;
  errors: ValidationError[];
  retries: number;
  fixApplied: boolean;
}

// ─── LAYER 1: Structural Integrity Validators ──────────────────────────────────

function validateHTML(text: string): ValidationError[] {
  const errors: ValidationError[] = [];
  // Only validate if this looks like an HTML response
  if (!text.includes('<!DOCTYPE') && !text.includes('<html') && !text.includes('<body')) {
    return errors;
  }
  if (!text.includes('<!DOCTYPE')) {
    errors.push({ type: 'HTML_MISSING_DOCTYPE', message: 'Missing <!DOCTYPE html>', severity: 'critical', autoFixed: false });
  }
  if (!text.includes('</html>') && !text.includes('</body>')) {
    errors.push({ type: 'HTML_INCOMPLETE', message: 'HTML is truncated — missing </html>', severity: 'critical', autoFixed: false });
  }
  return errors;
}

function validateJSON(text: string, mode: string): ValidationError[] {
  if (mode !== 'json') return [];
  try {
    JSON.parse(text.trim());
    return [];
  } catch(e: any) {
    return [{ type: 'JSON_MALFORMED', message: `Invalid JSON: ${e.message}`, severity: 'critical', autoFixed: false }];
  }
}

function validateBrackets(text: string): ValidationError[] {
  // Only check code blocks
  const codeBlocks = text.matchAll(/```[\w]*\n([\s\S]*?)```/g);
  const errors: ValidationError[] = [];
  for (const block of codeBlocks) {
    const code = block[1];
    const opens = (code.match(/\{/g) || []).length + (code.match(/\[/g) || []).length + (code.match(/\(/g) || []).length;
    const closes = (code.match(/\}/g) || []).length + (code.match(/\]/g) || []).length + (code.match(/\)/g) || []).length;
    if (Math.abs(opens - closes) > 3) { // Allow minor imbalance from strings/comments
      errors.push({ type: 'BRACKETS_UNBALANCED', message: `Code block has unbalanced brackets (${opens} opens vs ${closes} closes)`, severity: 'warning', autoFixed: false });
    }
  }
  // Check for unclosed code fence
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    errors.push({ type: 'CODE_BLOCK_UNCLOSED', message: 'Unclosed code block fence (odd number of ``` markers)', severity: 'warning', autoFixed: false });
  }
  return errors;
}

// ─── LAYER 2: OS Protocol Validator ───────────────────────────────────────────

const VALID_OS_ACTIONS = new Set([
  'OPEN_APP', 'WRITE_FILE', 'READ_FILE', 'NOTIFY', 'REMEMBER',
  'SEARCH_FILES', 'CREATE_FOLDER', 'BUILD_APP', 'OPEN_URL', 'EXECUTE_JS',
  // v2.0 actions
  'DELETE_FILE', 'MOVE_FILE', 'COPY_FILE', 'LIST_DIR',
  'CLOSE_APP', 'FOCUS_APP', 'MINIMIZE_ALL', 'SET_WALLPAPER',
  'RUN_COMMAND', 'SCHEDULE_TASK', 'EMIT_EVENT',
]);

function validateOsActions(text: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('OS::')) continue;
    const rest = trimmed.slice(4);
    const colonIdx = rest.indexOf(':');
    const actionType = colonIdx === -1 ? rest : rest.slice(0, colonIdx);
    if (!VALID_OS_ACTIONS.has(actionType)) {
      errors.push({
        type: 'OS_ACTION_INVALID',
        message: `Unknown OS action: "OS::${actionType}". Valid actions: ${[...VALID_OS_ACTIONS].join(', ')}`,
        severity: 'warning',
        autoFixed: false,
      });
    }
    // Check WRITE_FILE has both path and content
    if (actionType === 'WRITE_FILE' && colonIdx !== -1) {
      const afterAction = rest.slice(colonIdx + 1);
      if (!afterAction.includes(':')) {
        errors.push({
          type: 'OS_ACTION_INVALID',
          message: `OS::WRITE_FILE missing content. Format: OS::WRITE_FILE:/path:content`,
          severity: 'warning',
          autoFixed: false,
        });
      }
    }
  }
  return errors;
}

// ─── LAYER 3: Hallucination Detector ──────────────────────────────────────────

function detectHallucinations(text: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for fake app IDs in OS::OPEN_APP calls
  const openAppMatches = text.matchAll(/OS::OPEN_APP:([a-zA-Z0-9_\-]+)/g);
  for (const match of openAppMatches) {
    const appId = match[1].split(':')[0];
    const validIds = getValidAppIds();
    if (!validIds.has(appId.toLowerCase())) {
      errors.push({
        type: 'APP_ID_HALLUCINATED',
        message: `Hallucinated app ID: "${appId}". Not found in registry.`,
        severity: 'warning',
        autoFixed: false,
      });
    }
  }

  return errors;
}

// ─── LAYER 4 & 5: Self-Correction & Surgical Recovery ─────────────────────────

function surgicalRepair(text: string, errors: ValidationError[]): string {
  let repaired = text;
  let anyFix = false;

  for (const err of errors) {
    // Auto-repair: close unclosed code blocks
    if (err.type === 'CODE_BLOCK_UNCLOSED') {
      repaired += '\n```';
      err.autoFixed = true;
      anyFix = true;
    }
    // Auto-repair: close incomplete HTML
    if (err.type === 'HTML_INCOMPLETE') {
      if (!repaired.includes('</body>')) repaired += '\n</body>';
      if (!repaired.includes('</html>')) repaired += '\n</html>';
      err.autoFixed = true;
      anyFix = true;
    }
    // Auto-repair: replace hallucinated app IDs with closest valid match
    if (err.type === 'APP_ID_HALLUCINATED') {
      const fakeMatch = err.message.match(/"([^"]+)"/);
      if (fakeMatch) {
        const fakeId = fakeMatch[1];
        // Find closest valid ID by character overlap
        let bestMatch = 'explorer';
        let bestScore = 0;
        for (const validId of VALID_APP_IDS) {
          const score = [...fakeId].filter(c => validId.includes(c)).length / fakeId.length;
          if (score > bestScore) { bestScore = score; bestMatch = validId; }
        }
        repaired = repaired.replace(new RegExp(`OS::OPEN_APP:${fakeId}`, 'gi'), `OS::OPEN_APP:${bestMatch}`);
        err.autoFixed = true;
        anyFix = true;
      }
    }
  }

  return repaired;
}

// ─── Self-Correction Prompt Builder ────────────────────────────────────────────
function buildCorrectionPrompt(originalPrompt: string, brokenOutput: string, errors: ValidationError[]): string {
  const errorList = errors
    .filter(e => !e.autoFixed && e.severity !== 'info')
    .map(e => `  ❌ [${e.type}]: ${e.message}`)
    .join('\n');

  if (!errorList) return '';

  return `[SELF_CORRECTION_REQUIRED]
The previous response contained the following critical errors that must be fixed:

${errorList}

RULES FOR CORRECTION:
1. Output ONLY the corrected version — no explanation.
2. Fix ALL listed errors completely.
3. For HTML: ensure <!DOCTYPE html> is present and document ends with </html>.
4. For JSON: ensure output is valid parseable JSON.
5. For OS actions: use only valid action types from the approved list.
6. Do not truncate. Output the COMPLETE corrected response.

ORIGINAL USER REQUEST: ${originalPrompt.slice(0, 300)}

BROKEN OUTPUT (last 400 chars for context):
${brokenOutput.slice(-400)}

CORRECTED OUTPUT:`;
}

// ─── Main ErrorGuard Class ─────────────────────────────────────────────────────
export class ErrorGuard {
  private static instance: ErrorGuard;
  private correctionStats = { total: 0, corrected: 0, autoFixed: 0, failed: 0 };

  public static getInstance(): ErrorGuard {
    if (!ErrorGuard.instance) ErrorGuard.instance = new ErrorGuard();
    return ErrorGuard.instance;
  }

  // ── Full Validation Pipeline ────────────────────────────────────────────────
  public validate(text: string, mode: string = 'chat'): { valid: boolean; errors: ValidationError[] } {
    if (!text || text.trim().length < 2) {
      return {
        valid: false,
        errors: [{ type: 'RESPONSE_EMPTY', message: 'AI returned empty response', severity: 'critical', autoFixed: false }]
      };
    }

    const errors: ValidationError[] = [
      ...validateHTML(text),
      ...validateJSON(text, mode),
      ...validateBrackets(text),
      ...validateOsActions(text),
      ...detectHallucinations(text),
    ];

    const criticalErrors = errors.filter(e => e.severity === 'critical');
    return { valid: criticalErrors.length === 0, errors };
  }

  // ── Full Guard Pipeline: Validate → Repair → Retry if needed ───────────────
  public async guard(
    output: string,
    originalPrompt: string,
    systemPrompt: string,
    mode: string = 'chat',
    maxRetries: number = 2
  ): Promise<ValidationResult> {
    this.correctionStats.total++;

    let currentOutput = output;
    let attempts = 0;
    const allErrors: ValidationError[] = [];

    while (attempts <= maxRetries) {
      const { valid, errors } = this.validate(currentOutput, mode);
      allErrors.push(...errors);

      if (valid) {
        if (attempts > 0) this.correctionStats.corrected++;
        return { valid: true, output: currentOutput, errors: allErrors, retries: attempts, fixApplied: attempts > 0 };
      }

      // Try surgical repair first (instant, no LLM needed)
      const repaired = surgicalRepair(currentOutput, errors);
      const { valid: repairedValid } = this.validate(repaired, mode);
      if (repairedValid && repaired !== currentOutput) {
        this.correctionStats.autoFixed++;
        return { valid: true, output: repaired, errors: allErrors, retries: attempts, fixApplied: true };
      }

      const criticalErrors = errors.filter(e => e.severity === 'critical' && !e.autoFixed);
      if (criticalErrors.length === 0) {
        // Only warnings — return as-is
        return { valid: true, output: repaired, errors: allErrors, retries: attempts, fixApplied: repaired !== currentOutput };
      }

      // Escalate to LLM self-correction
      if (attempts < maxRetries && localBrain.isReady()) {
        const correctionPrompt = buildCorrectionPrompt(originalPrompt, currentOutput, criticalErrors);
        if (!correctionPrompt) break;

        try {
          const corrected = await localBrain.generate(correctionPrompt, systemPrompt);
          if (corrected && corrected.trim().length > 20) {
            currentOutput = corrected.trim();
          }
        } catch {
          break;
        }
      }

      attempts++;
    }

    // All retries exhausted — return best available with surgical repair applied
    this.correctionStats.failed++;
    const finalOutput = surgicalRepair(currentOutput, allErrors);
    return {
      valid: false,
      output: finalOutput,
      errors: allErrors,
      retries: attempts,
      fixApplied: finalOutput !== output,
    };
  }

  // ── Stream Mode Guard: token-level monitoring ──────────────────────────────
  // Detects truncation mid-stream and signals completion status
  public analyzeStreamCompletion(fullText: string, mode: string = 'chat'): {
    complete: boolean;
    issue: string | null;
    needsContinuation: boolean;
    continuationHint: string;
  } {
    // HTML completion check
    if (fullText.includes('<!DOCTYPE') || fullText.includes('<html')) {
      const hasClose = fullText.includes('</html>') || fullText.includes('</body>');
      if (!hasClose) {
        return {
          complete: false,
          issue: 'HTML truncated — missing </html>',
          needsContinuation: true,
          continuationHint: 'Continue the HTML from where you stopped. End with </body></html>.',
        };
      }
    }
    // JSON completion check
    if (mode === 'json') {
      try { JSON.parse(fullText.trim()); }
      catch {
        return {
          complete: false,
          issue: 'JSON incomplete or malformed',
          needsContinuation: true,
          continuationHint: 'Complete the JSON object. Ensure all brackets are closed.',
        };
      }
    }
    // Unclosed code fence
    const fences = (fullText.match(/```/g) || []).length;
    if (fences % 2 !== 0) {
      return {
        complete: false,
        issue: 'Code fence not closed',
        needsContinuation: false,
        continuationHint: 'Close the code block with ```.',
      };
    }
    return { complete: true, issue: null, needsContinuation: false, continuationHint: '' };
  }

  public getStats() { return { ...this.correctionStats }; }

  public resetStats() {
    this.correctionStats = { total: 0, corrected: 0, autoFixed: 0, failed: 0 };
  }
}

export const errorGuard = ErrorGuard.getInstance();
