/**
 * Auto-Bootstrap — Runs once at DeskRPG startup in both dev and production/Electron.
 *
 * Responsibilities:
 * 1. Ensure `data/cli-routing-config.json` exists with defaults.
 * 2. Sync 6 core skills to the Hermes skills dir (if newer or missing).
 *    Windows: %LOCALAPPDATA%\hermes\skills\ — Linux/macOS: $XDG_DATA_HOME
 *    (or ~/.local/share)/hermes/skills. Docker/Linux must never sync to a
 *    Windows path.
 * 3. If Gemini Web profile already has a login session, start the background bridge.
 * 4. Register cleanup handlers for browser processes.
 *
 * This module is imported via dynamic `import()` in server.js (CJS) and
 * statically in dev-server.ts (ESM/tsx). It must not use any build-time-only
 * imports (e.g. Next.js, React).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── 1. Ensure default routing config ───────────────────────────────

export function ensureDefaultRoutingConfig(appRoot: string): void {
  const configPath = path.join(appRoot, "data", "cli-routing-config.json");
  if (fs.existsSync(configPath)) return;

  const defaults = {
    geminiGuide: {
      mode: "auto",
      manualModel: "thinking",
      cdpUrl: "http://127.0.0.1:9222",
    },
    agyExecutor: {
      mode: "auto",
      manualModel: "gemini-3.8-flash-high",
    },
  };

  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), "utf8");
    console.log("[bootstrap] Created default routing config.");
  } catch (err) {
    console.warn("[bootstrap] Could not create default routing config:", err);
  }
}

// ─── 2. Sync core skills ────────────────────────────────────────────

const CORE_SKILLS = [
  "dynamic-slide-report",
  "gemini-guide",
  "agy-executor",
  "hermes-orchestrator",
  "task-model-router",
  "blender-artist",
] as const;

function getHermesSkillsDir(): string {
  // Cross-platform: Docker/Linux must NOT sync to a Windows path.
  // Windows keeps %LOCALAPPDATA%\hermes\skills; Linux/macOS use the XDG
  // data dir (~/.local/share/hermes/skills when $XDG_DATA_HOME is unset).
  if (process.platform === "win32") {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "hermes", "skills");
  }
  const dataHome =
    process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  return path.join(dataHome, "hermes", "skills");
}

/** True when running inside a Docker container. */
function isRunningInDocker(): boolean {
  if (process.env.DESKRPG_IN_DOCKER) return true;
  try {
    return fs.existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

/**
 * Resolve the source directory for bundled skills.
 * - In dev: `<appRoot>/.agents/skills`
 * - In Electron packaged build: `process.resourcesPath/skills`
 */
function resolveSkillsSourceDir(appRoot: string): string | null {
  // Try dev path first
  const devPath = path.join(appRoot, ".agents", "skills");
  if (fs.existsSync(devPath)) return devPath;

  // Try Electron packaged resources path
  if (process.resourcesPath) {
    const pkgPath = path.join(process.resourcesPath, "skills");
    if (fs.existsSync(pkgPath)) return pkgPath;
  }

  return null;
}

/** Recursively get all files with their relative path and mtime. */
function walkFiles(
  dir: string,
  base: string = ""
): Array<{ rel: string; full: string; mtime: number }> {
  const results: Array<{ rel: string; full: string; mtime: number }> = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, rel));
    } else {
      try {
        const stat = fs.statSync(full);
        results.push({ rel, full, mtime: stat.mtimeMs });
      } catch {
        // skip unreadable files
      }
    }
  }
  return results;
}

