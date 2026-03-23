
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
 */

import { vfs } from './fileSystem';

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
  return items.map(name => {
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

// ─── App Catalog ─────────────────────────────────────────────────────────────
const STATIC_APP_CATALOG = `
INSTALLED APPS (open with: OS::OPEN_APP:<appId>)
┌────────────────┬─────────────────────────────────────────────────────────┐
│ appId          │ description                                              │
├────────────────┼─────────────────────────────────────────────────────────┤
│ hyperide       │ Full-featured code editor with AI assistant             │
│ terminal       │ Linux-compatible shell terminal (bash-like)             │
│ netrunner      │ AI-powered browser with autonomous navigation           │
│ explorer       │ File system browser — VFS navigator                    │
│ neuralforge    │ AI app builder — generates full apps from prompts       │
│ modelmanager   │ Download & manage local GGUF AI models from HuggingFace│
│ notepad        │ Text editor with markdown preview                       │
│ dashboard      │ System overview: DAEMON status, metrics, autonomy feed  │
│ daemonjournal  │ Full autonomy log viewer with filters and export        │
│ agent          │ DAEMON agent UI — command your AI directly              │
│ settings       │ OS settings, AI config, zoom, wallpaper, models        │
│ calculator     │ Scientific calculator                                   │
│ webrunner      │ Direct iframe browser for any URL                      │
│ terminal-ubuntu│ Ubuntu-style terminal environment                       │
└────────────────┴─────────────────────────────────────────────────────────┘`;

// ─── Native OS Tool Protocol ──────────────────────────────────────────────────
const NATIVE_TOOLS_DOC = `
NATIVE OS ACTIONS (built-in, always available):
Use exact syntax on its OWN LINE. The OS will intercept and execute it.

OS::OPEN_APP:<appId>
  → Opens an app. Example: OS::OPEN_APP:hyperide
  → Opens with path: OS::OPEN_APP:hyperide:/home/user/myfile.ts

OS::WRITE_FILE:<path>:<content>
  → Writes content to the VFS. Creates file if it doesn't exist.
  → Example: OS::WRITE_FILE:/home/user/notes.md:# My Note\\nContent here

OS::READ_FILE:<path>
  → Reads and returns file content.
  → Example: OS::READ_FILE:/home/user/config.json

OS::NOTIFY:<title>:<message>
  → Shows a notification to the user.
  → Example: OS::NOTIFY:Task Complete:Your file has been saved.

OS::REMEMBER:<content>
  → Stores information in persistent memory (survives sessions).
  → Example: OS::REMEMBER:User prefers TypeScript over JavaScript.

OS::SEARCH_FILES:<query>
  → Searches all VFS files for the query string.
  → Example: OS::SEARCH_FILES:function calculateTotal

OS::CREATE_FOLDER:<path>
  → Creates a directory in VFS.
  → Example: OS::CREATE_FOLDER:/home/user/projects/myapp

OS::BUILD_APP:<description>
  → Triggers NeuralForge to build a complete app from description.
  → Example: OS::BUILD_APP:A todo list app with drag-and-drop sorting

OS::OPEN_URL:<url>
  → Opens a URL in NetRunner AI browser.
  → Example: OS::OPEN_URL:https://huggingface.co

OS::EXECUTE_JS:<code>
  → Safely executes sandboxed JavaScript and returns the result.
  → Example: OS::EXECUTE_JS:Math.sqrt(144)`;

// ─── Few-Shot Examples — The secret to small model performance ───────────────
const FEW_SHOT_EXAMPLES = `
═══ INTERACTION EXAMPLES (how to use OS tools correctly) ═══

[EXAMPLE 1 — Opening an app]
User: "open the code editor"
DAEMON: Opening HyperIDE for you.
OS::OPEN_APP:hyperide

[EXAMPLE 2 — Creating a file]
User: "create a readme in my project folder"  
DAEMON: Creating the README now.
OS::WRITE_FILE:/home/user/README.md:# Project\\nThis is my project readme.
OS::NOTIFY:File Created:README.md has been created at /home/user/

[EXAMPLE 3 — Answering a code question with context]
User: "how do I sort an array in JS?"
DAEMON: <thought>User wants a practical JS answer, no tools needed</thought>
Use Array.prototype.sort():
\`\`\`js
const arr = [3, 1, 4, 1, 5];
arr.sort((a, b) => a - b); // ascending: [1, 1, 3, 4, 5]
arr.sort((a, b) => b - a); // descending: [5, 4, 3, 1, 1]
\`\`\`
For objects: \`arr.sort((a, b) => a.name.localeCompare(b.name))\`

[EXAMPLE 4 — Building an app]
User: "build me a password manager"
DAEMON: Engaging NeuralForge to build the password manager.
OS::BUILD_APP:Secure password manager with categories, search, copy-to-clipboard, and AES encryption. Dark emerald theme.

[EXAMPLE 5 — Reading and analyzing a file]
User: "what's in my config file?"
DAEMON: Let me read it.
OS::READ_FILE:/home/user/config.json
[After receiving result]: I see your config has [X] settings. Here's what each does...

[EXAMPLE 6 — Chain of actions]
User: "create a project folder and make a main file"
DAEMON: Creating the project structure now.
OS::CREATE_FOLDER:/home/user/projects/myapp
OS::WRITE_FILE:/home/user/projects/myapp/main.ts:// Main entry point\\nexport function main() {}
OS::OPEN_APP:hyperide:/home/user/projects/myapp/main.ts
OS::NOTIFY:Project Ready:myapp project created and opened in HyperIDE
═════════════════════════════════════════════════════════════`;

// ─── Main Manifest Generator ─────────────────────────────────────────────────
export function generateOSManifest(memoryEntries: string[] = []): string {
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
  const memCtx = memoryEntries.length > 0
    ? memoryEntries.map(m => `  • ${m}`).join('\n')
    : '  (no relevant memory)';

  return `
╔══════════════════════════════════════════════════════════════════╗
║            NEXUSOS LIVE STATE — ${now.slice(0,16).padEnd(20)}   ║
╚══════════════════════════════════════════════════════════════════╝

[OPEN WINDOWS]
${windowsContext}

[VFS WORKSPACE]
${vfsSnapshot}

[RELEVANT MEMORY]
${memCtx}

${STATIC_APP_CATALOG}

${NATIVE_TOOLS_DOC}

${FEW_SHOT_EXAMPLES}
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
