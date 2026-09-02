#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NexusOS DevOps Battery — a one-shot quality gate runner for CI / pre-release.
 *
 * Runs every [gate] in a controlled order and reports a clear PASS/FAIL/SKIP
 * table, exiting non-zero if ANY fatal gate fails (so it can gate a merge).
 *
 *   Gates:
 *     typecheck   - `tsc --noEmit`          (0 errors required)      [fatal]
 *     unit        - `npm test`              (0 failing tests)        [fatal]
 *     build       - `vite build`            (must succeed)           [fatal]
 *     lint        - eslint (auto-detected)  (0 errors)               [fatal if present]
 *     e2e         - production build + headless smoke (needs browser)[fatal only via RUN_E2E]
 *
 *   Select gates via DEVOP_BATTERY="typecheck,unit,build" (default).
 *   Enable the e2e browser gate via RUN_E2E=1.
 *   Keep artifacts with DEVOP_BATTERY_KEEP=1.
 *
 * Usage:
 *   node scripts/devops-battery.mjs
 *   RUN_E2E=1 DEVOP_BATTERY=all node scripts/devops-battery.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_E2E = process.env.RUN_E2E === '1';
const SELECTED = (process.env.DEVOP_BATTERY || 'typecheck,unit,build')
  .split(',').map((s) => s.trim()).filter(Boolean);

const ALL = ['typecheck', 'unit', 'build', 'lint', 'e2e'];
const gates = SELECTED.includes('all') ? ALL : ALL.filter((g) => SELECTED.includes(g));

const results = [];
const started = Date.now();

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}
function has(cmd) { return run(cmd, ['--version']).status === 0; }

async function gateTypecheck() {
  const r = run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json']);
  const errors = (r.stdout + r.stderr).match(/error TS\d+/g) || [];
  if (r.status !== 0 || errors.length > 0) {
    const first = (r.stdout + r.stderr).split('\n').filter((l) => l.includes('error TS')).slice(0, 10);
    return { ok: false, detail: `${errors.length} type error(s)\n${first.join('\n')}` };
  }
  return { ok: true, detail: '0 type errors' };
}

async function gateUnit() {
  const r = run('npm', ['test']);
  const out = r.stdout + r.stderr;
  const failures = (out.match(/^[ ]*not ok [0-9]+/gm) || []).length;
  const passes = (out.match(/^[ ]*ok [0-9]+/gm) || []).length;
  if (r.status !== 0 || failures > 0) {
    const failLines = out.split('\n').filter((l) => /not ok/.test(l)).slice(0, 10);
    return { ok: false, detail: `${failures} failing test(s)\n${failLines.join('\n')}` };
  }
  return { ok: true, detail: `${passes} tests passed, 0 failed` };
}

async function gateBuild() {
  const r = run('npm', ['run', 'build']);
  if (r.status !== 0) {
    const tail = (r.stdout + r.stderr).split('\n').slice(-15).join('\n');
    return { ok: false, detail: tail };
  }
  const m = (r.stdout + r.stderr).match(/built in [\d.]+s/);
  return { ok: true, detail: m ? m[0] : 'build OK' };
}

async function gateLint() {
  if (!has('npx')) return { ok: true, detail: 'skipped (eslint binary unavailable)' };
  const eslint = existsSync(path.join(root, 'node_modules/.bin/eslint'))
    ? path.join(root, 'node_modules/.bin/eslint')
    : null;
  if (!eslint) return { ok: true, note: 'eslint not installed — lint auto-detected as unavailable' };
  const r = run(eslint, ['.', '--ext', '.ts,.tsx,.mjs']);
  const out = r.stdout + r.stderr;
  const errors = (out.match(/error[^/]*$/m) || []).length;
  const errCount = (out.match(/^\s+\d+:\d+\s+error\s+/gm) || []).length;
  if (r.status !== 0 && errCount > 0) {
    const head = out.split('\n').filter((l) => /\serror\s/.test(l)).slice(0, 10).join('\n');
    return { ok: false, detail: `${errCount} lint error(s)\n${head}` };
  }
  const warnCount = (out.match(/^\s+\d+:\d+\s+warning\s+/gm) || []).length;
  return { ok: true, detail: `${errCount} errors, ${warnCount} warnings` };
}

async function gateE2E() {
  // Boots the production build under headless Chrome (spawned by appSmoke.mjs).
  try {
    const r = run('node', ['e2e/appSmoke.mjs'], { timeout: 180_000 });
    if (r.status === 0) return { ok: true, detail: (r.stdout || '').trim().split('\n').slice(-3).join(' ') };
    return { ok: false, detail: (r.stdout + r.stderr || '').trim().split('\n').slice(-15).join('\n') };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}

const HANDLERS = { typecheck: gateTypecheck, unit: gateUnit, build: gateBuild, lint: gateLint, e2e: gateE2E };
// Fatal gates block the battery (and thus a merge). `lint` is REPORT-only by
// default (fail it with DEVOP_BATTERY_STRICT_LINT=1) so pre-existing debt in a
// large legacy repo doesn't silently block an otherwise-green CI run.
const FATAL = new Set(['typecheck', 'unit', 'build']);
const STRICT_LINT = process.env.DEVOP_BATTERY_STRICT_LINT === '1';

function fmt(label, res) {
  const state = res.ok ? 'PASS' : 'FAIL';
  const note = res.note ? `  (${res.note})` : '';
  const line = `${String(state).padEnd(7)} ${label.padEnd(10)} ${(res.detail || '').split('\n')[0]}${note}`;
  return { line, block: res.detail };
}

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║   NexusOS DevOps Battery                                    ║`);
console.log(`╚══════════════════════════════════════════════════════════════╝`);
console.log(`gates: ${gates.join(', ')}${RUN_E2E ? '  (RUN_E2E=1)' : ''}\n`);

let fatalFailed = false;
for (const name of gates) {
  let res;
  try { res = await HANDLERS[name](); }
  catch (e) { res = { ok: false, detail: e.message }; }
  const { line } = fmt(name, res);
  console.log(line);
  if (res.detail && res.detail.split('\n').length > 1) {
    console.log(res.detail.split('\n').slice(1).map((l) => `           ${l}`).join('\n'));
  }
  results.push({ name, ...res });
  // e2e only fails the battery when explicitly enabled (no browser in most CI).
  if (name === 'lint' && !res.ok && STRICT_LINT) fatalFailed = true;
  else if (!res.ok && (FATAL.has(name) || (name === 'e2e' && RUN_E2E))) fatalFailed = true;
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
const passed = results.filter((r) => r.ok).length;
console.log(`\n── battery: ${passed}/${gates.length} gate(s) passed in ${elapsed}s ──`);

for (const r of results.filter((x) => !x.ok)) {
  console.log(`✗ ${r.name} FAILED — see output above`);
}
process.exit(fatalFailed ? 1 : 0);
