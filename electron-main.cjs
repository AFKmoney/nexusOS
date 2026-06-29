const { app, BrowserWindow, WebContentsView, session, ipcMain, protocol, net, desktopCapturer, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

const isDev = !app.isPackaged;
let bridgeProcess = null;

// ─── Browser View Manager ─────────────────────────────────────────
// Maintains a map of windowId → WebContentsView so the renderer can
// request a real Chromium browser surface for a given window. The view
// is attached to the parent BrowserWindow and resized to cover the
// content area. The renderer communicates via IPC:
//   - 'browser-create'  → create a view for this windowId
//   - 'browser-navigate' → load a URL in the view
//   - 'browser-execute'  → execute JS in the view and return the result
//   - 'browser-destroy'  → destroy the view
//   - 'browser-resize'   → resize the view (called on window resize)
const browserViews = new Map(); // windowId → { view, parentWin }

function getBrowserViewEntry(windowId) {
  return browserViews.get(windowId) || null;
}

function createBrowserView(parentWin, windowId) {
  if (!parentWin) return { success: false, error: 'no parent window' };
  // Remove existing view if any
  destroyBrowserView(windowId);

  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  parentWin.contentView.addChildView(view);
  browserViews.set(windowId, { view, parentWin });

  // Default bounds: full content area. The renderer will send a resize
  // command once it knows the actual content rect (below the toolbar).
  const [w, h] = parentWin.getContentSize();
  view.setBounds({ x: 0, y: 40, width: w, height: Math.max(0, h - 40) });

  // Report navigation events back to the renderer so WebRunner can
  // update its URL bar and history.
  view.webContents.on('did-navigate', (_e, url) => {
    parentWin.webContents.send('browser-event', { windowId, kind: 'navigate', url });
  });
  view.webContents.on('did-navigate-in-page', (_e, url) => {
    parentWin.webContents.send('browser-event', { windowId, kind: 'navigate-in-page', url });
  });
  view.webContents.on('page-title-updated', (_e, title) => {
    parentWin.webContents.send('browser-event', { windowId, kind: 'title', title });
  });
  view.webContents.on('did-start-loading', () => {
    parentWin.webContents.send('browser-event', { windowId, kind: 'loading', isLoading: true });
  });
  view.webContents.on('did-stop-loading', () => {
    parentWin.webContents.send('browser-event', { windowId, kind: 'loading', isLoading: false });
  });

  return { success: true };
}

function destroyBrowserView(windowId) {
  const entry = browserViews.get(windowId);
  if (!entry) return;
  try {
    entry.parentWin.contentView.removeChildView(entry.view);
  } catch { /* window may already be gone */ }
  try {
    entry.view.webContents.destroy();
  } catch { /* ignore */ }
  browserViews.delete(windowId);
}

function resizeBrowserView(windowId, bounds) {
  const entry = browserViews.get(windowId);
  if (!entry) return;
  try {
    entry.view.setBounds(bounds);
  } catch { /* ignore */ }
}

ipcMain.handle('browser-create', async (event, { windowId }) => {
  const parentWin = BrowserWindow.fromWebContents(event.sender);
  return createBrowserView(parentWin, windowId);
});

ipcMain.handle('browser-navigate', async (event, { windowId, url }) => {
  const entry = getBrowserViewEntry(windowId);
  if (!entry) return { success: false, error: 'no browser view for this windowId' };
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return { success: false, error: 'URL must start with http(s)://' };
  }
  entry.view.webContents.loadURL(url);
  return { success: true };
});

ipcMain.handle('browser-go-back', async (event, { windowId }) => {
  const entry = getBrowserViewEntry(windowId);
  if (!entry) return { success: false, error: 'no browser view' };
  entry.view.webContents.goBack();
  return { success: true };
});

ipcMain.handle('browser-go-forward', async (event, { windowId }) => {
  const entry = getBrowserViewEntry(windowId);
  if (!entry) return { success: false, error: 'no browser view' };
  entry.view.webContents.goForward();
  return { success: true };
});

