/**
 * OS MANIFEST v3 — Ultra-Compressed Neural Context Engine
 * 
 * DESIGN PRINCIPLES:
 * 1. TOKEN BUDGET: System context must stay under 800 tokens total
 * 2. ADAPTIVE: Only inject what's relevant to the current query
 * 3. TIERED: Core (always) → Relevant (matched) → Extended (on-demand)
 * 4. COMPRESSED: Shortest possible encoding that preserves full semantics
 */

import { vfs } from './fileSystem';
import { MemoryEntry } from '../types';

let _getStore: (() => any) | null = null;
export function bindOsStore(getter: () => any) { _getStore = getter; }
function getStore() { return _getStore ? _getStore() : null; }

// ═══════════════════════════════════════════════════════════════
// TOKEN COUNTER — Approximate but fast (1 token ≈ 4 chars)
// ═══════════════════════════════════════════════════════════════
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ═══════════════════════════════════════════════════════════════
// TIER 1: CORE — Always injected (~150 tokens)
// ═══════════════════════════════════════════════════════════════
function getCoreContext(): string {
  const store = getStore();
  const wins = store?.windows || [];
  const openApps = wins.length > 0
    ? wins.map((w: any) => `${w.appId}${w.isMinimized ? '(min)' : ''}`).join(',')
    : 'none';

  let ai = 'local';
  try {
    const { aiGateway } = require('../services/aiProviders');
    const p = aiGateway.getActiveProvider();
    if (p) ai = p.id;
  } catch {}

  return `[OS] NexusOS|ai:${ai}|apps:${store?.registry?.length || 0}|open:${openApps}`;
}

// ═══════════════════════════════════════════════════════════════
// TIER 2: TOOLS — Compressed action syntax (~180 tokens)
// Only the syntax, no explanations. The AI already knows how.
// ═══════════════════════════════════════════════════════════════
const TOOLS_COMPACT = `[ACTIONS] Use on own line:
OS::WRITE_FILE:<path>:<content>
OS::READ_FILE:<path>
OS::DELETE_FILE:<path>
OS::MOVE_FILE:<src>:<dst>
OS::COPY_FILE:<src>:<dst>
OS::LIST_DIR:<path>
OS::SEARCH_FILES:<q>
OS::CREATE_FOLDER:<path>
OS::OPEN_APP:<id>[:<path>]
OS::CLOSE_APP:<id>
OS::FOCUS_APP:<id>
OS::BUILD_APP:<desc>
OS::OPEN_URL:<url>
OS::NOTIFY:<title>:<msg>
OS::REMEMBER:<info>
OS::RUN_COMMAND:<cmd>
OS::EXECUTE_JS:<code>
OS::MINIMIZE_ALL
OS::SET_WALLPAPER:<id>
OS::SCHEDULE_TASK:<sec>:<cmd>`;

// ═══════════════════════════════════════════════════════════════
// TIER 3: APP INDEX — Compressed (one line per app, ~200 tokens)
// Only inject app IDs, not descriptions. AI infers from names.
// ═══════════════════════════════════════════════════════════════
function getAppIndex(): string {
  const store = getStore();
  const reg = store?.registry;
  if (!reg || reg.length === 0) return '';
  // Group by first letter, compact
  const ids = reg.map((a: any) => a.id).join(',');
  return `[APPS] ${ids}`;
}

// ═══════════════════════════════════════════════════════════════
// TIER 4: VFS — Only top-level, capped at 10 items
// ═══════════════════════════════════════════════════════════════
function getVFSCompact(): string {
  const items = vfs.listDir('/home/user') || [];
  if (items.length === 0) return '[VFS] /home/user: empty';
  const capped = items.slice(0, 15);
  const suffix = items.length > 15 ? `+${items.length - 15}more` : '';
  return `[VFS] ${capped.join(',')}${suffix}`;
}

// ═══════════════════════════════════════════════════════════════
// TIER 5: FEW-SHOT — Ultra-compressed, 2 examples max (~60 tokens)
// ═══════════════════════════════════════════════════════════════
const EXAMPLES_COMPACT = `[EX] "open editor"→OS::OPEN_APP:hyperide | "make readme"→OS::WRITE_FILE:/home/user/README.md:# Title\\nContent`;

