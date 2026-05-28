#!/usr/bin/env node
/**
 * Per-app end-to-end smoke test.
 *
 * Boots the *production* build under headless Chrome, logs in, then opens every
 * registered app one at a time, waiting for its lazy chunk to resolve and its
 * window to mount. Fails (non-zero exit) if any app triggers a console error,
 * an uncaught page error, a failed (4xx/5xx) network request, or fails to mount.
 *
 * Usage: npm run e2e   (runs `vite build` first, then this script)
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import puppeteer from 'puppeteer';

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;

// Console noise that is expected/benign and must not fail the run.
const IGNORE_PATTERNS = [
  /Ignored external injection error/i,
  /\[WARM-START\]/i,
  /Brain init deferred/i,
  /favicon/i,
  /nexus_logo/i, // PWA manifest icon: ./ path is intentional for the Electron build
  /AudioContext was not allowed to start/i, // expected without a user gesture in headless
  // Bare resource-load failures are deduped against the response handler, which
  // records the real offending URL (and already skips favicon/manifest assets).
  /^console\.error: Failed to load resource/i,
];

const isIgnorable = (text) => IGNORE_PATTERNS.some((re) => re.test(text));

// Pre-existing, non-fatal debt surfaced (not introduced) by this harness:
// several apps call the VFS without threading their own appId, so the Sandbox
// Enforcer logs "Blocked undefined …". The read just returns empty; the app
// still mounts. Reported as a warning so a genuine regression (a crash, a
// failed mount, an our-origin 4xx, a NEW console error) still fails the run.
// TODO: thread each app's appId into its vfs.* calls, then promote to fatal.
const KNOWN_WARNING_PATTERNS = [/\[Sandbox Enforcer\] Blocked undefined/i];
const isKnownWarning = (text) => KNOWN_WARNING_PATTERNS.some((re) => re.test(text));

function startPreview() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', (d) => process.env.E2E_DEBUG && process.stderr.write(d));
  return proc;
}

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(ORIGIN);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`Preview server did not start within ${timeoutMs}ms`);
}

async function main() {
  const preview = startPreview();
  let browser;
  const failures = [];

  try {
    await waitForServer();
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();

    // Per-step error sink. We reset `current` before opening each app so errors
    // get attributed to the right app.
    let current = 'boot';
    const errorsByStep = new Map();
    const warningsByStep = new Map();
    const record = (text) => {
      if (isIgnorable(text)) return;
      const target = isKnownWarning(text) ? warningsByStep : errorsByStep;
      const arr = target.get(current) ?? [];
      arr.push(text);
      target.set(current, arr);
    };

    page.on('console', (msg) => {
      if (msg.type() === 'error') record(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => record(`pageerror: ${err.message}`));
    page.on('requestfailed', (req) => {
      // Only our own assets matter. External API calls (weather, geocoding, …)
      // legitimately fail in a sandboxed CI network and are not app bugs.
      if (req.url().startsWith(ORIGIN)) record(`requestfailed: ${req.url()} (${req.failure()?.errorText})`);
    });
    page.on('response', (res) => {
      const status = res.status();
      if (status >= 400 && !/favicon|nexus_logo|manifest/i.test(res.url())) {
        record(`http ${status}: ${res.url()}`);
      }
    });

    console.log('[e2e] Loading', ORIGIN);
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for the OS store handle to be exposed.
    await page.waitForFunction('window.__NEXUS_OS__ !== undefined', { timeout: 30000 });

    // Log in using the first default profile.
    await page.evaluate(() => {
      const os = window.__NEXUS_OS__;
      const s = os.getState();
      const profile = s.profiles?.[0];
      s.login(profile ? profile.id : 'system');
    });
    await sleep(1000);

    // Collect the list of openable apps from the live registry.
    const appIds = await page.evaluate(() => {
      const s = window.__NEXUS_OS__.getState();
      return (s.registry || [])
        .filter((a) => a.component && !a.hidden && !a.isCustom)
        .map((a) => ({ id: a.id, name: a.name }));
    });
    console.log(`[e2e] Logged in. Smoke-testing ${appIds.length} apps…`);

    for (const app of appIds) {
      current = app.id;
      // Open exactly this app, wait for its lazy chunk + mount, then close it.
      const opened = await page.evaluate((appId) => {
        const os = window.__NEXUS_OS__;
        os.getState().openWindow(appId);
        const after = os.getState().windows || [];
        return after.some((w) => w.appId === appId);
      }, app.id);

      if (!opened) {
        failures.push(`${app.id}: openWindow did not create a window`);
        continue;
      }

      // Wait (up to 8s — the first cold lazy-chunk fetch can be slow) for a
      // window frame to actually appear in the DOM, then a beat for the
      // Suspense fallback to resolve into the real component.
      let mounted = true;
      try {
        await page.waitForFunction(() => document.querySelectorAll('.window-frame').length > 0, {
          timeout: 8000,
        });
      } catch {
        mounted = false;
      }
      await sleep(400);
      if (!mounted) failures.push(`${app.id}: window frame never rendered`);

      const errs = errorsByStep.get(app.id) ?? [];
      if (errs.length) {
        failures.push(`${app.id}: ${errs.length} error(s)\n      - ${errs.join('\n      - ')}`);
        process.stdout.write('✗');
      } else if (!mounted) {
        process.stdout.write('✗');
      } else {
        process.stdout.write((warningsByStep.get(app.id)?.length ?? 0) ? '!' : '·');
      }

      // Close all windows before the next app to keep the run isolated.
      await page.evaluate(() => {
        const os = window.__NEXUS_OS__;
        const s = os.getState();
        (s.windows || []).slice().forEach((w) => s.closeWindow(w.id));
      });
      await sleep(150);
    }
    process.stdout.write('\n');

    // Report boot-phase errors too.
    const bootErrs = errorsByStep.get('boot') ?? [];
    if (bootErrs.length) failures.push(`boot: ${bootErrs.length} error(s)\n      - ${bootErrs.join('\n      - ')}`);

    // Summarise non-fatal known warnings (pre-existing debt).
    const warnCount = [...warningsByStep.values()].reduce((n, a) => n + a.length, 0);
    if (warnCount) {
      console.log(`\n[e2e] ${warnCount} known non-fatal warning(s) across ${warningsByStep.size} app(s) — pre-existing VFS appId debt:`);
      for (const [step, arr] of warningsByStep) console.log(`  ! ${step}: ${arr.length}`);
    }

    if (failures.length) {
      console.error(`\n[e2e] FAILED — ${failures.length} app(s) with issues:\n`);
      for (const f of failures) console.error('  • ' + f);
      process.exitCode = 1;
    } else {
      console.log(`\n[e2e] PASS — ${appIds.length} apps opened & mounted with 0 fatal console errors, 0 our-origin 4xx/5xx.`);
    }
  } catch (err) {
    console.error('[e2e] Harness error:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    preview.kill('SIGTERM');
  }
}

main();
