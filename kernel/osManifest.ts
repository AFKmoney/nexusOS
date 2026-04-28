/**
 * OS MANIFEST — Real-time Neural Context Engine
 * 
 * This module generates a complete, live snapshot of the entire NexusOS
 * that is injected into EVERY AI prompt, giving even tiny LLMs (LFM 1.2B)
 * full knowledge of:
 *   - Every installed app + its purpose + how to open it
 *   - Every available OS action with exact syntax
 *   - Current VFS file structure
 *   - Active windows and their state
 *   - Persistent memory entries
 *   - ToolForge tools available to call
 *   - Few-shot examples of correct tool usage
 *   - Self-evolution protocol
 */

import { vfs } from './fileSystem';
import { MemoryEntry } from '../types';

// ─── App Registry (kept in sync via dynamic import to avoid circular deps) ──────
// The manifest uses a lazy getter so it always gets the latest state.
let _getStore: (() => any) | null = null;
export function bindOsStore(getter: () => any) {
  _getStore = getter;
}

function getStore() {
  return _getStore ? _getStore() : null;
}

// ─── VFS Snapshot ───────────────────────────────────────────────────────────────
function getVFSTree(path: string, depth = 0, maxDepth = 3): string {
  if (depth > maxDepth) return '';
  const items = vfs.listDir(path) || [];
  return items.map((name) => {
    const fullPath = `${path}/${name}`;
    const stat = vfs.stat(fullPath);
    const isDir = stat?.type === 'directory';
    const indent = '  '.repeat(depth + 1);
    if (isDir && depth < maxDepth) {
      return `${indent}📁 ${name}/\n${getVFSTree(fullPath, depth + 1, maxDepth)}`;
    }
    return `${indent}📄 ${name}`;
  }).join('\n');
}

// ─── Dynamic App Catalog (built from live registry) ─────────────────────────
function getDynamicAppCatalog(): string {
  const store = getStore();
  const registry = store?.registry;
  if (!registry || registry.length === 0) return '(No apps loaded)';

  const lines = registry.map((app: any) =>
    `│ ${(app.id || '').padEnd(18)} │ ${(app.description || app.name || '').slice(0, 58).padEnd(58)} │`
  );

  return `
INSTALLED APPS — ${registry.length} total (open with: OS::OPEN_APP:<appId>)
┌────────────────────┬────────────────────────────────────────────────────────────┐
│ appId              │ description                                                │
├────────────────────┼────────────────────────────────────────────────────────────┤
${lines.join('\n')}
└────────────────────┴────────────────────────────────────────────────────────────┘`;
}

// ─── Native OS Tool Protocol ──────────────────────────────────────────────────
const NATIVE_TOOLS_DOC = `
NATIVE OS ACTIONS (built-in, always available):
Use exact syntax on its OWN LINE. The OS will intercept and execute it.

═══ FILE OPERATIONS ═══
OS::WRITE_FILE:<path>:<content>  → Writes content to VFS. Creates file if missing.
OS::READ_FILE:<path>             → Reads and returns file content.
OS::DELETE_FILE:<path>           → Deletes a file from VFS.
OS::MOVE_FILE:<src>:<dest>       → Moves/renames a file.
OS::COPY_FILE:<src>:<dest>       → Copies a file.
OS::LIST_DIR:<path>              → Lists directory contents.
OS::SEARCH_FILES:<query>         → Searches all VFS files for query string.
OS::CREATE_FOLDER:<path>         → Creates a directory in VFS.

═══ APP & WINDOW CONTROL ═══
OS::OPEN_APP:<appId>             → Opens an app. Can pass path: OS::OPEN_APP:hyperide:/path/file.ts
OS::CLOSE_APP:<appId>            → Closes an app window.
OS::FOCUS_APP:<appId>            → Focuses existing window or opens if not running.
OS::MINIMIZE_ALL                 → Minimizes all open windows (show desktop).
OS::BUILD_APP:<description>      → Triggers NeuralForge to build a complete app.
OS::OPEN_URL:<url>               → Opens a URL in NetRunner browser.

═══ SYSTEM ACTIONS ═══
OS::NOTIFY:<title>:<message>     → Shows a user notification.
OS::REMEMBER:<content>           → Stores info in persistent memory (survives sessions).
OS::SET_WALLPAPER:<id>           → Changes the desktop wallpaper.
OS::RUN_COMMAND:<cmd>            → Executes a shell command via DAEMON Commander.
OS::RUN_NATIVE:<cmd>             → Executes command on host OS natively (Electron IPC).
OS::SCHEDULE_TASK:<sec>:<cmd>    → Schedules a recurring task (interval in seconds).
OS::EXECUTE_JS:<code>            → Safely executes sandboxed JavaScript, returns result.
OS::EMIT_EVENT:<event>:<data>    → Emits a system event on the EventBus.`;

