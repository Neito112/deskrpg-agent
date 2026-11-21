import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// @ts-expect-error js-yaml does not have type declarations installed
import yaml from "js-yaml";
import Database from "better-sqlite3";
import { NextRequest, NextResponse } from "next/server";
import { restartHermesGateway } from "@/lib/hermes/local-manager";

function getHermesHome(): string {
  return (
    process.env.HERMES_HOME ||
    path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "hermes")
  );
}

const PROVIDER_INFO: Record<
  string,
  { name: string; envKey: string; keyUrl?: string; defaultBaseUrl?: string; models: string[] }
> = {
  nvidia: {
    name: "NVIDIA NIM",
    envKey: "NVIDIA_API_KEY",
    keyUrl: "https://build.nvidia.com",
    defaultBaseUrl: "https://integrate.api.nvidia.com/v1",
    models: [
      "z-ai/glm-5.3-flash",
      "meta/llama-3.3-70b-instruct",
      "mistralai/mistral-large-2-instruct",
      "nvidia/nemotron-4-340b-instruct",
      "deepseek-ai/deepseek-r1",
    ],
  },
  openai: {
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    keyUrl: "https://platform.openai.com/api-keys",
    models: ["gpt-4o", "gpt-4o-mini", "o3-mini", "gpt-4-turbo"],
  },
  openrouter: {
    name: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    keyUrl: "https://openrouter.ai/keys",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    models: [
      "deepseek/deepseek-chat",
      "deepseek/deepseek-r1",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.5-flash",
      "meta-llama/llama-3.3-70b-instruct",
    ],
  },
  anthropic: {
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    keyUrl: "https://console.anthropic.com/settings/keys",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
  },
  gemini: {
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    keyUrl: "https://aistudio.google.com/app/apikey",
    models: ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
  groq: {
    name: "Groq",
    envKey: "GROQ_API_KEY",
    keyUrl: "https://console.groq.com/keys",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  },
  deepseek: {
    name: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    keyUrl: "https://platform.deepseek.com/api_keys",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  custom: {
    name: "Tùy chỉnh / Ollama",
    envKey: "CUSTOM_API_KEY",
    defaultBaseUrl: "http://localhost:11434/v1",
    models: ["qwen2.5-coder:7b", "llama3.3:latest", "mistral:latest"],
  },
};

const KNOWN_PROVIDERS: Record<string, { providerId: string; name: string }> = {
  NVIDIA_API_KEY: { providerId: "nvidia", name: "NVIDIA NIM" },
  OPENROUTER_API_KEY: { providerId: "openrouter", name: "OpenRouter" },
  OPENAI_API_KEY: { providerId: "openai", name: "OpenAI" },
  GEMINI_API_KEY: { providerId: "gemini", name: "Google Gemini" },
  GOOGLE_API_KEY: { providerId: "gemini", name: "Google AI Studio" },
  ANTHROPIC_API_KEY: { providerId: "anthropic", name: "Anthropic" },
  DEEPSEEK_API_KEY: { providerId: "deepseek", name: "DeepSeek" },
  GROQ_API_KEY: { providerId: "groq", name: "Groq" },
  FIREWORKS_API_KEY: { providerId: "fireworks", name: "Fireworks AI" },
  MISTRAL_API_KEY: { providerId: "mistral", name: "Mistral AI" },
  TOGETHER_API_KEY: { providerId: "together", name: "Together AI" },
  XAI_API_KEY: { providerId: "xai", name: "xAI (Grok)" },
  PERPLEXITY_API_KEY: { providerId: "perplexity", name: "Perplexity" },
  COHERE_API_KEY: { providerId: "cohere", name: "Cohere" },
  NOVITA_API_KEY: { providerId: "novita", name: "NovitaAI" },
  OLLAMA_API_KEY: { providerId: "ollama", name: "Ollama Cloud" },
  GLM_API_KEY: { providerId: "glm", name: "Zhipu AI (GLM)" },
  ZHIPU_API_KEY: { providerId: "glm", name: "Zhipu AI (GLM)" },
  KIMI_API_KEY: { providerId: "kimi", name: "Moonshot / Kimi" },
  MOONSHOT_API_KEY: { providerId: "kimi", name: "Moonshot / Kimi" },
  CUSTOM_API_KEY: { providerId: "custom", name: "Tùy chỉnh / Ollama" },
};

function maskKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••••••";
  if (trimmed.length <= 12) {
    return `${trimmed.slice(0, 3)}...${trimmed.slice(-3)}`;
  }
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function upsertEnvKey(envContent: string, key: string, value: string): string {
  const regex = new RegExp(`^(?:#\\s*)?${key}=.*$`, "m");
  if (regex.test(envContent)) {
    return envContent.replace(regex, `${key}=${value}`);
  }
  return `${envContent.trimEnd()}\n${key}=${value}\n`;
}

function hasEnvKey(envContent: string, key: string): boolean {
  const regex = new RegExp(`^${key}=([^\\s#]+)`, "m");
  return regex.test(envContent);
}

export async function GET() {
  const hermesHome = getHermesHome();
  const configPath = path.join(hermesHome, "config.yaml");
  const envPath = path.join(hermesHome, ".env");
  const authPath = path.join(hermesHome, "auth.json");

  let currentModel = "";
  let currentProvider = "nvidia";
  let currentBaseUrl = "";
  let hasKey = false;

  if (fs.existsSync(configPath)) {
    try {
      const doc = yaml.load(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
      const modelConfig = (doc?.model as Record<string, unknown>) || {};
      currentModel = String(modelConfig.default || "");
      currentProvider = String(modelConfig.provider || "nvidia");
      currentBaseUrl = String(modelConfig.base_url || "");
    } catch (e) {
      console.warn("[model-config] Failed to read config.yaml:", e);
    }
  }

  const keyMap = new Map<string, { providerId: string; envKey: string; name: string; maskedKey: string }>();

  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, "utf8");
      const providerMeta = PROVIDER_INFO[currentProvider];
      const envKey = providerMeta?.envKey || `${currentProvider.toUpperCase()}_API_KEY`;
      hasKey = hasEnvKey(envContent, envKey);

      // Parse all saved API keys in .env
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;
        const match = trimmedLine.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
        if (!match) continue;

        const k = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1).trim();
        }

        if (!val || val === "your_api_key_here" || val.includes("_key_here")) continue;
        if (k === "API_SERVER_KEY" || k === "HERMES_BIN") continue;

        if (KNOWN_PROVIDERS[k]) {
          const { providerId, name } = KNOWN_PROVIDERS[k];
          keyMap.set(k, {
            providerId,
            envKey: k,
            name,
            maskedKey: maskKey(val),
          });
        } else if (k.endsWith("_API_KEY")) {
          const base = k.replace(/_API_KEY$/, "");
          const providerId = base.toLowerCase();
          const name = base.replace(/_/g, " ");
          keyMap.set(k, {
            providerId,
            envKey: k,
            name,
            maskedKey: maskKey(val),
          });
        }
      }
    } catch (e) {
      console.warn("[model-config] Failed to read .env:", e);
    }
  }

  // Also check auth.json for any stored keys/providers not in .env
  if (fs.existsSync(authPath)) {
    try {
      const authData = JSON.parse(fs.readFileSync(authPath, "utf8")) as Record<string, unknown>;
      if (authData && typeof authData === "object" && authData.providers && typeof authData.providers === "object") {
        const providersObj = authData.providers as Record<string, unknown>;
        for (const [pId, pVal] of Object.entries(providersObj)) {
          if (Array.isArray(pVal)) {
            for (const item of pVal) {
              if (!item || typeof item !== "object") continue;
              const itemObj = item as Record<string, unknown>;
              const envKey = itemObj.label
                ? String(itemObj.label)
                : typeof itemObj.source === "string" && itemObj.source.startsWith("env:")
                ? itemObj.source.slice(4)
                : `${pId.toUpperCase()}_API_KEY`;

              if (!keyMap.has(envKey)) {
                const rawKey = itemObj.api_key || itemObj.apiKey || itemObj.key;
                const meta = PROVIDER_INFO[pId] || KNOWN_PROVIDERS[envKey];
                const name = meta?.name || pId.toUpperCase();
                const maskedKey = rawKey ? maskKey(String(rawKey)) : String(itemObj.secret_fingerprint || "••••••••");
                keyMap.set(envKey, {
                  providerId: pId,
                  envKey,
                  name,
                  maskedKey,
                });
              }
            }
          }
        }
      }
    } catch (authErr) {
      console.warn("[model-config] Failed to read auth.json:", authErr);
    }
  }

  const providerMeta = PROVIDER_INFO[currentProvider];
  const currentEnvKey = providerMeta?.envKey || `${currentProvider.toUpperCase()}_API_KEY`;
  if (keyMap.has(currentEnvKey)) {
    hasKey = true;
  }

  const providers = Object.entries(PROVIDER_INFO).map(([id, meta]) => ({
    id,
    name: meta.name,
    envKey: meta.envKey,
    keyUrl: meta.keyUrl,
    defaultBaseUrl: meta.defaultBaseUrl,
    models: meta.models,
  }));

  const savedKeys = Array.from(keyMap.values());

  return NextResponse.json({
    ok: true,
    current: {
      model: currentModel,
      provider: currentProvider,
      baseUrl: currentBaseUrl,
      hasKey,
    },
    providers,
    savedKeys,
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let envKey = searchParams.get("envKey")?.trim() || "";
    let providerId = searchParams.get("providerId")?.trim() || "";

    if (!envKey && !providerId) {
      try {
        const body = await req.json();
        if (body && typeof body === "object") {
          envKey = String(body.envKey || "").trim();
          providerId = String(body.providerId || "").trim();
        }
      } catch {
        // Body might be empty
      }
    }

    if (!envKey && !providerId) {
      return NextResponse.json(
        { ok: false, error: "Vui lòng cung cấp envKey hoặc providerId để xóa" },
        { status: 400 }
      );
    }

    if (!providerId && envKey) {
      const match = KNOWN_PROVIDERS[envKey];
      providerId = match?.providerId || envKey.replace(/_API_KEY$/, "").toLowerCase();
    }
    if (!envKey && providerId) {
      const meta = PROVIDER_INFO[providerId];
      envKey = meta?.envKey || `${providerId.toUpperCase()}_API_KEY`;
    }

    const hermesHome = getHermesHome();
    const envPath = path.join(hermesHome, ".env");
    const authPath = path.join(hermesHome, "auth.json");

    // 1. Remove line from .env
    if (fs.existsSync(envPath) && envKey) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const lines = envContent.split(/\r?\n/);
      const filteredLines = lines.filter((line) => {
        const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=/);
        if (match && match[1] === envKey) {
          return false;
        }
        return true;
      });
      fs.writeFileSync(envPath, filteredLines.join("\n"), "utf8");
    }

    // 2. Clean up entry in auth.json if present
    if (fs.existsSync(authPath)) {
      try {
        const authData = JSON.parse(fs.readFileSync(authPath, "utf8")) as Record<string, unknown>;
        let changed = false;
        if (authData && typeof authData === "object" && authData.providers && typeof authData.providers === "object") {
          const providersObj = authData.providers as Record<string, unknown>;
          if (providerId && providersObj[providerId]) {
            delete providersObj[providerId];
            changed = true;
          }
          const lowerPid = providerId ? providerId.toLowerCase() : "";
          if (lowerPid && providersObj[lowerPid]) {
            delete providersObj[lowerPid];
            changed = true;
          }
          if (envKey) {
            for (const [pKey, pVal] of Object.entries(providersObj)) {
              if (Array.isArray(pVal)) {
                const filtered = pVal.filter((item: Record<string, unknown>) => {
                  return item?.label !== envKey && item?.source !== `env:${envKey}`;
                });
                if (filtered.length !== pVal.length) {
                  if (filtered.length === 0) {
                    delete providersObj[pKey];
                  } else {
                    providersObj[pKey] = filtered;
                  }
                  changed = true;
                }
              }
            }
          }
        }
        if (changed) {
          fs.writeFileSync(authPath, JSON.stringify(authData, null, 2), "utf8");
        }
      } catch (authErr) {
        console.warn("[model-config] auth.json cleanup error:", authErr);
      }
    }

    // 3. Trigger Hermes Gateway daemon restart in background so it picks up the change
    void restartHermesGateway(8642).catch((err) => {
      console.warn("[model-config] Hermes restart error on DELETE:", err);
    });

    return NextResponse.json({
      ok: true,
      message: "Đã xóa API Key thành công",
    });
  } catch (err) {
    console.error("[model-config] DELETE error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Lỗi khi xóa API Key" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, model, apiKey, baseUrl } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ ok: false, error: "Vui lòng chọn hoặc nhập nhà cung cấp (Provider)" }, { status: 400 });
    }
    if (!model || typeof model !== "string") {
      return NextResponse.json({ ok: false, error: "Vui lòng nhập tên Model AI" }, { status: 400 });
    }

    const hermesHome = getHermesHome();
    const configPath = path.join(hermesHome, "config.yaml");
    const envPath = path.join(hermesHome, ".env");

    // 1. Update config.yaml
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf8");
      const doc = (yaml.load(content) as Record<string, unknown>) || {};
      const modelObj = ((doc.model as Record<string, unknown>) || {}) as Record<string, unknown>;
      modelObj.default = model.trim();
      modelObj.provider = provider.trim();
      if (baseUrl && typeof baseUrl === "string" && baseUrl.trim()) {
        modelObj.base_url = baseUrl.trim();
      } else if (modelObj.base_url && provider !== "nvidia" && provider !== "deepseek") {
        delete modelObj.base_url;
      }
      modelObj.api_mode = "chat_completions";
      doc.model = modelObj;
      fs.writeFileSync(configPath, yaml.dump(doc, { lineWidth: -1 }), "utf8");
    }

    // 2. Update .env with API key if provided
    if (apiKey && typeof apiKey === "string" && apiKey.trim()) {
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
      }
      const providerMeta = PROVIDER_INFO[provider];
      const envKey = providerMeta?.envKey || `${provider.toUpperCase()}_API_KEY`;
      envContent = upsertEnvKey(envContent, envKey, apiKey.trim());
      fs.writeFileSync(envPath, envContent, "utf8");
    }

    // 3. Update active sessions in Hermes state.db to use new model immediately
    const stateDbPath = path.join(hermesHome, "state.db");
    if (fs.existsSync(stateDbPath)) {
      try {
        const sdb = new Database(stateDbPath);
        sdb.prepare("UPDATE sessions SET model = ? WHERE model IS NOT NULL").run(model.trim());
        sdb.close();
      } catch (dbErr) {
        console.warn("[model-config] state.db update sessions error:", dbErr);
      }
    }

    // 4. Trigger Hermes Gateway daemon restart in background
    void restartHermesGateway(8642).catch((err) => {
      console.warn("[model-config] Hermes restart error:", err);
    });

    return NextResponse.json({
      ok: true,
      message: `Đã lưu cấu hình Model "${model}" (${provider}) sang Hermes thành công! Máy chủ AI đang khởi động lại với cấu hình mới.`,
    });
  } catch (err) {
    console.error("[model-config] POST error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Lỗi khi lưu cấu hình model sang Hermes" },
      { status: 500 }
    );
  }
}
