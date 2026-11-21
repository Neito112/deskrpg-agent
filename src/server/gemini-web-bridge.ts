import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadCliRoutingConfig } from "@/server/cli-routing-store";

export type BridgeStatus = "not_started" | "needs_login" | "connected";

export interface BridgeStatusResponse {
  status: BridgeStatus;
  browser: string | null;
  port: number;
  profileDir: string;
  tabCount?: number;
  error?: string | null;
}

let activeBrowserProcess: ChildProcess | null = null;
let cleanupRegistered = false;

export function getProfileDirectory(): string {
  const localAppData =
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(localAppData, "DeskRPG", "gemini-profile");
}

export function getCdpPort(): number {
  try {
    const config = loadCliRoutingConfig();
    const url = new URL(config.geminiGuide.cdpUrl || "http://127.0.0.1:9222");
    return parseInt(url.port, 10) || 9222;
  } catch {
    return 9222;
  }
}

export function findBrowserExecutable(): { path: string; name: "chrome" | "edge" } | null {
  const isWindows = process.platform === "win32";
  if (!isWindows) {
    // Linux/macOS fallback
    const unixCandidates = ["google-chrome", "chromium", "microsoft-edge", "google-chrome-stable"];
    for (const name of unixCandidates) {
      const probe = spawnSync("which", [name], { encoding: "utf8" });
      if (probe.status === 0 && probe.stdout.trim()) {
        return {
          path: probe.stdout.trim().split("\n")[0].trim(),
          name: name.includes("edge") ? "edge" : "chrome",
        };
      }
    }
    return null;
  }

  const localAppData =
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  const chromeCandidates = [
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
  ];

  for (const p of chromeCandidates) {
    if (fs.existsSync(p)) return { path: p, name: "chrome" };
  }

  const edgeCandidates = [
    path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
  ];

  for (const p of edgeCandidates) {
    if (fs.existsSync(p)) return { path: p, name: "edge" };
  }

  // Fallback to where.exe
  const probeChrome = spawnSync("where.exe", ["chrome"], { encoding: "utf8" });
  if (probeChrome.status === 0 && probeChrome.stdout.trim()) {
    return { path: probeChrome.stdout.trim().split(/\r?\n/)[0].trim(), name: "chrome" };
  }

  const probeEdge = spawnSync("where.exe", ["msedge"], { encoding: "utf8" });
  if (probeEdge.status === 0 && probeEdge.stdout.trim()) {
    return { path: probeEdge.stdout.trim().split(/\r?\n/)[0].trim(), name: "edge" };
  }

  return null;
}

export async function isCdpPortOpen(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getBridgeStatus(): Promise<BridgeStatusResponse> {
  const browser = findBrowserExecutable();
  const port = getCdpPort();
  const profileDir = getProfileDirectory();

  const isPortUp = await isCdpPortOpen(port);
  if (!isPortUp) {
    return {
      status: "not_started",
      browser: browser?.name ?? null,
      port,
      profileDir,
    };
  }

  try {
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`, {
      signal: AbortSignal.timeout(2500),
    });
    const tabs: Array<{ url?: string; type?: string }> = listRes.ok
      ? await listRes.json()
      : [];

    const geminiTab = tabs.find(
      (t) => t.type === "page" && t.url && t.url.includes("gemini.google.com")
    );

    if (!geminiTab || !geminiTab.url) {
      // Browser is open with CDP, but Gemini tab not opened yet
      return {
        status: "needs_login",
        browser: browser?.name ?? null,
        port,
        profileDir,
        tabCount: tabs.length,
      };
    }

    if (
      geminiTab.url.includes("accounts.google.com") ||
      geminiTab.url.includes("servicelogin")
    ) {
      return {
        status: "needs_login",
        browser: browser?.name ?? null,
        port,
        profileDir,
        tabCount: tabs.length,
      };
    }

    return {
      status: "connected",
      browser: browser?.name ?? null,
      port,
      profileDir,
      tabCount: tabs.length,
    };
  } catch (err) {
    return {
      status: "not_started",
      browser: browser?.name ?? null,
      port,
      profileDir,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function startInteractiveLogin(): Promise<BridgeStatusResponse> {
  const browser = findBrowserExecutable();
  if (!browser) {
    throw new Error("Không tìm thấy trình duyệt Google Chrome hoặc Microsoft Edge trên máy.");
  }

  const port = getCdpPort();
  const profileDir = getProfileDirectory();
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const isOpen = await isCdpPortOpen(port);
  if (isOpen) {
    // Open or focus Gemini tab
    try {
      await fetch(`http://127.0.0.1:${port}/json/new?https://gemini.google.com/app`, {
        method: "PUT",
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // ignore
    }
    return getBridgeStatus();
  }

  // Spawn visible window
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "https://gemini.google.com/app",
  ];

  const proc = spawn(browser.path, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });

  proc.unref();
  activeBrowserProcess = proc;
  registerCleanup();

  // Wait a moment for port to initialize
  await new Promise((r) => setTimeout(r, 2000));
  return getBridgeStatus();
}

export async function ensureBackgroundBridge(): Promise<BridgeStatusResponse> {
  const browser = findBrowserExecutable();
  if (!browser) {
    throw new Error("Không tìm thấy trình duyệt Google Chrome hoặc Microsoft Edge trên máy.");
  }

  const port = getCdpPort();
  const profileDir = getProfileDirectory();
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const isOpen = await isCdpPortOpen(port);
  if (isOpen) {
    return getBridgeStatus();
  }

  // Spawn background / minimized browser
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-position=-3000,-3000",
    "--window-size=1024,768",
    "https://gemini.google.com/app",
  ];

  const proc = spawn(browser.path, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  proc.unref();
  activeBrowserProcess = proc;
  registerCleanup();

  // Wait up to 3 seconds for port to open
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isCdpPortOpen(port)) break;
  }

  return getBridgeStatus();
}

function registerCleanup() {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  const cleanup = () => {
    if (activeBrowserProcess && !activeBrowserProcess.killed) {
      try {
        activeBrowserProcess.kill();
      } catch {
        // ignore
      }
    }
  };

  process.once("exit", cleanup);
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);
}
