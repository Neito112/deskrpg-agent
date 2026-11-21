import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function getHermesHome(): string {
  if (process.env.HERMES_HOME && fs.existsSync(process.env.HERMES_HOME)) {
    return process.env.HERMES_HOME;
  }
  // Co-located inside DeskRPG installation
  const cwdHermes = path.join(process.cwd(), "hermes");
  if (fs.existsSync(cwdHermes)) return cwdHermes;

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const localHermes = path.join(localAppData, "hermes");
  if (fs.existsSync(localHermes)) return localHermes;

  const homeHermes = path.join(os.homedir(), ".hermes");
  if (fs.existsSync(homeHermes)) return homeHermes;

  return process.platform === "win32" ? localHermes : homeHermes;
}

export function findHermesBin(): string | null {
  if (process.env.HERMES_BIN && fs.existsSync(process.env.HERMES_BIN)) {
    return process.env.HERMES_BIN;
  }

  const isWindows = process.platform === "win32";
  const exeName = isWindows ? "hermes.exe" : "hermes";

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const candidates = [
    // Co-located inside DeskRPG directory
    path.join(process.cwd(), "hermes", "bin", exeName),
    path.join(process.cwd(), "hermes", exeName),
    path.join(localAppData, "hermes", "hermes-agent", ".hermes", "bin", exeName),
    path.join(localAppData, "hermes", "bin", exeName),
    path.join(os.homedir(), ".hermes", "hermes-agent", ".hermes", "bin", exeName),
    path.join(os.homedir(), ".hermes", "bin", exeName),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  return null;
}

export function findHermesDesktopApp(): string | null {
  const isWindows = process.platform === "win32";
  if (!isWindows) {
    return null;
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  const candidates = [
    // Co-located inside DeskRPG directory
    path.join(process.cwd(), "hermes", "Hermes.exe"),
    path.join(process.cwd(), "hermes", "release", "win-unpacked", "Hermes.exe"),
    // Local compiled unpacked Electron build of Hermes Desktop
    path.join(localAppData, "hermes", "hermes-agent", "apps", "desktop", "release", "win-unpacked", "Hermes.exe"),
    // Winget / standalone installer paths
    path.join(localAppData, "Programs", "hermes-desktop", "Hermes.exe"),
    path.join(localAppData, "Programs", "Hermes", "Hermes.exe"),
    path.join(localAppData, "Programs", "Hermes Agent", "Hermes.exe"),
    path.join(programFiles, "Hermes", "Hermes.exe"),
    path.join(programFiles, "Hermes Agent", "Hermes.exe"),
    path.join(programFiles, "Hermes Desktop", "Hermes.exe"),
    path.join(programFilesX86, "Hermes Desktop", "Hermes.exe"),
    path.join(programFilesX86, "Hermes Agent", "Hermes.exe"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  // Check registry if hermes protocol handler command exists
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("node:child_process");
    const regOut = execSync('reg query "HKCU\\Software\\Classes\\hermes\\shell\\open\\command" /ve', { encoding: "utf8", windowsHide: true });
    const match = regOut.match(/"([^"]+\.exe)"/i);
    if (match && match[1] && fs.existsSync(match[1])) {
      return match[1];
    }
  } catch {}

  return null;
}

export async function launchHermesApp(): Promise<{
  ok: boolean;
  type: "desktop" | "web";
  url?: string;
  executable?: string;
  message?: string;
}> {
  // 1. Try launching native Hermes Desktop App first if installed on the host
  const desktopExe = findHermesDesktopApp();
  if (desktopExe) {
    try {
      console.log("[hermes-local-manager] Launching native Hermes Desktop:", desktopExe);
      const child = spawn(desktopExe, [], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      child.unref();
      return {
        ok: true,
        type: "desktop",
        executable: desktopExe,
        message: "Đã mở ứng dụng Hermes Desktop",
      };
    } catch (err) {
      console.warn("[hermes-local-manager] Failed to spawn native desktop executable, falling back:", err);
    }
  }

  // 2. If Windows registered hermes:// protocol, attempt to open via shell
  if (process.platform === "win32") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execSync } = require("node:child_process");
      execSync('powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command "Start-Process \'hermes://\'"', { stdio: "ignore", windowsHide: true });
      return {
        ok: true,
        type: "desktop",
        message: "Đã mở ứng dụng Hermes qua giao thức hermes://",
      };
    } catch {}
  }

  // 3. Fallback to Web Dashboard if no desktop app found
  try {
    const dash = await ensureHermesDashboardRunning();
    return { ok: true, type: "web", url: dash.url, message: "Đã mở giao diện Hermes Web Dashboard" };
  } catch {
    return {
      ok: false,
      type: "desktop",
      url: "ms-windows-store://pdp/?ProductId=9PMXK8CZC7KR",
      message: "Chưa tìm thấy Hermes Desktop. Bạn có thể cài đặt từ Microsoft Store.",
    };
  }
}

