import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { hydrateOSRegistry } from './store/osStore';
import { vfs } from './kernel/fileSystem';

// CRITICAL: Hydrate app registry before first render
hydrateOSRegistry().catch(e => console.error('[SYSTEM] Registry hydration failed:', e));

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
    console.warn('[SYSTEM] Ignored external injection error:', msg);
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
  console.error("CRITICAL: Reboot loop detected. Clearing system state...");
  localStorage.clear();
  localStorage.setItem(CRASH_KEY, '0');
}

console.log("%c[SYSTEM] NEXUS_OS_CORE v2.0.3 booting...", "color: #10b981; font-weight: bold;");



const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

async function bootSystem() {
  try {
    console.log("[SYSTEM] Initializing Storage Architecture (VFS)...");
    await vfs.init();
    
    console.log("[SYSTEM] Mounting React Root...");
    root.render(<App />);
    console.log("[SYSTEM] React Mount Requested.");
  } catch (e: any) {
    console.error("[SYSTEM] BOOT SEQUENCE FAILED:", e);
    document.body.innerHTML = `<h1 style="color:red">REACT MOUNT ERROR: ${e.message}</h1>`;
  }
}

bootSystem();