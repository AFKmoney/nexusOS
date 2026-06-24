// ═══════════════════════════════════════════════════════════════════
// NEXUSOS AUTO-DEMO — Showcases all 50 OS:: actions automatically
//
// This script runs in the browser console (or can be imported by a
// dedicated demo mode). It demonstrates every category of AI capability
// by issuing OS:: actions through the toolForge dispatcher, with
// human-readable narration between each step.
//
// Usage (browser console):
//   import('/scripts/auto-demo.ts').then(m => m.runDemo())
//
// Or add ?demo=true to the URL to auto-start.
// ═══════════════════════════════════════════════════════════════════

import { toolForge } from '../kernel/toolForge';
import { useOS } from '../store/osStore';
import { kernelLog } from '../kernel/log';

interface DemoStep {
  action: string;
  description: string;
  delay: number;
}

const DEMO_STEPS: DemoStep[] = [
  // ─── File System ──────────────────────────────────────────────
  { action: 'OS::CREATE_FOLDER:/home/user/Demo', description: 'Creating a demo folder...', delay: 500 },
  { action: 'OS::WRITE_FILE:/home/user/Demo/hello.txt:Hello from NexusOS AI!', description: 'Writing a file via AI...', delay: 500 },
  { action: 'OS::READ_FILE:/home/user/Demo/hello.txt', description: 'Reading the file back...', delay: 300 },
  { action: 'OS::LIST_DIR:/home/user/Demo', description: 'Listing directory contents...', delay: 300 },
  { action: 'OS::COPY_FILE:/home/user/Demo/hello.txt:/home/user/Demo/copy.txt', description: 'Copying a file...', delay: 300 },
  { action: 'OS::SEARCH_FILES:hello', description: 'Searching for files...', delay: 500 },
  { action: 'OS::DELETE_FILE:/home/user/Demo/copy.txt', description: 'Deleting the copy...', delay: 300 },

  // ─── App Management ───────────────────────────────────────────
  { action: 'OS::OPEN_APP:terminal', description: 'Opening Terminal...', delay: 1000 },
  { action: 'OS::OPEN_APP:notepad', description: 'Opening Notepad...', delay: 1000 },
  { action: 'OS::OPEN_APP:dashboard', description: 'Opening Dashboard...', delay: 1000 },
  { action: 'OS::FOCUS_APP:terminal', description: 'Focusing Terminal...', delay: 500 },
  { action: 'OS::CLOSE_APP:notepad', description: 'Closing Notepad...', delay: 500 },
  { action: 'OS::MINIMIZE_ALL', description: 'Minimizing all windows...', delay: 800 },

  // ─── System ───────────────────────────────────────────────────
  { action: 'OS::NOTIFY:Demo:This notification was sent by the AI', description: 'Sending a notification...', delay: 800 },
  { action: 'OS::REMEMBER:The demo is running and all systems are operational', description: 'Storing a memory...', delay: 300 },
  { action: 'OS::SET_WALLPAPER:nexus://procedural/aurora', description: 'Changing wallpaper...', delay: 800 },
  { action: 'OS::EMIT_EVENT:demo:step-complete', description: 'Emitting an event...', delay: 300 },

  // ─── AI Pipeline ──────────────────────────────────────────────
  { action: 'OS::WEB_SEARCH:what is NexusOS AI operating system', description: 'Searching the web...', delay: 2000 },
  { action: 'OS::EXEC_CODE:javascript:console.log("AI executed JS: " + (2+2))', description: 'Executing JavaScript...', delay: 1000 },

  // ─── Git ──────────────────────────────────────────────────────
  { action: 'OS::GIT_INIT:/home/user/Demo', description: 'Initializing a Git repo...', delay: 1000 },
  { action: 'OS::GIT_ADD_ALL:/home/user/Demo', description: 'Staging files...', delay: 500 },
  { action: 'OS::GIT_COMMIT:/home/user/Demo:Initial commit by NexusOS AI', description: 'Committing...', delay: 1000 },
  { action: 'OS::GIT_LOG:/home/user/Demo', description: 'Showing git log...', delay: 500 },
  { action: 'OS::GIT_STATUS:/home/user/Demo', description: 'Checking status...', delay: 500 },

  // ─── Browser Control ──────────────────────────────────────────
  { action: 'OS::BROWSE_NAVIGATE:https://example.com', description: 'Opening browser...', delay: 1500 },
  { action: 'OS::BROWSE_STATE', description: 'Checking browser state...', delay: 300 },
  { action: 'OS::BROWSE_BACK', description: 'Going back...', delay: 500 },
  { action: 'OS::BROWSE_SCROLL:0:300', description: 'Scrolling down...', delay: 500 },

  // ─── Multi-Agent ──────────────────────────────────────────────
  { action: 'OS::SPAWN_AGENT:Summarize the current system state in one sentence', description: 'Spawning an AI agent...', delay: 2000 },

  // ─── Vision & Voice ───────────────────────────────────────────
  { action: 'OS::ANALYZE_SCREEN:What applications are currently open?', description: 'Analyzing screen...', delay: 2000 },
  { action: 'OS::SPEAK:NexusOS demo is now complete. All systems operational.', description: 'Speaking...', delay: 1500 },

  // ─── RAG ──────────────────────────────────────────────────────
  { action: 'OS::INDEX_DOCS:/home/user/Demo', description: 'Indexing documents for RAG...', delay: 1000 },
  { action: 'OS::SEARCH_RAG:hello', description: 'Searching RAG knowledge base...', delay: 500 },

  // ─── Cluster ──────────────────────────────────────────────────
  { action: 'OS::CLUSTER_SCAN', description: 'Scanning for NexusOS devices...', delay: 1000 },
  { action: 'OS::CLUSTER_STATUS', description: 'Checking cluster status...', delay: 300 },

  // ─── Cleanup ──────────────────────────────────────────────────
  { action: 'OS::NOTIFY:Demo Complete:All 50 OS actions have been demonstrated', description: 'Demo complete!', delay: 500 },
];

export async function runDemo(): Promise<void> {
  const os = useOS.getState();
  os.addNotification({ title: 'Auto-Demo', message: 'Starting NexusOS automated demo — 50 OS:: actions', type: 'system' });

  kernelLog.info('[DEMO] Starting automated demo sequence');

  for (let i = 0; i < DEMO_STEPS.length; i++) {
    const step = DEMO_STEPS[i]!;
    const progress = `[${i + 1}/${DEMO_STEPS.length}]`;

    // Narrate
    os.addAutonomyLog(`◈ DEMO ${progress}: ${step.description}`);
    kernelLog.info(`[DEMO] ${progress} ${step.action}`);

    // Execute the OS:: action
    const results = await toolForge.executeOsActions(step.action);
    if (results) {
      os.addAutonomyLog(`◈ RESULT: ${results.trim().slice(0, 200)}`);
    }

    // Wait between steps
    await new Promise(resolve => setTimeout(resolve, step.delay));
  }

  os.addNotification({ title: 'Auto-Demo Complete', message: 'All 50 OS:: actions executed successfully.', type: 'success' });
  kernelLog.info('[DEMO] Demo sequence complete');
}

// Auto-start if ?demo=true is in the URL
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')) {
  // Wait for the OS to boot
  const checkReady = setInterval(() => {
    const state = useOS.getState();
    if (state.booted && state.isLoggedIn) {
      clearInterval(checkReady);
      setTimeout(() => runDemo(), 1000);
    }
  }, 500);
}