export function findHermesPython(): { pythonBin: string; hermesAgentDir: string } | null {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const toolsDir = path.join(localAppData, "hermes", "tools");
  const hermesAgentDir = path.join(localAppData, "hermes", "hermes-agent");

  if (!fs.existsSync(hermesAgentDir)) return null;

  if (fs.existsSync(toolsDir)) {
    try {
      const items = fs.readdirSync(toolsDir);
      for (const item of items) {
        if (item.startsWith("python-")) {
          const pyExe = path.join(toolsDir, item, "python.exe");
          if (fs.existsSync(pyExe)) {
            return { pythonBin: pyExe, hermesAgentDir };
          }
        }
      }
    } catch {}
  }

  return null;
}

export async function isPortHealthy(port: number, pathSuffix = "/health", timeoutMs = 1500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`http://127.0.0.1:${port}${pathSuffix}`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

export async function ensureHermesGatewayRunning(port = 8642): Promise<boolean> {
  try {
    syncLocalHermesWorkerPropagationAndLinks();
  } catch {}

  if (await isPortHealthy(port, "/health")) {
    return true;
  }

  console.log(`[hermes-local-manager] Gateway not responding on port ${port}, attempting to start...`);

  const bin = findHermesBin();
  const py = findHermesPython();

  if (!bin && !py) {
    console.warn("[hermes-local-manager] Hermes executable or python runtime not found on host.");
    return false;
  }

  const hermesHome = getHermesHome();

  const env = {
    ...process.env,
    HERMES_HOME: hermesHome,
    PYTHONIOENCODING: "utf-8",
    PYTHONPATH: py ? py.hermesAgentDir : (process.env.PYTHONPATH || ""),
  };

  try {
    if (process.platform === "win32") {
      // Launch through WMI (Win32_Process.Create) outside the parent's Job Object
      // with Win32_ProcessStartup ShowWindow = 0 (SW_HIDE) so it runs silently in the background
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execSync } = require("node:child_process");
        const cmdLine = bin
          ? `"${bin}" gateway run`
          : `"${py!.pythonBin}" -m hermes_cli.main gateway run`;
        const wmiScript = [
          "$ProgressPreference = 'SilentlyContinue'",
          `$env:HERMES_HOME = '${hermesHome.replace(/'/g, "''")}'`,
          "$si = [wmiclass]'Win32_ProcessStartup'",
          "$siInstance = $si.CreateInstance()",
          "$siInstance.ShowWindow = 0",
          "$p = [wmiclass]'Win32_Process'",
          `$r = $p.Create('${cmdLine.replace(/'/g, "''")}', '${hermesHome.replace(/'/g, "''")}', $siInstance)`,
        ].join("; ");
        const encoded = Buffer.from(wmiScript, "utf16le").toString("base64");
        execSync(`powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ${encoded}`, {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch (wmiErr) {
        console.warn("[hermes-local-manager] WMI launch failed, falling back to standard spawn:", wmiErr);
        let child;
        if (bin) {
          child = spawn(bin, ["gateway", "run"], {
            detached: true,
            stdio: "ignore",
            windowsHide: true,
            env,
          });
        } else if (py) {
          child = spawn(py.pythonBin, ["-m", "hermes_cli.main", "gateway", "run"], {
            detached: true,
            stdio: "ignore",
            windowsHide: true,
            env,
          });
        }
        if (child) {
          child.unref();
        }
      }
    } else {
      let child;
      if (bin) {
        child = spawn(bin, ["gateway", "run"], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
          env,
        });
      } else if (py) {
        child = spawn(py.pythonBin, ["-m", "hermes_cli.main", "gateway", "run"], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
          env,
        });
      }

      if (child) {
        child.unref();
      }
    }
  } catch (err) {
    console.error("[hermes-local-manager] Failed to spawn hermes gateway:", err);
    return false;
  }

  // Poll for up to 35 seconds for gateway to come alive
  const start = Date.now();
  while (Date.now() - start < 35000) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await isPortHealthy(port, "/health")) {
      console.log(`[hermes-local-manager] Gateway is now running on port ${port}`);
      return true;
    }
  }

  console.warn(`[hermes-local-manager] Gateway did not respond within timeout on port ${port}`);
  return false;
}