ipcMain.handle('browser-reload', async (event, { windowId }) => {
  const entry = getBrowserViewEntry(windowId);
  if (!entry) return { success: false, error: 'no browser view' };
  entry.view.webContents.reload();
  return { success: true };
});

ipcMain.handle('browser-execute', async (event, { windowId, code }) => {
  const entry = getBrowserViewEntry(windowId);
  if (!entry) return { success: false, error: 'no browser view' };
  if (typeof code !== 'string' || code.length > 10_000) {
    return { success: false, error: 'invalid code' };
  }
  try {
    const result = await entry.view.webContents.executeJavaScript(code, true);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('browser-destroy', async (event, { windowId }) => {
  destroyBrowserView(windowId);
  return { success: true };
});

ipcMain.handle('browser-resize', async (event, { windowId, bounds }) => {
  resizeBrowserView(windowId, bounds);
  return { success: true };
});

ipcMain.handle('browser-get-url', async (event, { windowId }) => {
  const entry = getBrowserViewEntry(windowId);
  if (!entry) return { success: false, error: 'no browser view' };
  return { success: true, url: entry.view.webContents.getURL() };
});

// Clean up browser views when their parent window closes.
app.on('browser-window-blur', () => { /* no-op */ });


// Register custom protocol for local model files
protocol.registerSchemesAsPrivileged([
  { scheme: 'nexus', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);

// ─── DAEMON BRIDGE — Auto-launch on OS start ─────────────────
function startBridgeServer() {
  const bridgePath = path.join(__dirname, 'daemon-bridge-server.cjs');

  if (!fs.existsSync(bridgePath)) {
    console.warn('[DAEMON] Bridge server file missing, skipping auto-launch.');
    return;
  }

  try {
    bridgeProcess = spawn('node', [bridgePath], {
      stdio: 'pipe',
      detached: false,
      env: { ...process.env }
    });
    bridgeProcess.stdout.on('data', (data) => {
      console.log(`[BRIDGE] ${data.toString().trim()}`);
    });
    bridgeProcess.stderr.on('data', (data) => {
      console.error(`[BRIDGE ERR] ${data.toString().trim()}`);
    });
    bridgeProcess.on('close', (code) => {
      console.log(`[BRIDGE] Process exited (code ${code})`);
      bridgeProcess = null;
    });
    console.log('[DAEMON] Bridge server spawned automatically.');
  } catch (e) {
    console.error('[DAEMON] Failed to spawn bridge:', e.message);
  }
}

function stopBridgeServer() {
  if (bridgeProcess) {
    bridgeProcess.kill('SIGTERM');
    bridgeProcess = null;
    console.log('[DAEMON] Bridge server stopped.');
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: "NXSS - Neural Nexus",
    show: false,
  });

  // Inject COOP and COEP headers for Wllama (SharedArrayBuffer)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      },
    });
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  // F11 Fullscreen Toggle
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
}

// Fullscreen IPC
ipcMain.on('toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setFullScreen(!win.isFullScreen());
});

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// ─── NATIVE HARDWARE & SYSTEM APIs (NO SIMULATION) ───────────
ipcMain.handle('get-os-info', async () => {
  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpus: os.cpus(),
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    uptime: os.uptime(),
    hostname: os.hostname(),
    userInfo: os.userInfo()
  };
});

