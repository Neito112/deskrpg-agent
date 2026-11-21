const { app, BrowserWindow, shell, Menu, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

const isPackaged = app.isPackaged;
const rootDir = isPackaged
  ? path.join(process.resourcesPath, "app")
  : path.join(__dirname, "..");

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`${SERVER_URL}/api/auth/status`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

function checkPortListening(port, reqPath = "/health") {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}${reqPath}`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => { req.destroy(); resolve(false); });
  });
}

function findHermesExecutable() {
  const fs = require("fs");
  const os = require("os");
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const isWindows = process.platform === "win32";
  const exeName = isWindows ? "hermes.exe" : "hermes";

  const candidates = [
    // Co-located inside DeskRPG installation
    path.join(rootDir, "hermes", "bin", exeName),
    path.join(rootDir, "hermes", exeName),
    path.join(rootDir, "hermes", "Hermes.exe"),
    path.join(path.dirname(process.execPath), "hermes", "bin", exeName),
    path.join(path.dirname(process.execPath), "hermes", "Hermes.exe"),
    path.join(localAppData, "hermes", "bin", exeName),
    path.join(localAppData, "hermes", "hermes-agent", ".hermes", "bin", exeName),
    path.join(os.homedir(), ".hermes", "bin", exeName),
    path.join(os.homedir(), ".hermes", "hermes-agent", ".hermes", "bin", exeName),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function startHermesGatewayIfNeeded() {
  return checkPortListening(8642).then((running) => {
    if (running) {
      console.log("[electron] Hermes Gateway is already running on port 8642.");
      return;
    }
    const fs = require("fs");
    const os = require("os");
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    const hermesBin = findHermesExecutable();
    const hermesHome = process.env.HERMES_HOME || path.join(localAppData, "hermes");
    const pyExe = path.join(hermesHome, "tools", "python-3.14.9+20261021-win32-x64", "python.exe");
    const hermesAgent = path.join(hermesHome, "hermes-agent");

    if (hermesBin) {
      console.log("[electron] Starting Hermes Gateway in background:", hermesBin);
      const hProcess = spawn(hermesBin, ["gateway", "run"], {
        detached: true, stdio: "ignore", windowsHide: true,
        env: { ...process.env, HERMES_HOME: hermesHome, PYTHONIOENCODING: "utf-8" },
      });
      hProcess.unref();
    } else if (fs.existsSync(pyExe) && fs.existsSync(hermesAgent)) {
      console.log("[electron] Starting Hermes Gateway via Python runtime...");
      const hProcess = spawn(pyExe, ["-m", "hermes_cli.main", "gateway", "run"], {
        detached: true, stdio: "ignore", windowsHide: true,
        env: { ...process.env, HERMES_HOME: hermesHome, PYTHONPATH: hermesAgent, PYTHONIOENCODING: "utf-8" },
      });
      hProcess.unref();
    } else {
      console.warn("[electron] Hermes executable not found on host.");
    }
  }).catch((err) => {
    console.error("[electron] Error starting Hermes gateway:", err);
  });
}

function startServer() {
  const isWindows = process.platform === "win32";
  if (isPackaged) {
    const serverPath = path.join(rootDir, "server.js");
    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: rootDir, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
      shell: isWindows,
    });
  } else {
    const cmd = isWindows ? "npm.cmd" : "npm";
    serverProcess = spawn(cmd, ["run", "dev"], {
      cwd: rootDir, stdio: "ignore",
      env: { ...process.env, PORT: String(PORT) },
      shell: isWindows,
    });
  }
  serverProcess.on("exit", (code) => { if (!isQuitting) console.log(`Server exited ${code}`); });
  if (serverProcess.stdout) serverProcess.stdout.on("data", d => { const m=d.toString().trim(); if(m) console.log(`[server] ${m}`); });
  if (serverProcess.stderr) serverProcess.stderr.on("data", d => { const m=d.toString().trim(); if(m) console.error(`[server:err] ${m}`); });
}

function sendWindowState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("window:state-changed", { maximized: mainWindow.isMaximized(), fullscreen: mainWindow.isFullScreen() });
  }
}

function setupIpcHandlers() {
  ipcMain.on("window:minimize", () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize(); });
  ipcMain.on("window:maximize", () => { if (!mainWindow || mainWindow.isDestroyed()) return; if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); sendWindowState(); });
  ipcMain.on("window:toggle-fullscreen", () => { if (!mainWindow || mainWindow.isDestroyed()) return; mainWindow.setFullScreen(!mainWindow.isFullScreen()); sendWindowState(); });
  ipcMain.on("window:close", () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close(); });
  ipcMain.on("window:open-external", (_e, url) => { if (url) shell.openExternal(url); });
  ipcMain.handle("window:is-maximized", () => mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 680,
    frame: false, thickFrame: true, title: "DeskRPG",
    icon: path.join(rootDir, "public/favicon.ico"),
    backgroundColor: "#f3eee2",
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, "preload.js"), sandbox: false, webSecurity: true },
    autoHideMenuBar: true, show: false,
  });
  Menu.setApplicationMenu(null);
  mainWindow.on("maximize", sendWindowState);
  mainWindow.on("unmaximize", sendWindowState);
  mainWindow.on("enter-full-screen", sendWindowState);
  mainWindow.on("leave-full-screen", sendWindowState);
  mainWindow.webContents.on("did-finish-load", sendWindowState);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") { e.preventDefault(); mainWindow.setFullScreen(!mainWindow.isFullScreen()); sendWindowState(); }
    else if (input.key === "F12") { e.preventDefault(); mainWindow.webContents.toggleDevTools(); }
    else if (input.key === "F5") { e.preventDefault(); mainWindow.reload(); }
    else if (input.control && input.key.toLowerCase() === "r") { e.preventDefault(); if (input.shift) mainWindow.webContents.reloadIgnoringCache(); else mainWindow.reload(); }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

async function init() {
  setupIpcHandlers();
  createWindow();

  await mainWindow.loadFile(path.join(__dirname, "loading.html"));

  mainWindow.webContents.executeJavaScript(`
    document.getElementById('edition-badge').textContent = ${isPackaged ? '"Desktop Edition"' : '"Development"'};
  `).catch(() => {});

  startServer();
  startHermesGatewayIfNeeded();

  let attempts = 0, maxAttempts = isPackaged ? 60 : 40;
  const poll = setInterval(async () => {
    attempts++;
    if (await checkServerReady()) { clearInterval(poll); if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(SERVER_URL); }
    else if (attempts >= maxAttempts) { clearInterval(poll); if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent('<body style="background:#0d1117;color:#fff;font-family:sans-serif;padding:40px;text-align:center;"><h2 style="color:#f85149;">Không thể kết nối đến máy chủ DeskRPG</h2><p style="color:#8b949e;">Thời gian chờ quá lâu. Vui lòng đóng và mở lại ứng dụng.</p></body>')}`); }
  }, 1000);
}

function killPort(port) {
  if (process.platform === "win32") {
    try {
      const { execSync } = require("child_process");
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: "utf8" }).trim();
      for (const line of out.split("\n")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && pid !== "0" && pid !== String(process.pid)) {
          try { execSync(`taskkill /F /T /PID ${pid}`); } catch {}
        }
      }
    } catch {}
  }
}

function stopServer() {
  isQuitting = true;
  if (serverProcess && serverProcess.pid) {
    if (process.platform === "win32") {
      try { spawn("taskkill", ["/pid", String(serverProcess.pid), "/f", "/t"]); } catch {}
    } else {
      serverProcess.kill("SIGTERM");
    }
    serverProcess = null;
  }
  killPort(PORT);
  killPort(9119);
  // Kill Gemini Web bridge browser (CDP port 9222) spawned by this DeskRPG session
  killPort(9222);
}

app.whenReady().then(init);
app.on("window-all-closed", () => { stopServer(); if (process.platform!=="darwin") app.quit(); });
app.on("before-quit", stopServer);
app.on("will-quit", stopServer);