export async function ensureHermesDashboardRunning(port = 9119): Promise<{ ok: boolean; url: string }> {
  const url = `http://127.0.0.1:${port}`;
  if (await isPortHealthy(port, "/")) {
    return { ok: true, url };
  }

  console.log(`[hermes-local-manager] Hermes Dashboard not running on port ${port}, starting...`);
  const bin = findHermesBin();
  const py = findHermesPython();

  if (!bin && !py) {
    throw new Error("Hermes chưa được cài đặt trên máy.");
  }

  const hermesHome = getHermesHome();

  const env = {
    ...process.env,
    HERMES_HOME: hermesHome,
    PYTHONIOENCODING: "utf-8",
    PYTHONPATH: py ? py.hermesAgentDir : (process.env.PYTHONPATH || ""),
  };

  try {
    let child;
    if (bin) {
      child = spawn(bin, ["dashboard", "--no-open", "--port", String(port)], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env,
      });
    } else if (py) {
      child = spawn(py.pythonBin, ["-m", "hermes_cli.main", "dashboard", "--no-open", "--port", String(port)], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env,
      });
    }

    if (child) {
      child.unref();
    }
  } catch (err) {
    console.error("[hermes-local-manager] Failed to spawn dashboard:", err);
    throw err;
  }

  const start = Date.now();
  while (Date.now() - start < 10000) {
    await new Promise((r) => setTimeout(r, 600));
    if (await isPortHealthy(port, "/")) {
      return { ok: true, url };
    }
  }

  return { ok: true, url };
}