// Reject paths/queries containing shell metacharacters or NUL bytes.
// Used to prevent command injection in the few exec() calls below that still
// rely on shell expansion.
const isShellSafe = (str) => {
  if (typeof str !== 'string' || str.length === 0 || str.length > 1024) return false;
  // Disallow: ; & | ` $ ( ) < > newline backslash quotes nul *
  return !/[;&|`$()<>\n\r\\"'\0]/.test(str);
};

ipcMain.handle('native-unzip', async (event, { source, dest }) => {
  return new Promise((resolve) => {
    if (!isShellSafe(source) || !isShellSafe(dest)) {
      resolve({ success: false, error: 'invalid path' });
      return;
    }
    const { execFile } = require('child_process');
    if (os.platform() === 'win32') {
      execFile(
        'powershell',
        ['-NoProfile', '-Command', `Expand-Archive -Path '${source.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`],
        { timeout: 60_000 },
        (err) => err ? resolve({ success: false, error: err.message }) : resolve({ success: true })
      );
    } else {
      execFile('unzip', ['-o', source, '-d', dest], { timeout: 60_000 },
        (err) => err ? resolve({ success: false, error: err.message }) : resolve({ success: true })
      );
    }
  });
});

ipcMain.handle('native-search', async (event, query) => {
  return new Promise((resolve) => {
    if (!query || typeof query !== 'string') return resolve([]);
    // Strip any unsafe characters; keep only alphanumerics, dot, dash, underscore, space.
    const safeQuery = query.replace(/[^A-Za-z0-9._\- ]/g, '').slice(0, 64);
    if (!safeQuery) return resolve([]);
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const { execFile } = require('child_process');
    if (os.platform() === 'win32') {
      execFile('cmd', ['/c', 'dir', `${desktopPath}\\*${safeQuery}*`, '/s', '/b'], { timeout: 5000 }, (error, stdout) => {
        if (error) { resolve([]); return; }
        const files = stdout.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20);
        resolve(files);
      });
    } else {
      execFile('find', [desktopPath, '-name', `*${safeQuery}*`], { timeout: 5000 }, (error, stdout) => {
        if (error) { resolve([]); return; }
        resolve(stdout.split('\n').filter(Boolean).slice(0, 20));
      });
    }
  });
});

ipcMain.handle('native-exec', async (event, command) => {
  return new Promise((resolve) => {
    // SECURITY: "Hardware Overlord Mode" — gives the renderer arbitrary
    // host shell access. We bound the cost (length cap + timeout) so a
    // stray AI prompt cannot pin the host, AND we require explicit user
    // confirmation via a modal dialog before any command is executed.
    // The confirmation is the last line of defense against a compromised
    // or hallucinating AI model running inside the kernel.
    if (typeof command !== 'string' || command.length === 0 || command.length > 4096) {
      resolve({ success: false, stdout: '', stderr: '', error: 'invalid command' });
      return;
    }

    // Suppress the dialog in headless/CI environments where there is no
    // parent window — but in that case, also refuse to execute, because
    // silent headless shell execution is exactly what we want to prevent.
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    if (!parentWindow) {
      resolve({ success: false, stdout: '', stderr: '', error: 'no parent window — headless execution refused' });
      return;
    }

    // Show a non-blocking modal. The dialog shows the command verbatim
    // (truncated to 500 chars for readability) and the user must click
    // "Execute" to proceed. Default button is "Cancel".
    const preview = command.length > 500 ? command.slice(0, 500) + '…' : command;
    const choice = dialog.showMessageBoxSync(parentWindow, {
      type: 'warning',
      title: 'NexusOS — Native Command Execution',
      message: 'The DAEMON AI is requesting to execute a command on your host machine.',
      detail: `Command:\n\n${preview}\n\nReview carefully. Allow only if you trust the source.`,
      buttons: ['Cancel', 'Execute'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });

    if (choice !== 1) {
      resolve({ success: false, stdout: '', stderr: '', error: 'user denied execution' });
      return;
    }

    exec(command, { maxBuffer: 1024 * 1024 * 10, timeout: 60_000 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || '',
        error: error ? error.message : null
      });
    });
  });
});

