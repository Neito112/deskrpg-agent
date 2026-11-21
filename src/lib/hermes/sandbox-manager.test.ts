import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  addProfileReferenceFile,
  buildSandboxSoulSection,
  deleteProfileReferenceFile,
  getDefaultWorkspaceDir,
  getProfileSandboxConfig,
  saveProfileSandboxConfig,
  updateSoulWithSandbox,
} from "./sandbox-manager";

test("getDefaultWorkspaceDir constructs safe workspace path", () => {
  const ws = getDefaultWorkspaceDir("thiet_ke_noi_that");
  assert.ok(ws.includes("thiet_ke_noi_that"));
  assert.ok(ws.includes("workspace"));
});

test("buildSandboxSoulSection formats directory and naming conventions", () => {
  const section = buildSandboxSoulSection("C:\\Outputs\\3D", "[Project]_[Date].[ext]", ["mau.pdf"]);
  assert.ok(section.includes("C:\\Outputs\\3D"));
  assert.ok(section.includes("[Project]_[Date].[ext]"));
  assert.ok(section.includes("mau.pdf"));
});

test("updateSoulWithSandbox updates existing section cleanly", () => {
  const initial = `# Test Bot\n\nChuyên môn lập trình\n`;
  const updated1 = updateSoulWithSandbox(initial, "D:\\Folder1", "Rule1", []);
  assert.ok(updated1.includes("D:\\Folder1"));

  const updated2 = updateSoulWithSandbox(updated1, "D:\\Folder2", "Rule2", ["sample.txt"]);
  assert.ok(updated2.includes("D:\\Folder2"));
  assert.ok(!updated2.includes("D:\\Folder1"));
  assert.ok(updated2.includes("sample.txt"));
});

test("saveProfileSandboxConfig and getProfileSandboxConfig round-trip", () => {
  const origHermesHome = process.env.HERMES_HOME;
  const testHermesHome = path.join(os.tmpdir(), "deskrpg_test_hermes_" + Date.now());
  fs.mkdirSync(testHermesHome, { recursive: true });
  process.env.HERMES_HOME = testHermesHome;

  try {
    const testProfile = "mock_profile_" + Date.now();
    const testDir = path.join(os.tmpdir(), "deskrpg_test_sandbox_" + Date.now());

    const saved = saveProfileSandboxConfig(testProfile, {
      sandboxDir: testDir,
      fileNamingConvention: "[Date]_[Name].[ext]",
    });

    assert.equal(saved.sandboxDir, testDir);
    assert.equal(saved.fileNamingConvention, "[Date]_[Name].[ext]");
    assert.ok(fs.existsSync(testDir));

    const readBack = getProfileSandboxConfig(testProfile);
    assert.equal(readBack.sandboxDir, testDir);
    assert.equal(readBack.fileNamingConvention, "[Date]_[Name].[ext]");

    // Test reference file upload and delete
    const dummyBuffer = Buffer.from("hello sample template file", "utf-8");
    const filesAfterAdd = addProfileReferenceFile(testProfile, "template.txt", dummyBuffer);
    assert.equal(filesAfterAdd.length, 1);
    assert.equal(filesAfterAdd[0].name, "template.txt");

    const filesAfterDel = deleteProfileReferenceFile(testProfile, "template.txt");
    assert.equal(filesAfterDel.length, 0);

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  } finally {
    try {
      fs.rmSync(testHermesHome, { recursive: true, force: true });
    } catch {}
    if (origHermesHome) {
      process.env.HERMES_HOME = origHermesHome;
    } else {
      delete process.env.HERMES_HOME;
    }
  }
});
