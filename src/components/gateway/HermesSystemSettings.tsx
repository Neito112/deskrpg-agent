"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  Server,
  Settings2,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

interface ProviderMeta {
  id: string;
  name: string;
  envKey: string;
  keyUrl?: string;
  defaultBaseUrl?: string;
  models: string[];
}

interface SavedApiKey {
  providerId: string;
  envKey: string;
  name: string;
  maskedKey: string;
}

interface HermesSystemSettingsProps {
  gatewayId?: string;
  gatewayName?: string;
  gatewayUrl?: string;
  dashboardUrl?: string | null;
  isOwner?: boolean;
  onTestConnection?: () => void;
  testingConnection?: boolean;
  testStatus?: "idle" | "connected" | "error";
  testError?: string | null;
  onDelete?: () => void;
  deleting?: boolean;
}

export default function HermesSystemSettings({
  gatewayName = "Hermes Gateway",
  gatewayUrl = "http://127.0.0.1:8642",
  dashboardUrl,
  isOwner = true,
  onTestConnection,
  testingConnection = false,
  testStatus = "idle",
  testError = null,
  onDelete,
  deleting = false,
}: HermesSystemSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [savedKeys, setSavedKeys] = useState<SavedApiKey[]>([]);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<SavedApiKey | null>(null);

  const [selectedProvider, setSelectedProvider] = useState("nvidia");
  const [selectedModel, setSelectedModel] = useState("z-ai/glm-5.3-flash");
  const [customModel, setCustomModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [hasExistingKey, setHasExistingKey] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async (isInitial = false) => {
    try {
      const res = await fetch("/api/hermes/model-config");
      const data = await res.json();
      if (!data.ok) return;

      const loadedProviders: ProviderMeta[] = data.providers || [];
      const loadedKeys: SavedApiKey[] = data.savedKeys || [];

      setProviders(loadedProviders);
      setSavedKeys(loadedKeys);

      if (data.current) {
        if (isInitial) {
          const prov = data.current.provider || "nvidia";
          setSelectedProvider(prov);
          setSelectedModel(data.current.model || "z-ai/glm-5.3-flash");
          setBaseUrl(data.current.baseUrl || "");
        }
        setHasExistingKey(!!data.current.hasKey);
      }
    } catch (err) {
      console.warn("[HermesSystemSettings] load error:", err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    void loadConfig(true);
    return () => {
      mounted = false;
    };
  }, []);

  const handleProviderChange = (newProvider: string) => {
    setSelectedProvider(newProvider);
    const meta = providers.find((p) => p.id === newProvider);
    if (meta) {
      if (meta.defaultBaseUrl) {
        setBaseUrl(meta.defaultBaseUrl);
      } else {
        setBaseUrl("");
      }
      if (meta.models && meta.models.length > 0) {
        setSelectedModel(meta.models[0]);
      }
      const hasKeyForProvider = savedKeys.some(
        (k) => k.providerId === newProvider || k.envKey === meta.envKey
      );
      setHasExistingKey(hasKeyForProvider);
    }
  };

  const handleDeleteKey = async (item: SavedApiKey) => {
    setDeletingKey(item.envKey);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/hermes/model-config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          envKey: item.envKey,
          providerId: item.providerId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMessage(data.message || `Đã xóa API Key (${item.envKey}) thành công!`);
        setSavedKeys((prev) => prev.filter((k) => k.envKey !== item.envKey));
        const currentMeta = providers.find((p) => p.id === selectedProvider);
        if (item.envKey === currentMeta?.envKey || item.providerId === selectedProvider) {
          setHasExistingKey(false);
        }
        await loadConfig(false);
      } else {
        setError(data.error || "Không thể xóa API Key");
      }
    } catch {
      setError("Lỗi kết nối khi gửi yêu cầu xóa API Key");
    } finally {
      setDeletingKey(null);
      setConfirmDeleteKey(null);
    }
  };

  const handleSaveModelConfig = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    const finalModel = customModel.trim() || selectedModel.trim();
    if (!finalModel) {
      setError("Vui lòng nhập hoặc chọn tên Model AI");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/hermes/model-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          model: finalModel,
          apiKey: apiKey.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setMessage(data.message || "Đã lưu và áp dụng cấu hình hệ thống Hermes thành công!");
        if (apiKey.trim()) {
          setHasExistingKey(true);
          setApiKey("");
        }
        await loadConfig(false);
      } else {
        setError(data.error || "Không thể lưu cấu hình hệ thống Hermes");
      }
    } catch {
      setError("Lỗi kết nối khi gửi cấu hình tới hệ thống Hermes");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDashboard = async () => {
    setOpeningDashboard(true);
    try {
      const res = await fetch("/api/hermes/dashboard", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.type === "desktop" && data.ok) return;
      const targetUrl = (data.ok && data.url) || dashboardUrl || gatewayUrl;
      if (targetUrl) {
        if (
          typeof window !== "undefined" &&
          (window as unknown as { desktopApp?: { openExternal?: (u: string) => void } }).desktopApp
            ?.openExternal
        ) {
          (
            window as unknown as { desktopApp: { openExternal: (u: string) => void } }
          ).desktopApp.openExternal(targetUrl);
        } else {
          window.open(targetUrl, "_blank");
        }
      }
    } catch {
      if (dashboardUrl) window.open(dashboardUrl, "_blank");
    } finally {
      setOpeningDashboard(false);
    }
  };

  const currentMeta = providers.find((p) => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      {/* 1. Gateway Status Overview Card */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text">{gatewayName}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-text-muted">{gatewayUrl}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenDashboard}
              disabled={openingDashboard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3.5 py-2 text-xs font-semibold text-text hover:bg-surface-raised/80 transition"
              title="Mở giao diện Web của Hermes"
            >
              {openingDashboard ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              <span>Mở Dashboard Hermes</span>
            </button>

            {onTestConnection && (
              <button
                type="button"
                onClick={onTestConnection}
                disabled={testingConnection}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3.5 py-2 text-xs font-semibold text-text hover:bg-surface-raised/80 transition disabled:opacity-60"
              >
                {testingConnection ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Kiểm tra kết nối</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2 text-xs font-semibold text-danger hover:bg-danger/20 transition disabled:opacity-60 cursor-pointer"
                title="Ngắt kết nối và xóa Gateway này"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>{deleting ? "Đang xóa..." : "Ngắt kết nối & Xóa"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Test Result Feedback */}
        {testStatus !== "idle" && (
          <div
            className={`mt-4 rounded-xl border px-4 py-2.5 text-xs font-medium ${
              testStatus === "connected"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-danger/30 bg-danger/10 text-danger"
            }`}
          >
            {testStatus === "connected"
              ? "✓ Kết nối tới Hermes Gateway phản hồi bình thường (200 OK)."
              : `✕ Lỗi kết nối tới Gateway: ${testError || "Không thể phản hồi"}`}
          </div>
        )}
      </section>

      {/* 2. Hermes Core AI Model & Provider Settings */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">Cấu Hình Model AI Hệ Thống Hermes</h2>
              <p className="text-xs text-text-muted">
                Tùy chỉnh nhà cung cấp LLM, Model mặc định và khóa API được nạp vào máy chủ Hermes
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-text-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải cấu hình Hermes...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Notification Messages */}
            {message && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs font-medium text-danger">
                {error}
              </div>
            )}

            {/* Provider Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Nhà cung cấp AI (Provider)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {providers.map((p) => {
                  const isSelected = selectedProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProviderChange(p.id)}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                          : "border-border bg-bg hover:bg-surface-raised text-text"
                      }`}
                    >
                      <span className="text-xs font-bold">{p.name}</span>
                      <span className="mt-0.5 text-[10px] text-text-muted truncate w-full">
                        {p.models[0] || p.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary">
                  Model AI mặc định
                </label>
                <span className="text-[11px] text-text-muted">Chọn từ gợi ý hoặc gõ model tùy ý</span>
              </div>

              {/* Quick Model Chips */}
              {currentMeta && currentMeta.models && currentMeta.models.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {currentMeta.models.map((m) => {
                    const active = selectedModel === m && !customModel;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m);
                          setCustomModel("");
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          active
                            ? "bg-primary text-white"
                            : "bg-surface-raised text-text hover:bg-surface-raised/80 border border-border"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom Model Input */}
              <input
                type="text"
                value={customModel || selectedModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  setSelectedModel(e.target.value);
                }}
                placeholder="VD: z-ai/glm-5.3-flash, gpt-4o, deepseek-chat..."
                className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>

            {/* API Key */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary">
                  API Key ({currentMeta?.envKey || "KEY"})
                </label>
                {currentMeta?.keyUrl && (
                  <a
                    href={currentMeta.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <span>Lấy API Key {currentMeta.name}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    hasExistingKey
                      ? "•••••••••••••••••••••••• (Đã có key, nhập để đổi mới)"
                      : "Dán API Key vào đây..."
                  }
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none pr-28"
                />
                {hasExistingKey && !apiKey && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" /> Đã lưu key
                  </span>
                )}
              </div>
            </div>

            {/* Base URL (Optional) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                API Base URL (Tương thích OpenAI)
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={currentMeta?.defaultBaseUrl || "https://api.example.com/v1"}
                className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none font-mono"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-text-muted">
                Khi lưu, Hermes Gateway sẽ tự khởi động lại ngầm với model mới mà không gián đoạn
                phiên làm việc.
              </p>
              <button
                type="button"
                onClick={handleSaveModelConfig}
                disabled={saving || !isOwner}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-hover disabled:opacity-60 transition"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>{saving ? "Đang áp dụng..." : "Lưu & Áp Dụng"}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Saved API Keys Management */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">Danh Sách API Key Đã Lưu</h2>
              <p className="text-xs text-text-muted">
                Các API Key nhà cung cấp LLM đã lưu trong tệp môi trường của hệ thống Hermes (.env / auth.json)
              </p>
            </div>
          </div>
          <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-semibold text-text-muted">
            {savedKeys.length} khóa đã lưu
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-text-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải danh sách khóa...
          </div>
        ) : savedKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center">
            <Key className="mb-2 h-8 w-8 text-text-muted/40" />
            <p className="text-xs font-semibold text-text">Chưa có API Key nào được lưu</p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Nhập API Key ở phần cấu hình bên trên và nhấn &ldquo;Lưu &amp; Áp Dụng&rdquo; để thêm khóa mới.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-raised font-semibold text-text-secondary">
                  <tr>
                    <th className="px-4 py-3">Nhà cung cấp</th>
                    <th className="px-4 py-3">Biến môi trường (envKey)</th>
                    <th className="px-4 py-3">Khóa (đã làm mờ)</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-bg">
                  {savedKeys.map((item) => (
                    <tr key={item.envKey} className="hover:bg-surface-raised/40 transition">
                      <td className="px-4 py-3 font-semibold text-text">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-text-secondary">
                        <code className="rounded bg-surface-raised px-1.5 py-0.5 text-[11px]">
                          {item.envKey}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-mono text-text-muted">
                        <span className="rounded border border-border bg-surface px-2 py-0.5 text-xs text-text">
                          {item.maskedKey}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey(item)}
                          disabled={!isOwner || deletingKey === item.envKey}
                          title={`Xóa ${item.envKey}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white transition disabled:opacity-50"
                        >
                          {deletingKey === item.envKey ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span>Xóa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      {confirmDeleteKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-danger mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">Xác nhận xóa API Key</h3>
                <p className="text-xs text-text-muted">Bạn có chắc chắn muốn xóa API Key này?</p>
              </div>
            </div>

            <div className="my-4 rounded-xl border border-border bg-bg p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Nhà cung cấp:</span>
                <span className="font-semibold text-text">{confirmDeleteKey.name}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-text-muted">Biến môi trường:</span>
                <span className="font-semibold text-text">{confirmDeleteKey.envKey}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-text-muted">Khóa:</span>
                <span className="font-semibold text-primary">{confirmDeleteKey.maskedKey}</span>
              </div>
            </div>

            <p className="text-xs text-text-muted mb-5">
              Thao tác này sẽ xóa vĩnh viễn khóa khỏi tệp <code className="font-mono text-text">.env</code> và <code className="font-mono text-text">auth.json</code> của máy chủ Hermes.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteKey(null)}
                disabled={deletingKey !== null}
                className="rounded-xl border border-border bg-surface-raised px-4 py-2 text-xs font-semibold text-text hover:bg-surface-raised/80 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteKey(confirmDeleteKey)}
                disabled={deletingKey !== null}
                className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-xs font-semibold text-white shadow hover:bg-danger/90 transition disabled:opacity-60"
              >
                {deletingKey === confirmDeleteKey.envKey ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>{deletingKey === confirmDeleteKey.envKey ? "Đang xóa..." : "Xác nhận xóa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
