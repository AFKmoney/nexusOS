const { app, BrowserWindow, session, ipcMain, protocol, net, desktopCapturer, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

const isDev = !app.isPackaged;
let bridgeProcess = null;

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
