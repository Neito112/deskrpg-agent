import assert from "node:assert/strict";
import test from "node:test";
import {
  getProfileDirectory,
  getCdpPort,
  findBrowserExecutable,
  isCdpPortOpen,
  getBridgeStatus,
} from "./gemini-web-bridge";

test("gemini-web-bridge: getProfileDirectory returns valid DeskRPG path", () => {
  const dir = getProfileDirectory();
  assert.ok(dir.includes("DeskRPG"));
  assert.ok(dir.includes("gemini-profile"));
});

test("gemini-web-bridge: getCdpPort returns numeric port", () => {
  const port = getCdpPort();
  assert.equal(typeof port, "number");
  assert.ok(port > 1024 && port < 65535);
});

test("gemini-web-bridge: findBrowserExecutable locates chrome or edge on Windows", () => {
  const browser = findBrowserExecutable();
  if (process.platform === "win32") {
    assert.ok(browser !== null, "Browser executable should be found on standard Windows environment");
    assert.ok(["chrome", "edge"].includes(browser.name));
    assert.ok(browser.path.length > 0);
  }
});

test("gemini-web-bridge: isCdpPortOpen returns false for an unused port", async () => {
  const isOpen = await isCdpPortOpen(59876);
  assert.equal(isOpen, false);
});

test("gemini-web-bridge: getBridgeStatus returns valid response structure", async () => {
  const status = await getBridgeStatus();
  assert.ok(["not_started", "needs_login", "connected"].includes(status.status));
  assert.equal(typeof status.port, "number");
  assert.ok(status.profileDir.includes("gemini-profile"));
});
