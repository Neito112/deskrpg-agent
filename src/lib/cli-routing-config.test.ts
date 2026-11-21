import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_CLI_ROUTING_CONFIG,
  GEMINI_GUIDE_MODELS,
  AGY_EXECUTOR_MODELS,
  sanitizeCliRoutingConfig,
} from "./cli-routing-config";
import {
  loadCliRoutingConfig,
  saveCliRoutingConfig,
} from "../server/cli-routing-store";

test("returns default configuration on missing or invalid input", () => {
  assert.deepEqual(sanitizeCliRoutingConfig(null), DEFAULT_CLI_ROUTING_CONFIG);
  assert.deepEqual(sanitizeCliRoutingConfig({}), DEFAULT_CLI_ROUTING_CONFIG);
  assert.deepEqual(
    sanitizeCliRoutingConfig({
      geminiGuide: { mode: "invalid", manualModel: "unknown" },
      agyExecutor: { mode: "invalid", manualModel: "unknown" },
    }),
    DEFAULT_CLI_ROUTING_CONFIG
  );
});

test("preserves valid manual models and modes", () => {
  const custom = {
    geminiGuide: {
      mode: "manual" as const,
      manualModel: "fast" as const,
      cdpUrl: "http://localhost:9222",
    },
    agyExecutor: {
      mode: "manual" as const,
      manualModel: "claude-sonnet-4-6" as const,
    },
  };

  const sanitized = sanitizeCliRoutingConfig(custom);
  assert.equal(sanitized.geminiGuide.mode, "manual");
  assert.equal(sanitized.geminiGuide.manualModel, "fast");
  assert.equal(sanitized.geminiGuide.cdpUrl, "http://localhost:9222");
  assert.equal(sanitized.agyExecutor.mode, "manual");
  assert.equal(sanitized.agyExecutor.manualModel, "claude-sonnet-4-6");
});

test("loads and saves configuration to disk", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deskrpg-routing-test-"));
  const tmpFile = path.join(tmpDir, "cli-routing-config.json");

  try {
    // 1. Initial load initializes default file
    const initial = loadCliRoutingConfig(tmpFile);
    assert.deepEqual(initial, DEFAULT_CLI_ROUTING_CONFIG);
    assert.ok(fs.existsSync(tmpFile));

    // 2. Save partial updates
    const updated = saveCliRoutingConfig(
      {
        geminiGuide: { mode: "manual", manualModel: "pro" },
        agyExecutor: { manualModel: "gpt-oss-120b-medium" },
      },
      tmpFile
    );

    assert.equal(updated.geminiGuide.mode, "manual");
    assert.equal(updated.geminiGuide.manualModel, "pro");
    assert.equal(updated.geminiGuide.cdpUrl, DEFAULT_CLI_ROUTING_CONFIG.geminiGuide.cdpUrl);
    assert.equal(updated.agyExecutor.mode, "auto");
    assert.equal(updated.agyExecutor.manualModel, "gpt-oss-120b-medium");

    // 3. Reload from disk
    const reloaded = loadCliRoutingConfig(tmpFile);
    assert.deepEqual(reloaded, updated);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("model lists match verified models", () => {
  assert.ok(GEMINI_GUIDE_MODELS.includes("thinking"));
  assert.ok(GEMINI_GUIDE_MODELS.includes("pro"));
  assert.ok(GEMINI_GUIDE_MODELS.includes("fast"));
  assert.ok(GEMINI_GUIDE_MODELS.includes("lite"));

  assert.ok(AGY_EXECUTOR_MODELS.includes("gemini-3.8-flash-low"));
  assert.ok(AGY_EXECUTOR_MODELS.includes("gemini-3.8-flash-medium"));
  assert.ok(AGY_EXECUTOR_MODELS.includes("gemini-3.8-flash-high"));
  assert.ok(AGY_EXECUTOR_MODELS.includes("claude-sonnet-4-6"));
  assert.ok(AGY_EXECUTOR_MODELS.includes("claude-opus-4-6-thinking"));
  assert.ok(AGY_EXECUTOR_MODELS.includes("gpt-oss-120b-medium"));
});
