import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  ensureDefaultRoutingConfig,
  syncCoreSkills,
  runBootstrap,
} from "./auto-bootstrap";

test("auto-bootstrap: ensureDefaultRoutingConfig creates config file in test dir", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deskrpg-bootstrap-test-"));
  try {
    ensureDefaultRoutingConfig(tmpDir);
    const cfgPath = path.join(tmpDir, "data", "cli-routing-config.json");
    assert.ok(fs.existsSync(cfgPath));

    const content = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    assert.equal(content.geminiGuide.mode, "auto");
    assert.equal(content.agyExecutor.mode, "auto");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("auto-bootstrap: syncCoreSkills runs without crashing when source exists", () => {
  // Pass workspace root
  assert.doesNotThrow(() => {
    syncCoreSkills(process.cwd());
  });
});

test("auto-bootstrap: runBootstrap completes safely", async () => {
  await assert.doesNotReject(async () => {
    await runBootstrap(process.cwd());
  });
});
