import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { hydrateOSRegistry, useOS } from './store/osStore';
import { vfs } from './kernel/fileSystem';
import { kernelLog } from './kernel/log';
import { WALLPAPER_LIBRARY } from './kernel/wallpaperLibrary';
import { skillForge } from './kernel/skillForge';
import { autoPilot } from './kernel/autoPilot';

// Expose the OS store as a global debug/automation handle so end-to-end
// harnesses (and devtools) can drive the OS — open apps, inspect state — without
// scraping the DOM. Harmless in production: it is a read/write view of state the
// user already controls in their own browser tab.
(window as any).__NEXUS_OS__ = useOS;

// CRITICAL: Hydrate app registry before first render
hydrateOSRegistry().catch(e => kernelLog.error('[SYSTEM] Registry hydration failed:', e));

// CRITICAL DEBUGGING: Global Error Handler
window.onerror = function (msg, url, line, col, error) {
  const errMsg = (typeof msg === 'string' ? msg : JSON.stringify(msg) || '').toLowerCase();
  const errStack = (error?.stack || '').toLowerCase();
  const errUrl = (url || '').toLowerCase();

  const isExtension = errUrl.includes('chrome-extension://') || 
                      errUrl.includes('moz-extension://') || 
                      errStack.includes('chrome-extension://') ||
                      errStack.includes('evmask');

  const isWeb3 = errMsg.includes('ethereum') || 
                 errMsg.includes('phantom') || 
                 errMsg.includes('webrtc') ||
                 errStack.includes('ethereum') ||
                 errStack.includes('phantom');

  if (isExtension || isWeb3) {
    kernelLog.warn('[SYSTEM] Ignored external injection error:', msg);
    return true;
  }

  document.body.innerHTML = `<div style="color:red;padding:20px;font-family:monospace;background:#111;height:100vh">
    <h1>CRITICAL SYSTEM FAILURE</h1>
    <h2>${msg}</h2>
    <p>Location: ${url}:${line}:${col}</p>
    <pre>${error?.stack || 'No stack trace'}</pre>
    <button onclick="window.location.reload()" style="padding:10px;margin-top:20px">REBOOT SYSTEM</button>
  </div>`;
  return false;
};

// Safeguard: Reboot Loop Detection
const CRASH_KEY = 'nexus_crash_count';
const LAST_CRASH_TIME = 'nexus_last_crash';
const now = Date.now();
const lastCrash = parseInt(localStorage.getItem(LAST_CRASH_TIME) || '0');
let crashCount = parseInt(localStorage.getItem(CRASH_KEY) || '0');

if (now - lastCrash < 10000) {
  crashCount++;
} else {
  crashCount = 1;
}

localStorage.setItem(LAST_CRASH_TIME, now.toString());
localStorage.setItem(CRASH_KEY, crashCount.toString());

if (crashCount > 3) {
  kernelLog.error('CRITICAL: Reboot loop detected. Clearing system state...');
  localStorage.clear();
  localStorage.setItem(CRASH_KEY, '0');
}

kernelLog.info('%c[SYSTEM] NEXUS_OS_CORE v2.0.6 booting...', "color: #10b981; font-weight: bold;");



const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

async function bootSystem() {
  try {
    // Render React FIRST (shows boot screen immediately), then init VFS
    // in the background. This cuts perceived boot time from "wait for
    // IndexedDB → render" to "render instantly → VFS loads async".
    root.render(<App />);

    // Initialize VFS in parallel with React rendering
    kernelLog.info('[SYSTEM] Initializing VFS (async)...');
    vfs.init().then(async () => {
      vfs.seedSystemWallpapers(WALLPAPER_LIBRARY);
      kernelLog.info('[SYSTEM] VFS ready.');

      try {
        await skillForge.load();
        const skills = skillForge.list();
        if (skills.length > 0) {
          kernelLog.info(`[SYSTEM] SkillForge: ${skills.length} skill(s) loaded`);
        }
      } catch (e: any) {
        kernelLog.warn('[SYSTEM] SkillForge load failed:', e?.message);
      }

      try {
        await autoPilot.load();
        const goals = autoPilot.getGoals('pending');
        if (goals.length > 0) {
          kernelLog.info(`[SYSTEM] AutoPilot: ${goals.length} pending goal(s) restored`);
        }
      } catch (e: any) {
        kernelLog.warn('[SYSTEM] AutoPilot load failed:', e?.message);
      }
    }).catch(e => {
      kernelLog.error('[SYSTEM] VFS init failed:', e);
    });
  } catch (e: any) {
    kernelLog.error('[SYSTEM] BOOT SEQUENCE FAILED:', e);
    document.body.innerHTML = `<h1 style="color:red">REACT MOUNT ERROR: ${e.message}</h1>`;
  }
}

bootSystem();