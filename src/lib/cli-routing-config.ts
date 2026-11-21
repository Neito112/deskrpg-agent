export const GEMINI_GUIDE_MODELS = ["thinking", "pro", "fast", "lite"] as const;
export type GeminiGuideModel = (typeof GEMINI_GUIDE_MODELS)[number];

export const AGY_EXECUTOR_MODELS = [
  "gemini-3.8-flash-low",
  "gemini-3.8-flash-medium",
  "gemini-3.8-flash-high",
  "claude-sonnet-4-6",
  "claude-opus-4-6-thinking",
  "gpt-oss-120b-medium",
] as const;
export type AgyExecutorModel = (typeof AGY_EXECUTOR_MODELS)[number];

export interface GeminiGuideConfig {
  mode: "auto" | "manual";
  manualModel: GeminiGuideModel;
  cdpUrl: string;
}

export interface AgyExecutorConfig {
  mode: "auto" | "manual";
  manualModel: AgyExecutorModel;
}

export interface CliRoutingConfig {
  geminiGuide: GeminiGuideConfig;
  agyExecutor: AgyExecutorConfig;
}

export const DEFAULT_CLI_ROUTING_CONFIG: CliRoutingConfig = {
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

export function isValidGeminiModel(model: unknown): model is GeminiGuideModel {
  return typeof model === "string" && GEMINI_GUIDE_MODELS.includes(model as GeminiGuideModel);
}

export function isValidAgyModel(model: unknown): model is AgyExecutorModel {
  return typeof model === "string" && AGY_EXECUTOR_MODELS.includes(model as AgyExecutorModel);
}

export function sanitizeCliRoutingConfig(raw: unknown): CliRoutingConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_CLI_ROUTING_CONFIG };
  }

  const obj = raw as Record<string, unknown>;
  const gg = (obj.geminiGuide && typeof obj.geminiGuide === "object" ? obj.geminiGuide : {}) as Record<string, unknown>;
  const agy = (obj.agyExecutor && typeof obj.agyExecutor === "object" ? obj.agyExecutor : {}) as Record<string, unknown>;

  const geminiGuide: GeminiGuideConfig = {
    mode: gg.mode === "manual" ? "manual" : "auto",
    manualModel: isValidGeminiModel(gg.manualModel) ? gg.manualModel : DEFAULT_CLI_ROUTING_CONFIG.geminiGuide.manualModel,
    cdpUrl: typeof gg.cdpUrl === "string" && gg.cdpUrl.trim() ? gg.cdpUrl.trim() : DEFAULT_CLI_ROUTING_CONFIG.geminiGuide.cdpUrl,
  };

  const agyExecutor: AgyExecutorConfig = {
    mode: agy.mode === "manual" ? "manual" : "auto",
    manualModel: isValidAgyModel(agy.manualModel) ? agy.manualModel : DEFAULT_CLI_ROUTING_CONFIG.agyExecutor.manualModel,
  };

  return { geminiGuide, agyExecutor };
}
