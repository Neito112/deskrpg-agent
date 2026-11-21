"use client";
import React, { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import {
  GEMINI_GUIDE_MODELS,
  AGY_EXECUTOR_MODELS,
  type GeminiGuideModel,
  type AgyExecutorModel,
  type CliRoutingConfig,
} from "@/lib/cli-routing-config";
import { Cpu, Globe, Terminal, CheckCircle2, AlertCircle, RefreshCw, Save, LogIn } from "lucide-react";

export default function CliRoutingSettings() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [geminiMode, setGeminiMode] = useState<"auto" | "manual">("auto");
  const [geminiManualModel, setGeminiManualModel] = useState<GeminiGuideModel>("thinking");
  const [geminiCdpUrl, setGeminiCdpUrl] = useState("http://127.0.0.1:9222");

  const [agyMode, setAgyMode] = useState<"auto" | "manual">("auto");
  const [agyManualModel, setAgyManualModel] = useState<AgyExecutorModel>("gemini-3.8-flash-high");

  const [bridgeStatus, setBridgeStatus] = useState<"connected" | "needs_login" | "not_started">("not_started");
  const [checkingBridge, setCheckingBridge] = useState(false);
  const [startingLogin, setStartingLogin] = useState(false);

  const checkBridgeStatus = async () => {
    setCheckingBridge(true);
    try {
      const res = await fetch("/api/settings/gemini-bridge");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.bridge) {
          setBridgeStatus(data.bridge.status);
        }
      }
    } catch {
      // ignore network errors
    } finally {
      setCheckingBridge(false);
    }
  };

  const handleStartLogin = async () => {
    setStartingLogin(true);
    try {
      const res = await fetch("/api/settings/gemini-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.bridge) {
          setBridgeStatus(data.bridge.status);
        }
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        checkBridgeStatus();
        setStartingLogin(false);
      }, 3000);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function fetchConfig() {
      try {
        const res = await fetch("/api/settings/cli-routing");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.config && mounted) {
            const cfg = data.config as CliRoutingConfig;
            setGeminiMode(cfg.geminiGuide.mode);
            setGeminiManualModel(cfg.geminiGuide.manualModel);
            setGeminiCdpUrl(cfg.geminiGuide.cdpUrl || "http://127.0.0.1:9222");
            setAgyMode(cfg.agyExecutor.mode);
            setAgyManualModel(cfg.agyExecutor.manualModel);
          }
        }
      } catch {
        // ignore load error, keep defaults
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchConfig();
    checkBridgeStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/cli-routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiGuide: {
            mode: geminiMode,
            manualModel: geminiManualModel,
            cdpUrl: geminiCdpUrl.trim() || "http://127.0.0.1:9222",
          },
          agyExecutor: {
            mode: agyMode,
            manualModel: agyManualModel,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Không thể lưu cấu hình");
      }
      setMessage({ type: "success", text: t("settings.routing.saved") });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu cấu hình",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-center text-text-muted text-sm flex items-center justify-center gap-2">
        <RefreshCw size={14} className="animate-spin" />
        <span>Đang tải cấu hình điều phối model...</span>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-border space-y-5">
      <div className="flex items-center gap-2">
        <Cpu size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-text uppercase tracking-wider">
          {t("settings.routing.title")}
        </h3>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Gemini Guide Section */}
        <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Globe size={15} className="text-info" />
              {t("settings.routing.geminiTitle")}
            </span>
            <span className="text-xs text-text-muted">{t("settings.routing.geminiDesc")}</span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">
              {t("settings.routing.mode")}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGeminiMode("auto")}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-colors ${
                  geminiMode === "auto"
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-surface border-border text-text-muted hover:bg-surface-raised"
                }`}
              >
                {t("settings.routing.modeAuto")}
              </button>
              <button
                type="button"
                onClick={() => setGeminiMode("manual")}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-colors ${
                  geminiMode === "manual"
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-surface border-border text-text-muted hover:bg-surface-raised"
                }`}
              >
                {t("settings.routing.modeManual")}
              </button>
            </div>
          </div>

          {geminiMode === "manual" && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-medium text-text-secondary">
                {t("settings.routing.model")}
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {GEMINI_GUIDE_MODELS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setGeminiManualModel(m)}
                    className={`py-1.5 px-2 rounded text-xs font-medium border text-center transition-colors capitalize ${
                      geminiManualModel === m
                        ? "bg-info/20 border-info text-info font-bold"
                        : "bg-surface border-border text-text-muted hover:bg-surface-raised"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gemini Web Bridge Status & 1-Click Login */}
          <div className="pt-2 border-t border-border/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">
                {t("settings.routing.bridgeTitle")}
              </span>
              <div className="flex items-center gap-1.5">
                {bridgeStatus === "connected" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-success/15 text-success border border-success/30">
                    <CheckCircle2 size={11} />
                    {t("settings.routing.bridgeStatusConnected")}
                  </span>
                ) : bridgeStatus === "needs_login" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning/15 text-warning border border-warning/30">
                    <AlertCircle size={11} />
                    {t("settings.routing.bridgeStatusNeedsLogin")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface text-text-muted border border-border">
                    {t("settings.routing.bridgeStatusNotStarted")}
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed">
              {t("settings.routing.bridgeBrowserNote")}
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleStartLogin}
                disabled={startingLogin}
                className="py-1.5 px-3 rounded text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {startingLogin ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>{t("settings.routing.bridgeStatusStarting")}</span>
                  </>
                ) : (
                  <>
                    <LogIn size={12} />
                    <span>{t("settings.routing.bridgeLoginBtn")}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={checkBridgeStatus}
                disabled={checkingBridge}
                className="py-1.5 px-3 rounded text-xs font-medium bg-surface hover:bg-surface-raised text-text-secondary border border-border transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={12} className={checkingBridge ? "animate-spin" : ""} />
                <span>{t("settings.routing.bridgeCheckBtn")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* AGY Executor Section */}
        <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Terminal size={15} className="text-warning" />
              {t("settings.routing.agyTitle")}
            </span>
            <span className="text-xs text-text-muted">{t("settings.routing.agyDesc")}</span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">
              {t("settings.routing.mode")}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAgyMode("auto")}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-colors ${
                  agyMode === "auto"
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-surface border-border text-text-muted hover:bg-surface-raised"
                }`}
              >
                {t("settings.routing.modeAuto")}
              </button>
              <button
                type="button"
                onClick={() => setAgyMode("manual")}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold border transition-colors ${
                  agyMode === "manual"
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-surface border-border text-text-muted hover:bg-surface-raised"
                }`}
              >
                {t("settings.routing.modeManual")}
              </button>
            </div>
          </div>

          {agyMode === "manual" && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-medium text-text-secondary">
                {t("settings.routing.model")}
              </label>
              <select
                value={agyManualModel}
                onChange={(e) => setAgyManualModel(e.target.value as AgyExecutorModel)}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-text text-xs focus:outline-none focus:border-primary-light font-mono"
              >
                {AGY_EXECUTOR_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs border flex items-start gap-2 ${
              message.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-danger/10 border-danger/30 text-danger"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-surface-raised hover:bg-border border border-border text-text rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              <span>Đang lưu cấu hình...</span>
            </>
          ) : (
            <>
              <Save size={13} />
              <span>{t("settings.routing.save")}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