export async function stopHermesGateway(port = 8642): Promise<void> {
  try {
    if (process.platform === "win32") {
      const { execSync } = require("node:child_process");
      execSync(
        `powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore", windowsHide: true }
      );
    }
  } catch {}
}

export async function restartHermesGateway(port = 8642): Promise<boolean> {
  console.log(`[hermes-local-manager] Restarting Hermes Gateway on port ${port}...`);
  await stopHermesGateway(port);
  await new Promise((r) => setTimeout(r, 1200));
  return ensureHermesGatewayRunning(port);
}

export function patchDeskrpgPluginSkillsSymbols(hermesHome: string): void {
  try {
    const apiFile = path.join(hermesHome, "plugins", "deskrpg", "deskrpg_plugin", "_hermes_api.py");
    if (!fs.existsSync(apiFile)) return;
    let content = fs.readFileSync(apiFile, "utf-8");
    const target = "resolved[dst] = getattr(module, src, None) if module is not None else None";
    if (content.includes(target)) {
      const replacement = `val = getattr(module, src, None) if module is not None else None
            if val is None and module is not None:
                if src.startswith("_"):
                    val = getattr(module, src[1:], None)
                else:
                    val = getattr(module, "_" + src, None)
            resolved[dst] = val`;
      content = content.replace(target, replacement);
      fs.writeFileSync(apiFile, content, "utf-8");
    }

    // Ensure gateway.run is lazy loaded so register() doesn't exceed Hermes's 10-second timeout
    if (!content.includes('if module_path == "gateway.run":')) {
      const optTarget = "for module_path, names in OPTIONAL_SPEC:\n";
      const optReplacement = `for module_path, names in OPTIONAL_SPEC:
        if module_path == "gateway.run":
            def _lazy_scope(*args, **kwargs):
                from gateway.run import _profile_runtime_scope
                return _profile_runtime_scope(*args, **kwargs)
            for src, dst in _pairs(names):
                resolved[dst] = _lazy_scope
            continue\n`;
      if (content.includes(optTarget)) {
        content = content.replace(optTarget, optReplacement);
        fs.writeFileSync(apiFile, content, "utf-8");
      }
    }
  } catch {}
}

export function syncLocalHermesWorkerPropagationAndLinks(): { ok: boolean; message?: string } {
  try {
    const isWindows = process.platform === "win32";
    const hermesHome = getHermesHome();

    if (!fs.existsSync(hermesHome)) {
      return { ok: false, message: "Hermes home not found" };
    }

    const rootConfigPath = path.join(hermesHome, "config.yaml");
    const rootPluginsDeskrpg = path.join(hermesHome, "plugins", "deskrpg");

    // 0. Ensure bundled skills are present in ~/.hermes/skills and patch skill symbols in deskrpg_plugin
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ensureBundledSkillsInstalled } = require("./plugins-catalog");
      ensureBundledSkillsInstalled(hermesHome);
    } catch {}
    try {
      patchDeskrpgPluginSkillsSymbols(hermesHome);
    } catch {}

    // 1. Ensure root config.yaml has plugins.entries.deskrpg.worker_propagation: true, plugins.enabled includes deskrpg, and idle auto-shutdown is disabled
    if (fs.existsSync(rootConfigPath)) {
      let cfgText = fs.readFileSync(rootConfigPath, "utf-8");
      let changed = false;

      // Disable scale_to_zero and unmanaged idle auto-shutdown so background daemon stays alive
      if (/idle_timeout_minutes:\s*[1-9]\d*/.test(cfgText)) {
        cfgText = cfgText.replace(/idle_timeout_minutes:\s*[1-9]\d*/g, "idle_timeout_minutes: 0");
        changed = true;
      }
      if (/unmanaged_idle_exit_seconds:\s*[1-9]\d*/.test(cfgText)) {
        cfgText = cfgText.replace(/unmanaged_idle_exit_seconds:\s*[1-9]\d*/g, "unmanaged_idle_exit_seconds: 0");
        changed = true;
      }

      // Ensure worker_propagation: true
      if (!/worker_propagation:\s*true/i.test(cfgText)) {
        if (/entries:\s*\{[^}]*deskrpg:[^}]*\}/.test(cfgText)) {
          cfgText = cfgText.replace(
            /(entries:\s*\{[^}]*deskrpg:\s*\{)/,
            "$1worker_propagation: true, ",
          );
          changed = true;
        } else if (/entries:\s*\n/m.test(cfgText)) {
          cfgText = cfgText.replace(
            /(entries:\s*\n)/,
            "$1    deskrpg:\n      worker_propagation: true\n",
          );
          changed = true;
        } else if (/plugins:\s*\n/m.test(cfgText)) {
          cfgText = cfgText.replace(
            /(plugins:\s*\n)/,
            "$1  entries:\n    deskrpg:\n      worker_propagation: true\n",
          );
          changed = true;
        }
      }

      // Ensure deskrpg in plugins.enabled
      if (!/enabled:[\s\S]*?['"]?deskrpg['"]?/.test(cfgText)) {
        if (/enabled:\s*\[([^\]]*)\]/.test(cfgText)) {
          cfgText = cfgText.replace(/enabled:\s*\[([^\]]*)\]/, (_m, list) => {
            const trimmed = list.trim();
            const items = trimmed ? `${trimmed}, 'deskrpg'` : `'deskrpg'`;
            return `enabled: [${items}]`;
          });
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(rootConfigPath, cfgText, "utf-8");
      }
    }

    // 2. Iterate through all profile directories in profiles/*
    const profilesDir = path.join(hermesHome, "profiles");
    if (fs.existsSync(profilesDir) && fs.existsSync(rootPluginsDeskrpg)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execSync } = require("node:child_process");
      const profiles = fs.readdirSync(profilesDir);
      for (const p of profiles) {
        const pDir = path.join(profilesDir, p);
        if (!fs.statSync(pDir).isDirectory()) continue;

        const pPluginsDir = path.join(pDir, "plugins");
        const pDeskrpg = path.join(pPluginsDir, "deskrpg");
        fs.mkdirSync(pPluginsDir, { recursive: true });

        // Check if pDeskrpg is already a valid symlink or junction
        let needsLink = true;
        try {
          const lstat = fs.lstatSync(pDeskrpg);
          if (lstat.isSymbolicLink()) {
            needsLink = false;
          } else if (isWindows) {
            try {
              const target = fs.readlinkSync(pDeskrpg);
              if (target && path.resolve(target) === path.resolve(rootPluginsDeskrpg) && fs.existsSync(pDeskrpg)) {
                needsLink = false;
              }
            } catch {}
          }
        } catch {
          needsLink = true;
        }

        if (needsLink) {
          try {
            if (isWindows) {
              execSync(`cmd /c rmdir /s /q "${pDeskrpg}"`, { stdio: "ignore", windowsHide: true });
            } else {
              fs.rmSync(pDeskrpg, { recursive: true, force: true });
            }
          } catch {}

          try {
            if (isWindows) {
              execSync(`cmd /c mklink /J "${pDeskrpg}" "${rootPluginsDeskrpg}"`, { stdio: "ignore", windowsHide: true });
            } else {
              fs.symlinkSync(rootPluginsDeskrpg, pDeskrpg, "junction");
            }
          } catch (e) {
            console.warn(`[hermes-local-manager] Failed to link plugin for profile ${p}:`, e);
          }
        }

        // Ensure profile config.yaml exists, enables deskrpg, and inherits native model from root config.yaml
        const pConfig = path.join(pDir, "config.yaml");
        let modelSnippet = "";
        if (fs.existsSync(rootConfigPath)) {
          const rootText = fs.readFileSync(rootConfigPath, "utf-8");
          const modelMatch = rootText.match(/(?:^|\n)(model:\s*\n(?:[ ]+[^\n]+\n)+)/);
          if (modelMatch && modelMatch[1]) {
            modelSnippet = modelMatch[1].trim();
          }
        }

        if (!fs.existsSync(pConfig)) {
          fs.writeFileSync(pConfig, `plugins:\n  enabled:\n    - deskrpg\n\n${modelSnippet ? modelSnippet + "\n" : ""}`, "utf-8");
        } else {
          let pCfgText = fs.readFileSync(pConfig, "utf-8");
          let changed = false;
          if (!pCfgText.includes("model:") && !pCfgText.includes("provider:") && modelSnippet) {
            pCfgText += `\n${modelSnippet}\n`;
            changed = true;
          } else if (modelSnippet) {
            // Restore native root model if it was erroneously forced to openrouter or has broken base_url
            if (pCfgText.includes("provider: openrouter") || (pCfgText.includes("provider: nvidia") && pCfgText.includes("openrouter.ai"))) {
              pCfgText = pCfgText.replace(/model:\s*\n(?:\s+[^\n]+\n)+/g, `${modelSnippet}\n`);
              changed = true;
            }
          }
          if (/mcp_servers:\s*\n(?:\s+[^\n]+\n)+/.test(pCfgText)) {
            pCfgText = pCfgText.replace(/mcp_servers:\s*\n(?:\s+[^\n]+\n)+/g, "mcp_servers: {}\n");
            changed = true;
          }
          if (!/enabled:[\s\S]*?['"]?deskrpg['"]?/.test(pCfgText)) {
            if (/enabled:\s*\[([^\]]*)\]/.test(pCfgText)) {
              pCfgText = pCfgText.replace(/enabled:\s*\[([^\]]*)\]/, (_m, list) => {
                const trimmed = list.trim();
                const items = trimmed ? `${trimmed}, 'deskrpg'` : `'deskrpg'`;
                return `enabled: [${items}]`;
              });
              changed = true;
            } else if (/plugins:\s*\n/m.test(pCfgText)) {
              pCfgText = pCfgText.replace(/(plugins:\s*\n)/, "$1  enabled:\n    - deskrpg\n");
              changed = true;
            } else {
              pCfgText += "\nplugins:\n  enabled:\n    - deskrpg\n";
              changed = true;
            }
          }
          if (changed) {
            fs.writeFileSync(pConfig, pCfgText, "utf-8");
          }
        }

        // Synchronize all keys from root .env into profile .env
        const rootEnvPath = path.join(hermesHome, ".env");
        const pEnvPath = path.join(pDir, ".env");
        if (fs.existsSync(rootEnvPath)) {
          if (!fs.existsSync(pEnvPath) || fs.statSync(pEnvPath).size === 0) {
            try {
              fs.copyFileSync(rootEnvPath, pEnvPath);
            } catch {}
          } else {
            try {
              const rootEnvContent = fs.readFileSync(rootEnvPath, "utf-8");
              let pEnvContent = fs.readFileSync(pEnvPath, "utf-8");
              let envChanged = false;
              for (const line of rootEnvContent.split("\n")) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) continue;
                const eqIdx = trimmed.indexOf("=");
                if (eqIdx > 0) {
                  const key = trimmed.slice(0, eqIdx).trim();
                  const val = trimmed.slice(eqIdx + 1).trim();
                  const keyRegex = new RegExp(`^(?:#\\s*)?${key}=.*$`, "m");
                  if (keyRegex.test(pEnvContent)) {
                    const match = pEnvContent.match(keyRegex);
                    if (match && match[0].endsWith("=") && val) {
                      pEnvContent = pEnvContent.replace(keyRegex, `${key}=${val}`);
                      envChanged = true;
                    }
                  } else {
                    pEnvContent += `\n${key}=${val}`;
                    envChanged = true;
                  }
                }
              }
              if (envChanged) {
                fs.writeFileSync(pEnvPath, pEnvContent.trim() + "\n", "utf-8");
              }
            } catch {}
          }
        }
      }
    }

    return { ok: true };
  } catch (err) {
    console.warn("[hermes-local-manager] syncLocalHermesWorkerPropagationAndLinks error:", err);
    return { ok: false, message: String(err) };
  }
}

