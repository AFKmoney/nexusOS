const { app, BrowserWindow, session, ipcMain, protocol, net } = require('electron');
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

ipcMain.handle('native-unzip', async (event, { source, dest }) => {
  return new Promise((resolve, reject) => {
    if (os.platform() === 'win32') {
      exec(`powershell -command "Expand-Archive -Path '${source}' -DestinationPath '${dest}' -Force"`, (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    } else {
      exec(`unzip -o "${source}" -d "${dest}"`, (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    }
  });
});

ipcMain.handle('native-search', async (event, query) => {
  return new Promise((resolve) => {
    if (!query) return resolve([]);
    const desktopPath = path.join(os.homedir(), 'Desktop');
    if (os.platform() === 'win32') {
      // Find matching files in Desktop
      exec(`dir "${desktopPath}\\*${query}*" /s /b`, { timeout: 5000 }, (error, stdout) => {
        if (error) { resolve([]); return; }
        const files = stdout.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20); // max 20 results
        resolve(files);
      });
    } else {
      // Unix find
      exec(`find "${desktopPath}" -name "*${query}*" | head -n 20`, { timeout: 5000 }, (error, stdout) => {
        if (error) { resolve([]); return; }
        resolve(stdout.split('\n').filter(Boolean));
      });
    }
  });
});

ipcMain.handle('native-exec', async (event, command) => {
  return new Promise((resolve) => {
    // SECURITY WARNING: This allows DAEMON direct host machine access (Hardware Overlord Mode).
    // Bypasses the VFS container and unleashes native Rust/C++/Bash commands.
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
    const urlStr = request.url.replace('nexus://', '');
    const [repoPart, ...fileParts] = urlStr.split('/');
    const filename = decodeURIComponent(fileParts.join('/'));
    const rawRepoId = decodeURIComponent(repoPart);
    const repoFolder = rawRepoId.replace(/\//g, '_');
    
    const userDataPath = app.getPath('userData');
    const fullPath = path.join(userDataPath, 'models', repoFolder, filename);
    
    // Safety check
    if (fullPath.includes('..')) return new Response('Access denied', { status: 403 });
    
    return net.fetch('file://' + fullPath);
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
