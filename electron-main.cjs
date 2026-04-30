const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
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
  return new Promise((resolve) => {
    let proc;
    if (os.platform() === 'win32') {
      proc = spawn('powershell.exe', [
        '-NoProfile',
        '-Command',
        'Expand-Archive -Path $args[0] -DestinationPath $args[1] -Force',
        source,
        dest
      ]);
    } else {
      proc = spawn('unzip', ['-o', source, '-d', dest]);
    }

    let errorData = '';
    if (proc.stdout) {
      proc.stdout.resume(); // Drain stdout to avoid process hang
    }
    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        errorData += data.toString();
      });
    }

    proc.on('close', (code) => {
      if (code === 0) resolve({ success: true });
      else resolve({ success: false, error: errorData.trim() || `Exit code ${code}` });
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
});

ipcMain.handle('native-search', async (event, query) => {
  return new Promise((resolve) => {
    if (!query) return resolve([]);
    const desktopPath = path.join(os.homedir(), 'Desktop');
    let proc;
    if (os.platform() === 'win32') {
      proc = spawn('powershell.exe', [
        '-NoProfile',
        '-Command',
        'Get-ChildItem -Path $args[0] -Filter "*$($args[1])*" -Recurse | Select-Object -First 20 | ForEach-Object { $_.FullName }',
        desktopPath,
        query
      ]);
    } else {
      // Unix find
      proc = spawn('find', [desktopPath, '-iname', `*${query}*`]);
    }

    let stdoutData = '';
    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
    }

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        resolve([]);
      }
    }, 5000);

    proc.on('close', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        const files = stdoutData.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20);
        resolve(files);
      }
    });

    proc.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve([]);
      }
    });
  });
});

app.whenReady().then(() => {
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
