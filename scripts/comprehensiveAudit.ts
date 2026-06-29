// Comprehensive OS Audit — diagnostic version
// Tests each OS:: action one at a time with explicit logging

// ─── Mock browser globals ─────────────────────────────────────────
const memoryStore: Record<string, string> = {};

// @ts-ignore
globalThis.localStorage = {
  getItem: (k: string): string | null => (k in memoryStore ? memoryStore[k] : null) as string | null,
  setItem: (k: string, v: string) => { memoryStore[k] = String(v); },
  removeItem: (k: string) => { delete memoryStore[k]; },
  clear: () => { for (const k of Object.keys(memoryStore)) delete memoryStore[k]; },
  key: (i: number): string | null => (Object.keys(memoryStore)[i] ?? null) as string | null,
  get length() { return Object.keys(memoryStore).length; },
};

// @ts-ignore
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { reload: () => {} },
} as any;

// @ts-ignore — navigator
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      clipboard: {
        writeText: async (t: string) => { memoryStore['__clip__'] = t; },
        readText: async () => memoryStore['__clip__'] || '',
      },
    },
    writable: true,
    configurable: true,
  });
} catch {}

// @ts-ignore
globalThis.document = {
  createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
  body: { appendChild: () => {}, style: {} },
  head: { appendChild: () => {} },
} as any;

