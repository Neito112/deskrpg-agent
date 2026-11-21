import assert from "node:assert/strict";
import test from "node:test";
import { BUNDLED_PLUGINS, recommendPluginsForRole } from "./plugins-catalog";

test("bundled plugins catalog defines all 8 plugins plus 2 core HR agent skills", () => {
  assert.equal(BUNDLED_PLUGINS.length, 10);
  const ids = BUNDLED_PLUGINS.map((p) => p.id);
  assert.ok(ids.includes("omniroute"));
  assert.ok(ids.includes("superpowers"));
  assert.ok(ids.includes("caveman"));
  assert.ok(ids.includes("claude-code-setup"));
  assert.ok(ids.includes("claude-security"));
  assert.ok(ids.includes("zotero"));
  assert.ok(ids.includes("obsidian"));
  assert.ok(ids.includes("browser-tabs"));
  assert.ok(ids.includes("quan-ly-nhan-su"));
  assert.ok(ids.includes("dao-tao-nhan-su"));
});

test("recommendPluginsForRole accurately assigns plugins to roles", () => {
  // Developer
  const devPlugins = recommendPluginsForRole("Frontend Developer", "React, TypeScript, Next.js");
  assert.ok(devPlugins.includes("superpowers"));
  assert.ok(devPlugins.includes("claude-code-setup"));
  assert.ok(devPlugins.includes("claude-security"));
  assert.ok(devPlugins.includes("omniroute"));

  // Researcher
  const researchPlugins = recommendPluginsForRole("Data Analyst & Researcher", "Thu thập dữ liệu và phân tích bài báo");
  assert.ok(researchPlugins.includes("zotero"));
  assert.ok(researchPlugins.includes("obsidian"));
  assert.ok(researchPlugins.includes("browser-tabs"));
  assert.ok(researchPlugins.includes("omniroute"));

  // Content writer
  const writerPlugins = recommendPluginsForRole("Content Creator", "Viết bài chuẩn SEO và marketing");
  assert.ok(writerPlugins.includes("obsidian"));
  assert.ok(writerPlugins.includes("browser-tabs"));
  assert.ok(writerPlugins.includes("caveman"));

  // HR Recruiter
  const hrPlugins = recommendPluginsForRole("Chuyên viên Tuyển dụng Nhân sự", "Sàng lọc hồ sơ ứng viên nhanh chóng");
  assert.ok(hrPlugins.includes("caveman"));
  assert.ok(hrPlugins.includes("obsidian"));
  assert.ok(hrPlugins.includes("browser-tabs"));
  assert.ok(hrPlugins.includes("omniroute"));
});