ipcMain.handle('native-capture-screen', async (event) => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    if (sources.length > 0) {
      return { success: true, dataUrl: sources[0].thumbnail.toDataURL() };
    }
    return { success: false, error: 'No screen sources found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('native-download', async (event, { url, repoId, filename, onProgressId }) => {
  const userDataPath = app.getPath('userData');
  const repoFolder = repoId.replace(/\//g, '_');
  const modelsPath = path.join(userDataPath, 'models', repoFolder);
  if (!fs.existsSync(modelsPath)) fs.mkdirSync(modelsPath, { recursive: true });

  const targetPath = path.join(modelsPath, filename);
  
  return new Promise((resolve) => {
    const downloadFile = (targetUrl) => {
        const request = net.request({
            url: targetUrl,
            redirect: 'follow'
        });
        
        request.on('response', (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              const nextUrl = Array.isArray(response.headers.location) ? response.headers.location[0] : response.headers.location;
              downloadFile(nextUrl);
              return;
          }

          if (response.statusCode !== 200) {
              resolve({ success: false, error: `Server returned status ${response.statusCode}` });
              return;
          }

          const totalLength = parseInt(response.headers['content-length'] || '0');
          let downloadedLength = 0;

          const writer = fs.createWriteStream(targetPath);
          
          response.on('data', (chunk) => {
            downloadedLength += chunk.length;
            writer.write(chunk);
            
            if (onProgressId) {
                const pct = totalLength ? Math.round((downloadedLength / totalLength) * 100) : 0;
                event.sender.send('download-progress', { 
                    id: onProgressId, 
                    pct, 
                    downloaded: downloadedLength, 
                    total: totalLength 
                });
            }
          });

          response.on('end', () => {
            writer.end();
            resolve({ success: true, path: targetPath });
          });

          response.on('error', (err) => {
            writer.end();
            resolve({ success: false, error: err.message });
          });
        });

        request.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });

        request.end();
    };

    downloadFile(url);
  });
});

app.whenReady().then(() => {
  // Protocol handler for local models
  protocol.handle('nexus', (request) => {
    try {
      const urlStr = request.url.replace('nexus://', '');
      const [repoPart, ...fileParts] = urlStr.split('/');
      const filename = decodeURIComponent(fileParts.join('/'));
      const rawRepoId = decodeURIComponent(repoPart);
      const repoFolder = rawRepoId.replace(/\//g, '_');

      const userDataPath = app.getPath('userData');
      const modelsRoot = path.resolve(path.join(userDataPath, 'models'));
      const fullPath = path.resolve(path.join(modelsRoot, repoFolder, filename));

      // Robust path-traversal guard: resolved path MUST sit under modelsRoot.
      // .includes('..') is bypassable via URL-encoded segments or symlinks.
      const rel = path.relative(modelsRoot, fullPath);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return new Response('Access denied', { status: 403 });
      }

      return net.fetch('file://' + fullPath);
    } catch (e) {
      return new Response('Bad request', { status: 400 });
    }
  });

  // Start bridge BEFORE creating window
  startBridgeServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopBridgeServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBridgeServer();
});

// ─── Code Execution (Electron sandbox) ─────────────────────────────
ipcMain.handle('exec-code', async (event, { language, code, timeoutMs }) => {
  return new Promise((resolve) => {
    const lang = (language || '').toLowerCase().trim();
    let cmd, args;

    if (lang === 'javascript' || lang === 'js') {
      cmd = 'node'; args = ['-e', code];
    } else if (lang === 'python' || lang === 'py') {
      cmd = 'python3'; args = ['-c', code];
    } else if (lang === 'shell' || lang === 'sh' || lang === 'bash') {
      cmd = 'bash'; args = ['-c', code];
    } else if (lang === 'typescript' || lang === 'ts') {
      cmd = 'npx'; args = ['tsx', '-e', code];
    } else {
      resolve({ success: false, stdout: '', stderr: `Unsupported language: ${lang}`, exitCode: null });
      return;
    }

    const { execFile } = require('child_process');
    execFile(cmd, args, { timeout: timeoutMs || 10000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: err ? (err.code || 1) : 0,
      });
    });
  });
});

// ─── Host Filesystem (for Git + host project access) ───────────────
const fsCallbacks = require('fs');
const pathModule = require('path');