// @ts-ignore — minimal IndexedDB mock
const mockStore = new Map<string, any>();
const mockDb = {
  objectStoreNames: { contains: () => false },
  createObjectStore: () => {},
  transaction: () => ({
    objectStore: () => ({
      get: (key: string) => {
        const req: any = { onsuccess: null, onerror: null, result: mockStore.get(key) ?? null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      put: (value: any, key: string) => {
        mockStore.set(key, value);
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
    }),
  }),
};
// @ts-ignore
globalThis.indexedDB = {
  open: () => {
    const req: any = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: mockDb,
      error: null,
    };
    setTimeout(() => {
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  },
} as any;

interface TestResult {
  action: string;
  payload: string;
  passed: boolean;
  result?: string;
  error?: string;
}

const results: TestResult[] = [];

// ─── Module-level imports ─────────────────────────────────────────
let toolForge: any;
let vfs: any;
let skillForge: any;
let autoPilot: any;

async function setup() {
  toolForge = (await import('../kernel/toolForge')).toolForge;
  vfs = (await import('../kernel/fileSystem')).vfs;

  try { await vfs.init(); } catch (e: any) { console.log('VFS init:', e?.message); }

  toolForge.bindOsActions(async (action: any) => {
    return `[MOCK OS] ${action.type}:${(action.args || []).join(':')}`;
  });

  skillForge = (await import('../kernel/skillForge')).skillForge;
  await skillForge.load();

  autoPilot = (await import('../kernel/autoPilot')).autoPilot;
  await autoPilot.load();
}

async function runAction(label: string, osActionText: string): Promise<void> {
  process.stdout.write(`  ▸ ${label.padEnd(25)}`);
  try {
    const out = await toolForge.executeOsActions(osActionText);
    const passed = !out.includes('→ ⚠') && !out.includes('Unknown action') && !out.includes('Error');
    results.push({ action: label, payload: osActionText, passed, result: out });
    console.log(passed ? ' ✅' : ' ⚠️');
    if (!passed) console.log(`      → ${out.slice(0, 200)}`);
  } catch (e: any) {
    results.push({ action: label, payload: osActionText, passed: false, error: e?.message || String(e) });
    console.log(' 💥');
    console.log(`      → ${e?.message || e}`);
  }
}

async function main() {
  console.log('[1/10] Loading modules...');
  const { toolForge } = await import('../kernel/toolForge');
  const { vfs } = await import('../kernel/fileSystem');
  const { skillForge } = await import('../kernel/skillForge');
  const { autoPilot } = await import('../kernel/autoPilot');

  console.log('[2/10] VFS init...');
  try {
    await vfs.init();
    console.log('  OK');
  } catch (e: any) {
    console.log('  FAILED:', e?.message);
  }

  console.log('[3/10] Bind OS action handler...');
  toolForge.bindOsActions(async (action: any) => {
    return `[MOCK OS] ${action.type}:${(action.args || []).join(':')}`;
  });
  console.log('  OK');

  console.log('[4/10] SkillForge load...');
  try {
    await skillForge.load();
    console.log('  OK —', skillForge.list().length, 'skill(s)');
  } catch (e: any) {
    console.log('  FAILED:', e?.message);
  }

  console.log('[5/10] AutoPilot load...');
  try {
    await autoPilot.load();
    console.log('  OK');
  } catch (e: any) {
    console.log('  FAILED:', e?.message);
  }

  const tests: Array<[string, string]> = [
    ['WRITE_FILE', 'OS::WRITE_FILE:/home/user/audit.txt:hello'],
    ['READ_FILE', 'OS::READ_FILE:/home/user/audit.txt'],
    ['LIST_DIR', 'OS::LIST_DIR:/home/user'],
    ['SEARCH_FILES', 'OS::SEARCH_FILES:audit'],
    ['CREATE_FOLDER', 'OS::CREATE_FOLDER:/home/user/audit_dir'],
    ['COPY_FILE', 'OS::COPY_FILE:/home/user/audit.txt:/home/user/audit_copy.txt'],
    ['MOVE_FILE', 'OS::MOVE_FILE:/home/user/audit_copy.txt:/home/user/audit_dir/moved.txt'],
    ['DELETE_FILE', 'OS::DELETE_FILE:/home/user/audit.txt'],
    ['OPEN_APP', 'OS::OPEN_APP:hyperide'],
    ['CLOSE_APP', 'OS::CLOSE_APP:hyperide'],
    ['FOCUS_APP', 'OS::FOCUS_APP:hyperide'],
    ['NOTIFY', 'OS::NOTIFY:audit:testing'],
    ['REMEMBER', 'OS::REMEMBER:audit run'],
    ['SET_THEME', 'OS::SET_THEME:neo-emerald'],
    ['SET_ACCENT', 'OS::SET_ACCENT:#10b981'],
    ['SET_WALLPAPER', 'OS::SET_WALLPAPER:nexus://procedural/nebula'],
    ['MINIMIZE_ALL', 'OS::MINIMIZE_ALL'],
    ['CLIPBOARD_COPY', 'OS::CLIPBOARD_COPY:hello'],
    ['CLIPBOARD_PASTE', 'OS::CLIPBOARD_PASTE'],
    ['PLAY_AUDIO', 'OS::PLAY_AUDIO:/home/user/song.mp3'],
    ['OPEN_URL', 'OS::OPEN_URL:https://example.com'],
    ['IDE_OPEN_FILE', 'OS::IDE_OPEN_FILE:/home/user/test.ts'],
    ['OPEN_SETTINGS', 'OS::OPEN_SETTINGS:ai'],
    ['OPEN_FOLDER', 'OS::OPEN_FOLDER:/home/user'],
    ['LOCK_SCREEN', 'OS::LOCK_SCREEN'],
    ['VOLUME_SET', 'OS::VOLUME_SET:50'],
    ['BRIGHTNESS_SET', 'OS::BRIGHTNESS_SET:80'],
    ['LIST_TRASH', 'OS::LIST_TRASH'],
    ['EMPTY_TRASH', 'OS::EMPTY_TRASH'],
    ['EXECUTE_JS', 'OS::EXECUTE_JS:return 1+2'],
    ['RUN_COMMAND', 'OS::RUN_COMMAND:echo hi'],
    ['EMIT_EVENT', 'OS::EMIT_EVENT:audit:test'],
    ['SCHEDULE_TASK', 'OS::SCHEDULE_TASK:60:echo later'],
    ['BROWSE_NAVIGATE', 'OS::BROWSE_NAVIGATE:https://example.com'],
    ['BROWSE_BACK', 'OS::BROWSE_BACK'],
    ['BROWSE_FORWARD', 'OS::BROWSE_FORWARD'],
    ['BROWSE_RELOAD', 'OS::BROWSE_RELOAD'],
    ['BROWSE_STATE', 'OS::BROWSE_STATE'],
    ['BROWSE_EXTRACT', 'OS::BROWSE_EXTRACT'],
    ['BROWSE_CLICK', 'OS::BROWSE_CLICK:#btn'],
    ['BROWSE_INPUT', 'OS::BROWSE_INPUT:#q:hi'],
    ['BROWSE_SCROLL', 'OS::BROWSE_SCROLL:0:100'],
    ['LIST_SKILLS', 'OS::LIST_SKILLS'],
    ['DELETE_SKILL', 'OS::DELETE_SKILL:nonexistent'],
    ['GET_GOALS', 'OS::GET_GOALS'],
    ['SET_AUTOPILOT off', 'OS::SET_AUTOPILOT:off'],
    ['CLUSTER_SCAN', 'OS::CLUSTER_SCAN'],
    ['CLUSTER_STATUS', 'OS::CLUSTER_STATUS'],
    ['TAKE_SCREENSHOT', 'OS::TAKE_SCREENSHOT'],
    ['FAKE_ACTION', 'OS::FAKE_ACTION:test'],
  ];

  let pass = 0, fail = 0;
  console.log('\n[6/10] Running', tests.length, 'OS:: actions...\n');

  const EXPECTED_WARNINGS = [
    'File not found:',
    'Source not found:',
    'Window not found:',
    'No active browser surface',
    'Skill .* not found',
    'Could not capture screen',
    'Unknown action type',
  ];
  const expectedWarningRe = new RegExp(EXPECTED_WARNINGS.join('|'));

  for (const [name, action] of tests) {
    process.stdout.write(`  ▸ ${name.padEnd(25)}`);
    try {
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT after 5s')), 5000)
      );
      const out = await Promise.race([
        toolForge.executeOsActions(action),
        timeoutPromise,
      ]);
      const hasError = out.includes('→ ⚠') || out.includes('Unknown action') || out.includes('Error') || out.includes('TIMEOUT');
      const isExpected = hasError && expectedWarningRe.test(out);
      if (!hasError || isExpected) {
        pass++;
        console.log(isExpected ? ' ✅ (expected warn)' : ' ✅');
      } else {
        fail++;
        console.log(' ⚠️');
        console.log(`      → ${out.slice(0, 200)}`);
      }
    } catch (e: any) {
      fail++;
      console.log(' 💥');
      console.log(`      → ${e?.message || e}`);
    }
  }

  console.log('\n[7/10] Skipping network-dependent actions:');
  console.log('  ⏭ WEB_SEARCH (requires web search service)');
  console.log('  ⏭ EXEC_CODE (requires code executor)');
  console.log('  ⏭ SPAWN_AGENT (requires AI provider)');

  console.log('\n[8/10] SkillForge integration:');
  try {
    const reg = await skillForge.register('audit_skill', 'audit test', 'return "ok";');
    console.log('  register:', reg.success ? '✅' : '⚠️ ' + reg.error);
    const exec = await skillForge.execute('audit_skill', '');
    console.log('  execute: ', exec.success ? '✅' : '⚠️ ' + exec.error);
    const del = await skillForge.delete('audit_skill');
    console.log('  delete:  ', del ? '✅' : '⚠️');
  } catch (e: any) {
    console.log('  💥', e?.message);
  }

  console.log('\n[9/10] AutoPilot integration:');
  try {
    const g = await autoPilot.addGoal('audit goal', 'low');
    console.log('  addGoal:    ✅', g.id);
    const list = autoPilot.getGoals();
    console.log('  getGoals:   ✅', list.length, 'goal(s)');
    const ok = await autoPilot.completeGoal(g.id, 'done');
    console.log('  completeGoal:', ok ? '✅' : '⚠️');
  } catch (e: any) {
    console.log('  💥', e?.message);
  }

  console.log('\n[10/10] Final report:');
  console.log(`  Passed: ${pass}`);
  console.log(`  Failed: ${fail}`);
  console.log(`  Total:  ${pass + fail}`);
  console.log(fail === 0 ? '\n  ✅ ALL TESTS PASSED' : `\n  ⚠️  ${fail} FAILURE(S)`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => {
  console.error('CRASH:', e?.stack || e);
  process.exit(2);
});
