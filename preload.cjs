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
    let validChannels = ['download-progress'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // Real Native Hardware & Host Access
  invoke: async (channel, data) => {
    const validChannels = ['get-os-info', 'native-unzip', 'native-search', 'native-exec', 'native-download'];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    }
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  }
});