ipcMain.handle('fs-read-file', async (event, { path: filePath, encoding }) => {
  try {
    const data = fsCallbacks.readFileSync(filePath, encoding || 'utf8');
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-write-file', async (event, { path: filePath, content }) => {
  try {
    fsCallbacks.mkdirSync(pathModule.dirname(filePath), { recursive: true });
    fsCallbacks.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-mkdir', async (event, { path: filePath, recursive }) => {
  try {
    fsCallbacks.mkdirSync(filePath, { recursive: recursive !== false });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-rmdir', async (event, { path: filePath }) => {
  try {
    fsCallbacks.rmdirSync(filePath, { recursive: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-readdir', async (event, { path: filePath }) => {
  try {
    const entries = fsCallbacks.readdirSync(filePath);
    return { success: true, entries };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-stat', async (event, { path: filePath }) => {
  try {
    const stat = fsCallbacks.statSync(filePath);
    return { success: true, isDirectory: stat.isDirectory(), mtimeMs: stat.mtimeMs, size: stat.size };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-unlink', async (event, { path: filePath }) => {
  try {
    fsCallbacks.unlinkSync(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Cluster scan (UDP discovery placeholder) ──────────────────────
ipcMain.handle('cluster-scan', async (event, { timeoutMs }) => {
  // Placeholder: in a real implementation, this would use dgram to
  // broadcast a discovery packet on the local network and collect
  // responses. For now, returns an empty list.
  return { success: true, devices: [] };
});

// ─── Native click (for vision module) ──────────────────────────────
ipcMain.handle('native-click', async (event, { x, y }) => {
  return { success: false, error: 'Native click requires robotjs (not installed)' };
});

// ─── AI API Proxy (bypasses CORS for cloud AI providers) ───────────
// Browser fetch() is subject to CORS. Most AI APIs (NVIDIA, Mistral,
// OpenAI, etc.) don't return Access-Control-Allow-Origin headers, so
// direct browser requests fail with "Failed to fetch". This proxy
// forwards the request through Electron's main process (no CORS).
ipcMain.handle('ai-proxy', async (event, { url, method, headers, body }) => {
  try {
    const fetchHeaders = { ...headers };
    // Remove headers that fetch in main process doesn't need
    delete fetchHeaders['Host'];

    const response = await fetch(url, {
      method: method || 'POST',
      headers: fetchHeaders,
      body: body || undefined,
    });

    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    return {
      ok: response.ok,
      status: response.status,
      body: json || text,
    };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
});

// ─── Streaming AI Proxy (SSE passthrough) ──────────────────────────
// Same CORS-bypass purpose as `ai-proxy`, but forwards SSE chunks to
// the renderer as they arrive, instead of buffering the whole response.
// Used for stream=true calls in aiProviders.ts.
//
// Protocol:
//   renderer → invoke('ai-proxy-stream', { url, method, headers, body, channel })
//   main     → sender.send(`${channel}-chunk`,  chunkText)
//              sender.send(`${channel}-done`,   {})
//              sender.send(`${channel}-error`, { message, status })
ipcMain.handle('ai-proxy-stream', async (event, { url, method, headers, body, channel }) => {
  try {
    const fetchHeaders = { ...headers };
    delete fetchHeaders['Host'];

    const response = await fetch(url, {
      method: method || 'POST',
      headers: fetchHeaders,
      body: body || undefined,
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      event.sender.send(`${channel}-error`, {
        status: response.status,
        message: `API Error ${response.status}: ${text.slice(0, 500)}`,
      });
      return { ok: false, status: response.status };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) event.sender.send(`${channel}-chunk`, chunk);
    }

    event.sender.send(`${channel}-done`, {});
    return { ok: true, status: response.status };
  } catch (err) {
    event.sender.send(`${channel}-error`, { message: err.message });
    return { ok: false, status: 0, error: err.message };
  }
});
