import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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

console.log("%c[SYSTEM] NEXUS_OS_CORE v10.5.2 booting...", "color: #10b981; font-weight: bold;");

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
try {
  console.log("[SYSTEM] Mounting React Root...");
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("[SYSTEM] React Mount Requested.");
} catch (e: any) {
  console.error("[SYSTEM] MOUNT ERROR:", e);
  document.body.innerHTML = `<h1 style="color:red">REACT MOUNT ERROR: ${e.message}</h1>`;
}