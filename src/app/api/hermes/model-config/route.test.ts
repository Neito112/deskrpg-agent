import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { describe, beforeEach, afterEach } from "node:test";
import { NextRequest } from "next/server";

// Import route handlers
import { GET, DELETE } from "./route";

describe("Hermes model-config API - saved API Keys and deletion", () => {
  let tempHermesDir: string;
  const originalEnvHermesHome = process.env.HERMES_HOME;

  beforeEach(() => {
    tempHermesDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-test-"));
    process.env.HERMES_HOME = tempHermesDir;
  });

  afterEach(() => {
    process.env.HERMES_HOME = originalEnvHermesHome;
    try {
      fs.rmSync(tempHermesDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  test("GET returns savedKeys from .env and auth.json with masked keys", async () => {
    const envContent = [
      "# Comment line",
      "NVIDIA_API_KEY=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",
      "OPENROUTER_API_KEY=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",
      "DEEPSEEK_API_KEY=sk-dseek1234567890abcdef",
      "API_SERVER_KEY=internal-secret-token",
    ].join("\n");
    fs.writeFileSync(path.join(tempHermesDir, ".env"), envContent, "utf8");

    const authContent = JSON.stringify({
      version: 1,
      providers: {
        nvidia: [
          {
            id: "d68164",
            label: "NVIDIA_API_KEY",
            source: "env:NVIDIA_API_KEY",
          },
        ],
        groq: [
          {
            id: "groq123",
            label: "GROQ_API_KEY",
            api_key: "gsk_test1234567890abcdef",
          },
        ],
      },
    });
    fs.writeFileSync(path.join(tempHermesDir, "auth.json"), authContent, "utf8");

    const res = await GET();
    const data = await res.json();

    assert.equal(data.ok, true);
    assert.ok(Array.isArray(data.savedKeys), "savedKeys should be an array");

    // Check savedKeys contains NVIDIA_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY, GROQ_API_KEY
    const keysMap = new Map<string, { providerId: string; envKey: string; name: string; maskedKey: string }>(
      data.savedKeys.map((k: { envKey: string; providerId: string; name: string; maskedKey: string }) => [k.envKey, k])
    );

    assert.ok(keysMap.has("NVIDIA_API_KEY"), "Should have NVIDIA_API_KEY");
    assert.equal(keysMap.get("NVIDIA_API_KEY")?.providerId, "nvidia");
    assert.equal(keysMap.get("NVIDIA_API_KEY")?.name, "NVIDIA NIM");
    assert.match(keysMap.get("NVIDIA_API_KEY")?.maskedKey || "", /^nvapi-\.\.\.[A-Za-z0-9]{4}$/);

    assert.ok(keysMap.has("OPENROUTER_API_KEY"), "Should have OPENROUTER_API_KEY");
    assert.equal(keysMap.get("OPENROUTER_API_KEY")?.providerId, "openrouter");
    assert.match(keysMap.get("OPENROUTER_API_KEY")?.maskedKey || "", /^sk-or-\.\.\.[A-Za-z0-9]{4}$/);

    assert.ok(keysMap.has("DEEPSEEK_API_KEY"), "Should have DEEPSEEK_API_KEY");
    assert.equal(keysMap.get("DEEPSEEK_API_KEY")?.providerId, "deepseek");

    assert.ok(keysMap.has("GROQ_API_KEY"), "Should have GROQ_API_KEY from auth.json");
    assert.equal(keysMap.get("GROQ_API_KEY")?.providerId, "groq");

    // Internal server token should not be treated as a provider API key
    assert.ok(!keysMap.has("API_SERVER_KEY"), "Should not include API_SERVER_KEY");
  });

  test("DELETE removes key line from .env and provider from auth.json", async () => {
    const envContent = [
      "# Comment line",
      "NVIDIA_API_KEY=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",
      "OPENROUTER_API_KEY=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",
    ].join("\n");
    fs.writeFileSync(path.join(tempHermesDir, ".env"), envContent, "utf8");

    const authContent = JSON.stringify({
      version: 1,
      providers: {
        nvidia: [
          {
            id: "d68164",
            label: "NVIDIA_API_KEY",
            source: "env:NVIDIA_API_KEY",
          },
        ],
        openrouter: [
          {
            id: "aff5f3",
            label: "OPENROUTER_API_KEY",
            source: "env:OPENROUTER_API_KEY",
          },
        ],
      },
    });
    fs.writeFileSync(path.join(tempHermesDir, "auth.json"), authContent, "utf8");

    // Delete NVIDIA_API_KEY via DELETE
    const req = new NextRequest("http://localhost:3000/api/hermes/model-config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        envKey: "NVIDIA_API_KEY",
        providerId: "nvidia",
      }),
    });

    const delRes = await DELETE(req);
    const delData = await delRes.json();

    assert.equal(delRes.status, 200);
    assert.equal(delData.ok, true);
    assert.equal(delData.message, "Đã xóa API Key thành công");

    // Verify .env file
    const updatedEnv = fs.readFileSync(path.join(tempHermesDir, ".env"), "utf8");
    assert.ok(!updatedEnv.includes("NVIDIA_API_KEY="), "NVIDIA_API_KEY should be removed from .env");
    assert.ok(updatedEnv.includes("OPENROUTER_API_KEY="), "OPENROUTER_API_KEY should still exist in .env");

    // Verify auth.json file
    const updatedAuth = JSON.parse(fs.readFileSync(path.join(tempHermesDir, "auth.json"), "utf8"));
    assert.equal(updatedAuth.providers.nvidia, undefined, "nvidia provider should be removed from auth.json");
    assert.ok(updatedAuth.providers.openrouter, "openrouter provider should still exist in auth.json");

    // Verify subsequent GET reflects deletion
    const getRes = await GET();
    const getData = await getRes.json();
    const savedKeys = getData.savedKeys as Array<{ envKey: string }>;
    assert.ok(!savedKeys.some((k) => k.envKey === "NVIDIA_API_KEY"), "GET should no longer return NVIDIA_API_KEY");
    assert.ok(savedKeys.some((k) => k.envKey === "OPENROUTER_API_KEY"), "GET should still return OPENROUTER_API_KEY");
  });

  test("DELETE via searchParams query string works", async () => {
    fs.writeFileSync(
      path.join(tempHermesDir, ".env"),
      "ANTHROPIC_API_KEY=sk-ant-api03-abcdef123456\n",
      "utf8"
    );

    const req = new NextRequest(
      "http://localhost:3000/api/hermes/model-config?envKey=ANTHROPIC_API_KEY&providerId=anthropic",
      {
        method: "DELETE",
      }
    );

    const delRes = await DELETE(req);
    const delData = await delRes.json();

    assert.equal(delRes.status, 200);
    assert.equal(delData.ok, true);

    const updatedEnv = fs.readFileSync(path.join(tempHermesDir, ".env"), "utf8");
    assert.ok(!updatedEnv.includes("ANTHROPIC_API_KEY="));
  });

  test("DELETE returns 400 when missing both envKey and providerId", async () => {
    const req = new NextRequest("http://localhost:3000/api/hermes/model-config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await DELETE(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.ok, false);
  });
});
