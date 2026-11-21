const { contextBridge, ipcRenderer } = require("electron");

// Expose safe desktop API to renderer without directly mutating the DOM
// (Prevents React 19 / Next.js SSR hydration mismatch)
contextBridge.exposeInMainWorld("desktopApp", {
  isDesktop: true,
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  toggleFullscreen: () => ipcRenderer.send("window:toggle-fullscreen"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  openExternal: (url) => ipcRenderer.send("window:open-external", url),
  onStateChanged: (callback) => {
    ipcRenderer.on("window:state-changed", (_event, state) => {
      callback(state);
    });
  },
});