function syncOneSkill(srcDir: string, destDir: string): boolean {
  if (!fs.existsSync(srcDir)) return false;

  const srcFiles = walkFiles(srcDir);
  let synced = false;

  for (const sf of srcFiles) {
    const destFile = path.join(destDir, sf.rel);
    let shouldCopy = false;

    if (!fs.existsSync(destFile)) {
      shouldCopy = true;
    } else {
      try {
        const destStat = fs.statSync(destFile);
        if (sf.mtime > destStat.mtimeMs + 1000) {
          // Source is newer (1s tolerance for FS precision)
          shouldCopy = true;
        }
      } catch {
        shouldCopy = true;
      }
    }

    if (shouldCopy) {
      const destFileDir = path.dirname(destFile);
      if (!fs.existsSync(destFileDir)) {
        fs.mkdirSync(destFileDir, { recursive: true });
      }
      fs.copyFileSync(sf.full, destFile);
      synced = true;
    }
  }

  return synced;
}

export function syncCoreSkills(appRoot: string): void {
  const srcRoot = resolveSkillsSourceDir(appRoot);
  if (!srcRoot) {
    if (isRunningInDocker()) {
      console.warn(
        "[bootstrap] Skills source directory not found inside Docker — " +
          "COPY .agents/skills into the image instead of relying on a host " +
          "skills directory; skipping sync."
      );
    } else {
      console.log("[bootstrap] Skills source directory not found, skipping sync.");
    }
    return;
  }

  const destRoot = getHermesSkillsDir();
  if (!fs.existsSync(destRoot)) {
    fs.mkdirSync(destRoot, { recursive: true });
  }

  let totalSynced = 0;
  for (const skill of CORE_SKILLS) {
    const srcSkill = path.join(srcRoot, skill);
    const destSkill = path.join(destRoot, skill);
    if (syncOneSkill(srcSkill, destSkill)) {
      totalSynced++;
    }
  }

  if (totalSynced > 0) {
    console.log(
      `[bootstrap] Synced ${totalSynced} skill(s) to ${destRoot}`
    );
  }
}

// ─── 3. Auto-start Gemini Web bridge if already logged in ───────────

function getGeminiProfileDir(): string {
  // Cross-platform, same rule as getHermesSkillsDir: Docker/Linux must
  // NOT resolve to a Windows path. Windows keeps
  // %LOCALAPPDATA%\DeskRPG\gemini-profile; Linux/macOS use the XDG config
  // dir (~/.config/DeskRPG/gemini-profile when $XDG_CONFIG_HOME is unset).
  if (process.platform === "win32") {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "DeskRPG", "gemini-profile");
  }
  const configHome =
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "DeskRPG", "gemini-profile");
}

/**
 * Heuristic: a profile directory with cookies or login state is "warm"
 * (the user has logged in before). We check if Chrome's Default profile exists.
 */
function isGeminiProfileWarm(): boolean {
  const profileDir = getGeminiProfileDir();
  // A Chrome profile that's been used will have a "Default" folder with files
  const defaultProfile = path.join(profileDir, "Default");
  const localState = path.join(profileDir, "Local State");
  return fs.existsSync(defaultProfile) || fs.existsSync(localState);
}

export async function autoStartGeminiBridgeIfWarm(): Promise<void> {
  if (!isGeminiProfileWarm()) {
    console.log("[bootstrap] Gemini profile not yet set up, skipping auto-start.");
    return;
  }

  try {
    // Dynamic import to avoid circular dependency — this module is in src/server/
    const bridge = await import("./gemini-web-bridge");
    const status = await bridge.ensureBackgroundBridge();
    console.log(`[bootstrap] Gemini bridge status: ${status.status}`);
  } catch (err) {
    console.warn("[bootstrap] Could not auto-start Gemini bridge:", err);
  }
}

// ─── 4. Full bootstrap runner ───────────────────────────────────────

export async function runBootstrap(appRoot: string): Promise<void> {
  console.log("[bootstrap] Starting DeskRPG auto-bootstrap...");

  // Step 1: Default config
  ensureDefaultRoutingConfig(appRoot);

  // Step 2: Sync skills
  syncCoreSkills(appRoot);

  // Step 3: Gemini bridge auto-start
  await autoStartGeminiBridgeIfWarm();

  console.log("[bootstrap] Auto-bootstrap complete.");
}