/**
 * Ensures a profile in Hermes is fully provisioned and compatible with Hermes Desktop:
 * - config.yaml contains deskrpg plugin and inherits LLM model configuration from root config.yaml
 * - .env contains API keys copied from root .env
 * - profile.yaml defines presentation title for Hermes Desktop Bots roster
 * - deskrpg plugin junction is connected
 * - state.db contains canonical 'Bot Chat' session for instant zero-error chat opening in Hermes Desktop
 */
export function ensureProfileHermesCompatibility(
  hermesHome: string,
  profileName: string,
  displayName?: string
): void {
  try {
    const isWindows = process.platform === "win32";
    const profileDir = profileName === "default"
      ? path.join(hermesHome, "profiles", "default")
      : path.join(hermesHome, "profiles", profileName);

    fs.mkdirSync(profileDir, { recursive: true });

    // 1. Inherit native model from root config.yaml if profile config.yaml is missing it
    const rootConfigPath = path.join(hermesHome, "config.yaml");
    const profileConfigPath = path.join(profileDir, "config.yaml");

    let modelSnippet = "";
    if (fs.existsSync(rootConfigPath)) {
      const rootText = fs.readFileSync(rootConfigPath, "utf-8");
      const modelMatch = rootText.match(/(?:^|\n)(model:\s*\n(?:[ ]+[^\n]+\n)+)/);
      if (modelMatch && modelMatch[1]) {
        modelSnippet = modelMatch[1].trim();
      }
    }

    if (!fs.existsSync(profileConfigPath)) {
      fs.writeFileSync(
        profileConfigPath,
        `plugins:\n  enabled:\n    - deskrpg\n\n${modelSnippet ? modelSnippet + "\n" : ""}`,
        "utf-8"
      );
    } else {
      let cfgText = fs.readFileSync(profileConfigPath, "utf-8");
      let changed = false;
      if (!cfgText.includes("model:") && !cfgText.includes("provider:") && modelSnippet) {
        cfgText += `\n${modelSnippet}\n`;
        changed = true;
      } else if (modelSnippet) {
        // Restore native root model if it was erroneously forced to openrouter or has broken base_url
        if (cfgText.includes("provider: openrouter") || (cfgText.includes("provider: nvidia") && cfgText.includes("openrouter.ai"))) {
          cfgText = cfgText.replace(/model:\s*\n(?:\s+[^\n]+\n)+/g, `${modelSnippet}\n`);
          changed = true;
        }
      }
      if (/mcp_servers:\s*\n(?:\s+[^\n]+\n)+/.test(cfgText)) {
        cfgText = cfgText.replace(/mcp_servers:\s*\n(?:\s+[^\n]+\n)+/g, "mcp_servers: {}\n");
        changed = true;
      }
      if (!/enabled:[\s\S]*?['"]?deskrpg['"]?/.test(cfgText)) {
        if (/enabled:\s*\[([^\]]*)\]/.test(cfgText)) {
          cfgText = cfgText.replace(/enabled:\s*\[([^\]]*)\]/, (_m, list) => {
            const trimmed = list.trim();
            const items = trimmed ? `${trimmed}, 'deskrpg'` : `'deskrpg'`;
            return `enabled: [${items}]`;
          });
          changed = true;
        } else if (/plugins:\s*\n/m.test(cfgText)) {
          cfgText = cfgText.replace(/(plugins:\s*\n)/, "$1  enabled:\n    - deskrpg\n");
          changed = true;
        } else {
          cfgText += "\nplugins:\n  enabled:\n    - deskrpg\n";
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(profileConfigPath, cfgText, "utf-8");
      }
    }

    // 2. Synchronize all keys from root .env into profile .env
    const rootEnvPath = path.join(hermesHome, ".env");
    const profileEnvPath = path.join(profileDir, ".env");
    if (fs.existsSync(rootEnvPath)) {
      if (!fs.existsSync(profileEnvPath) || fs.statSync(profileEnvPath).size === 0) {
        try {
          fs.copyFileSync(rootEnvPath, profileEnvPath);
        } catch {}
      } else {
        try {
          const rootEnvContent = fs.readFileSync(rootEnvPath, "utf-8");
          let pEnvContent = fs.readFileSync(profileEnvPath, "utf-8");
          let envChanged = false;
          for (const line of rootEnvContent.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx > 0) {
              const key = trimmed.slice(0, eqIdx).trim();
              const val = trimmed.slice(eqIdx + 1).trim();
              const keyRegex = new RegExp(`^(?:#\\s*)?${key}=.*$`, "m");
              if (keyRegex.test(pEnvContent)) {
                const match = pEnvContent.match(keyRegex);
                if (match && match[0].endsWith("=") && val) {
                  pEnvContent = pEnvContent.replace(keyRegex, `${key}=${val}`);
                  envChanged = true;
                }
              } else {
                pEnvContent += `\n${key}=${val}`;
                envChanged = true;
              }
            }
          }
          if (envChanged) {
            fs.writeFileSync(profileEnvPath, pEnvContent.trim() + "\n", "utf-8");
          }
        } catch {}
      }
    }

    // 3. Write profile.yaml with ui_meta for Hermes Desktop
    if (displayName) {
      const profileYamlPath = path.join(profileDir, "profile.yaml");
      const uiMetaYaml = `ui_meta:\n  hermes-bots:\n    shape: blobatar\n    imageKind: photo\n    title: "${displayName.replace(/"/g, '\\"')}"\n    created: ${Date.now()}\n    custom: true\n_ui_meta_revisions:\n  hermes-bots: 2\n`;
      fs.writeFileSync(profileYamlPath, uiMetaYaml, "utf-8");

      if (profileName === "default") {
        fs.writeFileSync(path.join(hermesHome, "profile.yaml"), uiMetaYaml, "utf-8");
      }
    }

    // 4. Ensure plugins/deskrpg junction
    const rootPluginsDeskrpg = path.join(hermesHome, "plugins", "deskrpg");
    const pPluginsDir = path.join(profileDir, "plugins");
    const pDeskrpg = path.join(pPluginsDir, "deskrpg");
    fs.mkdirSync(pPluginsDir, { recursive: true });
    if (fs.existsSync(rootPluginsDeskrpg) && !fs.existsSync(pDeskrpg)) {
      try {
        if (isWindows) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { execSync } = require("node:child_process");
          execSync(`cmd /c rmdir /s /q "${pDeskrpg}"`, { stdio: "ignore", windowsHide: true });
          execSync(`cmd /c mklink /J "${pDeskrpg}" "${rootPluginsDeskrpg}"`, { stdio: "ignore", windowsHide: true });
        } else {
          fs.rmSync(pDeskrpg, { recursive: true, force: true });
          fs.symlinkSync(rootPluginsDeskrpg, pDeskrpg, "junction");
        }
      } catch {}
    }

    // 5. Ensure state.db has a canonical session titled 'Bot Chat'
    const stateDbCandidates = [
      path.join(profileDir, "state.db"),
    ];
    if (profileName === "default") {
      stateDbCandidates.unshift(path.join(hermesHome, "state.db"));
    }

    for (const stateDbPath of stateDbCandidates) {
      if (fs.existsSync(stateDbPath)) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Database = require("better-sqlite3");
          const sdb = new Database(stateDbPath, { timeout: 1000 });
          const rows = sdb.prepare("SELECT id, title FROM sessions").all() as { id: string; title: string | null }[];
          const hasBotChat = rows.some((r) => r.title === "Bot Chat");
          if (!hasBotChat) {
            const untitled = rows.find((r) => !r.title);
            if (untitled) {
              sdb.prepare("UPDATE sessions SET title = 'Bot Chat', hidden = 1 WHERE id = ?").run(untitled.id);
            } else {
              const sid = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
              sdb.prepare("INSERT INTO sessions (id, title, source, hidden, started_at) VALUES (?, 'Bot Chat', 'gui', 1, ?)").run(sid, Date.now() / 1000);
            }
          }
          sdb.close();
        } catch {
          // Ignore if locked by active gateway process
        }
      }
    }
  } catch (err) {
    console.warn(`[ensureProfileHermesCompatibility] Error for profile ${profileName}:`, err);
  }
}


