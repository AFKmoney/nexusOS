const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Add IPC communication if needed late
  send: (channel, data) => {
    let validChannels = ['toggle-fullscreen'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ['download-progress', 'browser-event'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Streaming event listeners — allowed for ai-stream-* and terminal-* channels
  on: (channel, func) => {
    if (typeof channel === 'string' && (channel.startsWith('ai-stream-') || channel.startsWith('terminal-'))) {
      const listener = (event, ...args) => func(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return undefined;
  },
  off: (channel) => {
    if (typeof channel === 'string' && (channel.startsWith('ai-stream-') || channel.startsWith('terminal-'))) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  // Real Native Hardware & Host Access
  invoke: async (channel, data) => {
    const validChannels = [
      'get-os-info', 'native-unzip', 'native-search', 'native-exec',
      'native-download', 'native-capture-screen',
      // Browser (Chromium WebContentsView) control surface
      'browser-create', 'browser-navigate', 'browser-go-back',
      'browser-go-forward', 'browser-reload', 'browser-execute',
      'browser-destroy', 'browser-resize', 'browser-get-url',
      // Phase 1: Code execution + host filesystem
      'exec-code',
      'fs-read-file', 'fs-write-file', 'fs-mkdir', 'fs-rmdir',
      'fs-readdir', 'fs-stat', 'fs-unlink',
      // Phase 2: Vision
      'native-click',
      // Phase 5: Cluster
      'cluster-scan',
      // AI API proxy (bypasses CORS)
      'ai-proxy', 'ai-proxy-stream',
      // Real terminal (Electron-only, child_process-based pty fallback)
      'terminal-create', 'terminal-write', 'terminal-resize', 'terminal-kill',
    ];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    }
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  }
});
