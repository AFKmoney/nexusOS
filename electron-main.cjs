const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

const isDev = !app.isPackaged;
let bridgeProcess = null;

// ─── DAEMON BRIDGE — Auto-launch on OS start ─────────────────
function startBridgeServer() {
  const bridgePath = path.join(__dirname, 'daemon-bridge-server.cjs');
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
      sandbox: true,
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

ipcMain.handle('native-unzip', async (event, { source, dest }) => {
  // Basic path sanitization to prevent injection
  const sanitize = (p) => p.replace(/['";&|]/g, '');
  const s = sanitize(source);
  const d = sanitize(dest);

  return new Promise((resolve, reject) => {
    if (os.platform() === 'win32') {
      exec(`powershell -command "Expand-Archive -Path '${s}' -DestinationPath '${d}' -Force"`, (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    } else {
      exec(`unzip -o "${s}" -d "${d}"`, (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    }
  });
});

ipcMain.handle('native-search', async (event, query) => {
  return new Promise((resolve) => {
    if (!query) return resolve([]);
    const q = query.replace(/[^a-zA-Z0-9._-]/g, ''); // Very strict sanitization for search
    const desktopPath = path.join(os.homedir(), 'Desktop');
    if (os.platform() === 'win32') {
      exec(`dir "${desktopPath}\\*${q}*" /s /b`, { timeout: 5000 }, (error, stdout) => {
        if (error) { resolve([]); return; }
        const files = stdout.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20);
        resolve(files);
      });
    } else {
      exec(`find "${desktopPath}" -name "*${q}*" | head -n 20`, { timeout: 5000 }, (error, stdout) => {
        if (error) { resolve([]); return; }
        resolve(stdout.split('\n').filter(Boolean));
      });
    }
  });
});

ipcMain.handle('native-exec', async (event, command) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  
  // MANDATORY USER CONFIRMATION (P0 Audit Fix)
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Security Alert: Native Execution',
    message: 'A request was made to execute a native command on your host system.',
    detail: `Command: ${command}\n\nThis could be dangerous. Do you want to allow this?`,
    buttons: ['Deny', 'Allow'],
    defaultId: 0,
    cancelId: 0
  });

  if (response !== 1) {
    return { success: false, error: 'User denied native execution request.' };
  }

  return new Promise((resolve) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      resolve({ 
        success: !error, 
        stdout: stdout || '', 
        stderr: stderr || '', 
        error: error ? error.message : null 
      });
    });
  });
});

app.whenReady().then(() => {
  // Start bridge BEFORE creating window
  // startBridgeServer(); // TODO: Re-enable once daemon-bridge-server.cjs is implemented
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
