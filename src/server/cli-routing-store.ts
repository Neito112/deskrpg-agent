import fs from "node:fs";
import path from "node:path";
import {
  type CliRoutingConfig,
  type GeminiGuideConfig,
  type AgyExecutorConfig,
  DEFAULT_CLI_ROUTING_CONFIG,
  sanitizeCliRoutingConfig,
} from "@/lib/cli-routing-config";

export function getDefaultConfigPath(): string {
  return path.join(process.cwd(), "data", "cli-routing-config.json");
}

export function loadCliRoutingConfig(customPath?: string): CliRoutingConfig {
  const filePath = customPath || getDefaultConfigPath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(content);
      return sanitizeCliRoutingConfig(parsed);
    }
  } catch (err) {
    console.warn("[cli-routing-config] Failed to read config, falling back to default:", err);
  }

  // Ensure file exists with default values
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_CLI_ROUTING_CONFIG, null, 2), "utf8");
  } catch {
    // Ignore write failure in read-only environment
  }

  return { ...DEFAULT_CLI_ROUTING_CONFIG };
}

export function saveCliRoutingConfig(
  updates: Partial<{
    geminiGuide: Partial<GeminiGuideConfig>;
    agyExecutor: Partial<AgyExecutorConfig>;
  }>,
  customPath?: string
): CliRoutingConfig {
  const filePath = customPath || getDefaultConfigPath();
  const current = loadCliRoutingConfig(filePath);

  const updated: CliRoutingConfig = {
    geminiGuide: {
      ...current.geminiGuide,
      ...(updates.geminiGuide || {}),
    },
    agyExecutor: {
      ...current.agyExecutor,
      ...(updates.agyExecutor || {}),
    },
  };

  const sanitized = sanitizeCliRoutingConfig(updated);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(sanitized, null, 2), "utf8");
  return sanitized;
}