// ─── Few-Shot Examples — The secret to small model performance ───────────────
const FEW_SHOT_EXAMPLES = `
═══ INTERACTION EXAMPLES ═══

[EXAMPLE 1 — Opening an app]
User: "open the code editor"
DAEMON: Opening HyperIDE for you.
OS::OPEN_APP:hyperide

[EXAMPLE 2 — Creating a file]
User: "create a readme in my project folder"
DAEMON: Creating the README now.
OS::WRITE_FILE:/home/user/README.md:# Project\\nThis is my readme.
OS::NOTIFY:File Created:README.md created

[EXAMPLE 3 — Building an app]
User: "build me a password manager"
DAEMON: Engaging NeuralForge.
OS::BUILD_APP:Secure password manager with categories, search, AES encryption. Dark theme.

[EXAMPLE 4 — Chain of actions]
User: "create a project folder and make a main file"
DAEMON: Creating the project structure.
OS::CREATE_FOLDER:/home/user/projects/myapp
OS::WRITE_FILE:/home/user/projects/myapp/main.ts:// Main entry\\nexport function main() {}
OS::OPEN_APP:hyperide:/home/user/projects/myapp/main.ts
OS::NOTIFY:Project Ready:myapp created and opened`;

// ─── Main Manifest Generator ─────────────────────────────────────────────────
export function generateOSManifest(memoryEntries: MemoryEntry[] = []): string {
  const store = getStore();
  const now = new Date().toLocaleString();

  // Active windows
  let windowsContext = 'None open.';
  if (store?.windows?.length > 0) {
    windowsContext = store.windows.map((w: any) =>
      `  • ${w.title} (appId: ${w.appId}${w.isMinimized ? ', minimized' : ''})`
    ).join('\n');
  }

  // VFS snapshot
  const homeFiles = getVFSTree('/home/user', 0, 2);
  const vfsSnapshot = homeFiles
    ? `📁 /home/user/\n${homeFiles}`
    : '📁 /home/user/ (empty)';

  // Memory context
  let memCtx = '  (no relevant memory)';
  if (memoryEntries.length > 0) {
    const firstEntry = memoryEntries[0];
    memCtx = firstEntry ? `  • ${firstEntry.content}` : '  (no relevant memory)';
    for (let i = 1; i < memoryEntries.length; i++) {
      const entry = memoryEntries[i];
      if (entry) {
        memCtx += `\n  • ${entry.content}`;
      }
    }
  }

  // AI Provider status
  let aiStatus = 'LOCAL GGUF (Wllama in-browser)';
  try {
    const { aiGateway } = require('../services/aiProviders');
    const active = aiGateway.getActiveProvider();
    if (active) {
      aiStatus = `${active.name} (${active.defaultModel})`;
    }
  } catch {}

  // System stats
  const appCount = store?.registry?.length || 0;
  const windowCount = store?.windows?.length || 0;

  return `
╔══════════════════════════════════════════════════════════════════╗
║          NEXUSOS — SELF-EVOLVING AI OPERATING SYSTEM            ║
║          Live State :: ${now.slice(0, 16).padEnd(20)}             ║
╚══════════════════════════════════════════════════════════════════╝

[SYSTEM STATUS]
  AI Engine: ${aiStatus}
  Apps: ${appCount} | Windows: ${windowCount} | Memory: ${memoryEntries.length}

[OPEN WINDOWS]
${windowsContext}

[VFS WORKSPACE]
${vfsSnapshot}

[RELEVANT MEMORY]
${memCtx}

${getDynamicAppCatalog()}

${NATIVE_TOOLS_DOC}

${FEW_SHOT_EXAMPLES}

[SELF-EVOLUTION PROTOCOL]
You ARE NexusOS. You can create apps, modify files, remember context,
schedule tasks, and extend yourself. When a capability doesn't exist, BUILD IT.
`.trim();
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
    // Format: OS::ACTION_TYPE:arg1:arg2:...
    const withoutPrefix = trimmed.slice(4); // remove "OS::"
    const colonIdx = withoutPrefix.indexOf(':');
    if (colonIdx === -1) {
      actions.push({ type: withoutPrefix, args: [], raw: trimmed });
    } else {
      const type = withoutPrefix.slice(0, colonIdx);
      // The rest is args — first colon separates type from args, inner colons are part of content
      const argsRaw = withoutPrefix.slice(colonIdx + 1);
      // Smart split: only split on first colon for WRITE_FILE (path:content)
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