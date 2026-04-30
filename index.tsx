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

  const container = document.createElement('div');
  container.setAttribute('style', 'color:red;padding:20px;font-family:monospace;background:#111;height:100vh');

  const h1 = document.createElement('h1');
  h1.textContent = 'CRITICAL SYSTEM FAILURE';
  container.appendChild(h1);

  const h2 = document.createElement('h2');
  h2.textContent = String(msg);
  container.appendChild(h2);

  const p = document.createElement('p');
  p.textContent = `Location: ${url}:${line}:${col}`;
  container.appendChild(p);

  const pre = document.createElement('pre');
  pre.textContent = error?.stack || 'No stack trace';
  container.appendChild(pre);

  const btn = document.createElement('button');
  btn.textContent = 'REBOOT SYSTEM';
  btn.setAttribute('style', 'padding:10px;margin-top:20px');
  btn.onclick = () => window.location.reload();
  container.appendChild(btn);

  document.body.innerHTML = '';
  document.body.appendChild(container);
  return false;
};

console.log("%c[SYSTEM] NEXUS_OS_CORE v2.0.0 booting...", "color: #10b981; font-weight: bold;");

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
  document.body.innerHTML = '';
  const h1 = document.createElement('h1');
  h1.setAttribute('style', 'color:red');
  h1.textContent = `REACT MOUNT ERROR: ${e.message}`;
  document.body.appendChild(h1);
}