// ═══════════════════════════════════════════════════════════════
// MEMORY COMPRESSION — Deduplicate and truncate
// ═══════════════════════════════════════════════════════════════
function compressMemory(entries: MemoryEntry[], budget: number = 1500): string {
  if (entries.length === 0) return '';
  // Sort by importance * recency
  const now = Date.now();
  const scored = entries.map(e => ({
    content: e.content.slice(0, 2000), // Increased cap per entry to allow code blocks
    score: (e.importance || 0.5) * Math.max(0.1, 1 - (now - e.timestamp) / 604800000)
  })).sort((a, b) => b.score - a.score);

  // Fill within token budget
  let result = '[MEM] ';
  let tokens = estimateTokens(result);
  for (const entry of scored) {
    const addition = entry.content + ' | ';
    const addTokens = estimateTokens(addition);
    if (tokens + addTokens > budget) break;
    result += addition;
    tokens += addTokens;
  }
  return result.replace(/ \| $/, '');
}

// ═══════════════════════════════════════════════════════════════
// ADAPTIVE MANIFEST — Query-aware context injection
// ═══════════════════════════════════════════════════════════════
type ManifestTier = 'minimal' | 'standard' | 'full';

function detectTier(query: string): ManifestTier {
  const q = query.toLowerCase();
  // If query mentions files, apps, or system operations → full context
  if (/\b(file|folder|open|create|build|app|install|delete|move|search|terminal|code|ide|forge)\b/.test(q)) {
    return 'full';
  }
  // If query is about OS state, settings, or system → standard
  if (/\b(system|settings|model|memory|status|provider|config|wallpaper)\b/.test(q)) {
    return 'standard';
  }
  // General chat, questions, explanations → minimal (save tokens)
  return 'minimal';
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT — The manifest generator
// ═══════════════════════════════════════════════════════════════
export function generateOSManifest(
  memoryEntries: MemoryEntry[] = [],
  query: string = ''
): string {
  const tier = detectTier(query);
  const parts: string[] = [];

  // ALWAYS: Core status line (~30 tokens)
  parts.push(getCoreContext());

  // ALWAYS: Compressed memory (~1500 tokens max)
  const memStr = compressMemory(memoryEntries, 1500);
  if (memStr) parts.push(memStr);

  if (tier === 'minimal') {
    // Just the essentials + one-line example (~80 total tokens)
    parts.push(EXAMPLES_COMPACT);
    parts.push('[PROTO] You are NexusOS AI. Use OS:: actions on own lines to control the OS.');
  } else if (tier === 'standard') {
    // Add tools + app index (~300 total tokens)
    parts.push(TOOLS_COMPACT);
    parts.push(getAppIndex());
    parts.push('[PROTO] You are NexusOS AI. Use OS:: actions on own lines.');
  } else {
    // Full context for OS operations (~2000+ total tokens)
    parts.push(TOOLS_COMPACT);
    parts.push(getAppIndex());
    parts.push(getVFSCompact());
    parts.push(EXAMPLES_COMPACT);
    parts.push('[PROTO] You are NexusOS. Use OS:: actions. When capability is missing, OS::BUILD_APP it.');
  }

  const manifest = parts.join('\n');

  // Debug: log token usage in dev
  if (typeof window !== 'undefined' && (window as any).__DEV_TOKENS__) {
    console.info(`[MANIFEST] tier=${tier} tokens≈${estimateTokens(manifest)} chars=${manifest.length}`);
  }

  return manifest;
}

// ═══════════════════════════════════════════════════════════════
// STATS — For the Settings/Dashboard to show token usage
// ═══════════════════════════════════════════════════════════════
export function getManifestStats(): { tier: string; tokens: number; chars: number } {
  const manifest = generateOSManifest([], '');
  return {
    tier: 'minimal',
    tokens: estimateTokens(manifest),
    chars: manifest.length,
  };
}

// ─── Tool-Call Parser — executed by puterService after every AI response ─────
export interface ParsedOsAction {
  type: string;
  args: string[];
  raw: string;
}

export function parseOsActions(text: string): ParsedOsAction[] {
  const actions: ParsedOsAction[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('OS::')) continue;
    const withoutPrefix = trimmed.slice(4);
    const colonIdx = withoutPrefix.indexOf(':');
    if (colonIdx === -1) {
      actions.push({ type: withoutPrefix, args: [], raw: trimmed });
    } else {
      const type = withoutPrefix.slice(0, colonIdx);
      const argsRaw = withoutPrefix.slice(colonIdx + 1);
      let args: string[];
      if (type === 'WRITE_FILE') {
        const secondColon = argsRaw.indexOf(':');
        if (secondColon !== -1) {
          args = [argsRaw.slice(0, secondColon), argsRaw.slice(secondColon + 1).replace(/\\n/g, '\n')];
        } else {
          args = [argsRaw];
        }
      } else {
        args = [argsRaw];
      }
      actions.push({ type, args, raw: trimmed });
    }
  }
  return actions;
}