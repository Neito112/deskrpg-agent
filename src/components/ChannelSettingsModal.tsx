"use client";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_NPC_MOTION,
  NPC_MOTION_KINDS,
  NPC_SPEED_RANGE,
  RUN_SPEED_THRESHOLD,
  normalizeNpcMotionConfig,
  tilesPerSecond,
  type NpcMotionConfig,
} from "@/lib/npc-motion-config";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { getLocalizedErrorMessage } from "@/lib/i18n/error-codes";
import GatewayStatusCard, { type GatewayStatus } from "@/components/gateway/GatewayStatusCard";
import CliRoutingSettings from "@/components/settings/CliRoutingSettings";
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
} from "lucide-react";

type ChannelSettingsTab = "settings" | "members" | "gateway" | "ai-model";

interface ChannelSettingsModalProps {
  channelId: string;
  channelName: string;
  channelDescription: string | null;
  isPublic: boolean;
  inviteCode: string | null;
  /** The channel's NPC walk speed. The server folds it in and returns it. */
  motionConfig?: NpcMotionConfig;
  initialTab?: ChannelSettingsTab;
  onClose: () => void;
  onUpdated: (data: {
    name?: string;
    description?: string | null;
    isPublic?: boolean;
    motionConfig?: NpcMotionConfig;
    gatewayConfig?: {
      gatewayId?: string | null;
      url?: string | null;
      // The server never returns the token (hard gate 2) — only whether one is saved.
      hasToken?: boolean;
      canEditCredentials?: boolean;
    };
  }) => void;
}

interface Member {
  userId: string;
  nickname: string;
  role: string;
  joinedAt: string;
  isOnline: boolean;
}

interface GatewayConnectionState {
  status: GatewayStatus;
  error?: string | null;
}

interface AccessibleGatewayOption {
  id: string;
  displayName: string | null;
  baseUrl: string;
  canEditCredentials: boolean;
  isOwner: boolean;
  shareRole: string | null;
}

export default function ChannelSettingsModal({
  channelId,
  channelName,
  channelDescription,
  isPublic,
  inviteCode,
  motionConfig,
  initialTab = "settings",
  onClose,
  onUpdated,
}: ChannelSettingsModalProps) {
  const t = useT();
  const [tab, setTab] = useState<ChannelSettingsTab>(initialTab);
  const [name, setName] = useState(channelName);
  const [description, setDescription] = useState(channelDescription || "");
  const [visibility, setVisibility] = useState(isPublic);
  const initialMotion = normalizeNpcMotionConfig(motionConfig);
  const [motion, setMotion] = useState<NpcMotionConfig>(initialMotion);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const [confirmKick, setConfirmKick] = useState<Member | null>(null);

  // AI Gateway state
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  // The server never returns the saved key. Keep the field empty and just indicate "saved".
  const [gatewayHasSavedToken, setGatewayHasSavedToken] = useState(false);
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const [gatewayMode, setGatewayMode] = useState<"resource" | "direct">("direct");
  const [gatewayOptions, setGatewayOptions] = useState<AccessibleGatewayOption[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>("");
  const [gatewayCanEditCredentials, setGatewayCanEditCredentials] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [gatewaySaving, setGatewaySaving] = useState(false);
  const [gatewayTesting, setGatewayTesting] = useState(false);
  const [gatewayConnectionState, setGatewayConnectionState] = useState<GatewayConnectionState>({
    status: "idle",
  });
  const [gatewayNotice, setGatewayNotice] = useState<{ success: boolean; message: string } | null>(
    null,
  );
  const [gatewayError, setGatewayError] = useState("");

  // AI Model & Provider settings
  const [aiProvider, setAiProvider] = useState("nvidia");
  const [aiModel, setAiModel] = useState("z-ai/glm-5.3-flash");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiShowKey, setAiShowKey] = useState(false);
  const [aiCurrentConfig, setAiCurrentConfig] = useState<{
    model: string;
    provider: string;
    baseUrl: string;
    hasKey: boolean;
  } | null>(null);
  const [aiProvidersList, setAiProvidersList] = useState<
    Array<{
      id: string;
      name: string;
      envKey: string;
      keyUrl?: string;
      defaultBaseUrl?: string;
      models: string[];
    }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAiConfig = useCallback(async () => {
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/hermes/model-config");
      const data = await res.json();
      if (data.ok) {
        setAiCurrentConfig(data.current);
        setAiProvidersList(data.providers || []);
        if (data.current.provider) setAiProvider(data.current.provider);
        if (data.current.model) setAiModel(data.current.model);
        if (data.current.baseUrl) setAiBaseUrl(data.current.baseUrl);
      }
    } catch {
      // ignore
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "ai-model") {
      void loadAiConfig();
    }
  }, [tab, loadAiConfig]);

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiModel.trim()) {
      setAiMessage({ type: "error", text: "Vui lòng nhập hoặc chọn tên Model AI" });
      return;
    }
    setAiSaving(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/hermes/model-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel.trim(),
          apiKey: aiApiKey.trim(),
          baseUrl: aiBaseUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Lưu cấu hình thất bại");
      }
      setAiMessage({ type: "success", text: data.message || "Đã lưu cài đặt model sang Hermes thành công!" });
      setAiApiKey("");
      await loadAiConfig();
    } catch (err) {
      setAiMessage({ type: "error", text: err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu" });
    } finally {
      setAiSaving(false);
    }
  };

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError("");
    try {
      const res = await fetch(`/api/channels/${channelId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setMembersError(getLocalizedErrorMessage(t, data, "errors.failedToFetchMembers"));
      }
    } catch {
      setMembersError(t("errors.failedToFetchMembers"));
    }
    setMembersLoading(false);
  }, [channelId, t]);

  const loadGateway = useCallback(async () => {
    setGatewayLoading(true);
    setGatewayError("");
    try {
      const [gatewayRes, optionsRes] = await Promise.all([
        fetch(`/api/channels/${channelId}/gateway`),
        fetch("/api/gateways"),
      ]);

      if (optionsRes.ok) {
        const optionsData = await optionsRes.json().catch(() => ({}));
        setGatewayOptions(Array.isArray(optionsData.gateways) ? optionsData.gateways : []);
      } else {
        setGatewayOptions([]);
      }

      if (!gatewayRes.ok) {
        return;
      }

      const data = await gatewayRes.json();
      const gc = data?.gatewayConfig;
      if (gc) {
        setGatewayHasSavedToken(gc.hasToken === true);
        const nextGatewayId = typeof gc.gatewayId === "string" ? gc.gatewayId : null;
        const currentOption = nextGatewayId
          ? {
              id: nextGatewayId,
              displayName: gc.displayName || gc.url || nextGatewayId,
              baseUrl: gc.url || "",
              canEditCredentials: gc.canEditCredentials !== false,
              isOwner: gc.canEditCredentials !== false,
              shareRole: null,
            }
          : null;
        setGatewayOptions((prev) => {
          if (!currentOption || prev.some((item) => item.id === currentOption.id)) {
            return prev;
          }
          return [currentOption, ...prev];
        });
        setGatewayId(nextGatewayId);
        setSelectedGatewayId(nextGatewayId ?? "");
        setGatewayMode(nextGatewayId ? "resource" : "direct");
        setGatewayUrl(gc.url || "");
        setGatewayToken(gc.token || "");
        setGatewayCanEditCredentials(gc.canEditCredentials !== false);
      }
    } catch {}
    setGatewayLoading(false);
  }, [channelId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (tab === "members") {
      timer = setTimeout(() => {
        void loadMembers();
      }, 0);
    }
    if (tab === "gateway") {
      timer = setTimeout(() => {
        void loadGateway();
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [tab, loadGateway, loadMembers]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    const updates: Record<string, unknown> = {};
    if (name.trim() !== channelName) updates.name = name.trim();
    if (description.trim() !== (channelDescription || ""))
      updates.description = description.trim() || null;
    if (visibility !== isPublic) updates.isPublic = visibility;
    if (!visibility && password) updates.password = password;
    if (NPC_MOTION_KINDS.some((kind) => motion[kind] !== initialMotion[kind]))
      updates.motionConfig = motion;

    if (Object.keys(updates).length === 0) {
      setSaving(false);
      return;
    }

    if (updates.isPublic === false && !password && isPublic) {
      setSaveError(t("settings.passwordRequiredForPrivate"));
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(getLocalizedErrorMessage(t, data, "settings.failedToSave"));
      } else {
        setSaveSuccess(true);
        setPassword("");
        onUpdated(
          updates as {
            name?: string;
            description?: string | null;
            isPublic?: boolean;
            motionConfig?: NpcMotionConfig;
          },
        );
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      setSaveError(t("settings.failedToSave"));
    }
    setSaving(false);
  };

  const handleKick = async (member: Member) => {
    setKickingUserId(member.userId);
    setMembersError("");
    try {
      const res = await fetch(`/api/channels/${channelId}/members/${member.userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      } else {
        const data = await res.json().catch(() => ({}));
        setMembersError(getLocalizedErrorMessage(t, data, "errors.failedToKickMember"));
      }
    } catch {
      setMembersError(t("errors.failedToKickMember"));
    }
    setKickingUserId(null);
    setConfirmKick(null);
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestConnection = async () => {
    setGatewayTesting(true);
    setGatewayNotice(null);
    setGatewayConnectionState({ status: "idle" });
    setGatewayError("");
    try {
      const shouldUseResource = gatewayMode === "resource" && !!selectedGatewayId;
      const res = shouldUseResource
        ? await fetch(`/api/gateways/${selectedGatewayId}/test`, { method: "POST" })
        : await fetch("/api/channels/test-gateway", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: gatewayUrl.trim(),
              token: gatewayToken.trim(),
            }),
          });
      const data = await res.json();
      if (res.ok) {
        setGatewayConnectionState({ status: "connected" });
      } else {
        setGatewayConnectionState({
          status: "error",
          error: getLocalizedErrorMessage(t, data, "errors.connectionFailed"),
        });
      }
    } catch {
      setGatewayConnectionState({ status: "error", error: t("errors.connectionFailed") });
    } finally {
      setGatewayTesting(false);
    }
  };

  const handleSaveGateway = async () => {
    if (gatewayMode === "resource" && !selectedGatewayId) {
      setGatewayError(t("settings.gatewaySelect"));
      return;
    }
    setGatewaySaving(true);
    setGatewayError("");
    const gatewayConfig: Record<string, unknown> = {};
    if (gatewayMode === "resource" && selectedGatewayId) {
      gatewayConfig.gatewayId = selectedGatewayId;
    } else {
      gatewayConfig.url = gatewayUrl.trim() || null;
      // Leaving it empty means "keep as-is" — to clear the key, disconnect the gateway.
      if (gatewayToken.trim()) gatewayConfig.token = gatewayToken.trim();
    }
    try {
      const res = await fetch(`/api/channels/${channelId}/gateway`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gatewayConfig),
      });
      if (!res.ok) {
        // Changing the gateway does not delete the NPC — the NPC is the profile's seat,
        // and the server no longer returns a "reset the NPC?" 409.
        const data = await res.json().catch(() => ({}));
        setGatewayError(getLocalizedErrorMessage(t, data, "settings.failedToSave"));
      } else {
        const data = await res.json().catch(() => ({}));
        const nextGatewayId =
          typeof data?.gatewayConfig?.gatewayId === "string" ? data.gatewayConfig.gatewayId : null;
        setGatewayId(nextGatewayId);
        setSelectedGatewayId(nextGatewayId ?? "");
        setGatewayMode(nextGatewayId ? "resource" : "direct");
        setGatewayCanEditCredentials(data?.gatewayConfig?.canEditCredentials !== false);
        setGatewayUrl(data?.gatewayConfig?.url ?? gatewayUrl);
        setGatewayHasSavedToken(
          data?.gatewayConfig?.hasToken === true || Boolean(gatewayToken.trim()),
        );
        // Clear the field — don't put the saved key back on screen.
        setGatewayToken("");
        if (nextGatewayId) {
          setGatewayOptions((prev) => {
            if (prev.some((item) => item.id === nextGatewayId)) return prev;
            return [
              {
                id: nextGatewayId,
                displayName:
                  data?.gatewayConfig?.displayName || data?.gatewayConfig?.url || nextGatewayId,
                baseUrl: data?.gatewayConfig?.url || "",
                canEditCredentials: data?.gatewayConfig?.canEditCredentials !== false,
                isOwner: data?.gatewayConfig?.canEditCredentials !== false,
                shareRole: null,
              },
              ...prev,
            ];
          });
        }
        onUpdated({
          gatewayConfig: {
            gatewayId: data?.gatewayConfig?.gatewayId ?? gatewayId,
            url: data?.gatewayConfig?.url ?? gatewayConfig.url,
            hasToken: data?.gatewayConfig?.hasToken === true || Boolean(gatewayToken.trim()),
            canEditCredentials:
              data?.gatewayConfig?.canEditCredentials ?? gatewayCanEditCredentials,
          },
        });
        setGatewayNotice({ success: true, message: t("settings.saved") });
        setTimeout(() => setGatewayNotice(null), 3000);
      }
    } catch {
      setGatewayError(t("settings.failedToSave"));
    }
    setGatewaySaving(false);
  };

  const handleDeleteGateway = async () => {
    setGatewaySaving(true);
    setGatewayError("");
    try {
      const res = await fetch(`/api/channels/${channelId}/gateway`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGatewayError(getLocalizedErrorMessage(t, data, "settings.failedToSave"));
      } else {
        setGatewayId(null);
        setSelectedGatewayId("");
        setGatewayMode("direct");
        setGatewayUrl("");
        setGatewayToken("");
        setGatewayHasSavedToken(false);
        setGatewayCanEditCredentials(true);
        setGatewayConnectionState({ status: "idle" });
        onUpdated({
          gatewayConfig: {
            gatewayId: null,
            url: null,
            hasToken: false,
            canEditCredentials: true,
          },
        });
        setGatewayNotice({ success: true, message: t("settings.saved") });
        setTimeout(() => setGatewayNotice(null), 3000);
      }
    } catch {
      setGatewayError(t("settings.failedToSave"));
    }
    setGatewaySaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface rounded-xl w-full max-w-lg border border-border max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-text">{t("settings.title")}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-xl"
            aria-label={t("common.close")}
          >
            &times;
          </button>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("settings")}
            className={`flex-1 py-2 text-sm font-semibold ${tab === "settings" ? "text-info border-b-2 border-info" : "text-text-muted"}`}
          >
            {t("settings.general")}
          </button>
          <button
            onClick={() => setTab("members")}
            className={`flex-1 py-2 text-sm font-semibold ${tab === "members" ? "text-info border-b-2 border-info" : "text-text-muted"}`}
          >
            {t("settings.members")}
          </button>
          <button
            onClick={() => setTab("gateway")}
            className={`flex-1 py-2 text-sm font-semibold ${tab === "gateway" ? "text-info border-b-2 border-info" : "text-text-muted"}`}
          >
            {t("settings.gateway")}
          </button>
          <button
            onClick={() => setTab("ai-model")}
            className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "ai-model" ? "text-info border-b-2 border-info" : "text-text-muted"}`}
          >
            <Sparkles size={14} />
            Model & Key AI
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "settings" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">
                  {t("settings.channelName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-text focus:outline-none focus:border-primary-light"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">
                  {t("settings.description")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 bg-bg border border-border rounded text-text focus:outline-none focus:border-primary-light resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">
                  {t("settings.visibility")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility(true)}
                    className={`px-3 py-1 rounded text-sm ${visibility ? "bg-primary text-white" : "bg-surface-raised text-text-muted"}`}
                  >
                    {t("channels.public")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility(false)}
                    className={`px-3 py-1 rounded text-sm ${!visibility ? "bg-primary text-white" : "bg-surface-raised text-text-muted"}`}
                  >
                    {t("channels.private")}
                  </button>
                </div>
                {!visibility && isPublic && (
                  <p className="text-npc text-xs mt-1">{t("settings.switchToPrivateWarning")}</p>
                )}
                {visibility && !isPublic && (
                  <p className="text-npc text-xs mt-1">{t("settings.switchToPublicWarning")}</p>
                )}
              </div>
              {!visibility && (
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1">
                    {isPublic ? t("settings.setPassword") : t("settings.changePassword")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={100}
                    placeholder={
                      isPublic
                        ? t("settings.passwordPlaceholderNew")
                        : t("settings.passwordPlaceholderKeep")
                    }
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-text placeholder-text-dim focus:outline-none focus:border-primary-light"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">
                  {t("settings.inviteCode")}
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-bg border border-border rounded text-npc font-mono text-sm">
                    {inviteCode || "—"}
                  </code>
                  <button
                    onClick={copyInviteCode}
                    className="px-3 py-2 bg-surface-raised hover:bg-border rounded text-sm text-text"
                  >
                    {copied ? t("game.copied") : t("common.copy")}
                  </button>
                </div>
              </div>
              <fieldset className="space-y-3 border-t border-border pt-4" data-motion-settings>
                <legend className="text-sm font-semibold text-text-secondary">
                  {t("settings.npcMotion")}
                </legend>
                <p className="text-caption text-text-muted">{t("settings.npcMotionHint")}</p>
                {NPC_MOTION_KINDS.map((kind) => (
                  <label key={kind} className="block">
                    <span className="flex items-baseline justify-between text-sm text-text-secondary mb-1">
                      <span>{t(`settings.npcMotion.${kind}`)}</span>
                      <span className="text-text tabular-nums">
                        {t("settings.npcMotion.value", {
                          tiles: tilesPerSecond(motion[kind]),
                          times: Math.round((motion[kind] / motion.walk) * 10) / 10,
                        })}
                        {motion[kind] >= RUN_SPEED_THRESHOLD
                          ? ` · ${t("settings.npcMotion.running")}`
                          : ""}
                      </span>
                    </span>
                    <input
                      type="range"
                      data-motion-kind={kind}
                      min={NPC_SPEED_RANGE.min}
                      max={NPC_SPEED_RANGE.max}
                      step={NPC_SPEED_RANGE.step}
                      value={motion[kind]}
                      onChange={(e) => setMotion({ ...motion, [kind]: Number(e.target.value) })}
                      className="w-full"
                    />
                  </label>
                ))}
                <button
                  type="button"
                  data-motion-reset
                  onClick={() => setMotion(DEFAULT_NPC_MOTION)}
                  className="text-sm text-info hover:underline"
                >
                  {t("settings.npcMotion.reset")}
                </button>
              </fieldset>
              {saveError && <p className="text-danger text-sm">{saveError}</p>}
              {saveSuccess && <p className="text-success text-sm">{t("settings.saved")}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-2 bg-primary hover:bg-primary-hover rounded font-semibold text-white disabled:opacity-50"
              >
                {saving ? t("common.loading") : t("common.save")}
              </button>
            </div>
          ) : tab === "members" ? (
            <div>
              {membersLoading ? (
                <p className="text-text-muted text-sm py-4 text-center">
                  {t("settings.loadingMembers")}
                </p>
              ) : membersError ? (
                <p className="text-danger text-sm py-4 text-center">{membersError}</p>
              ) : members.length === 0 ? (
                <p className="text-text-muted text-sm py-4 text-center">
                  {t("settings.noMembers")}
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between px-3 py-2 bg-bg rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${m.isOnline ? "bg-success" : "bg-text-muted"}`}
                        />
                        <span className="text-text text-sm">{m.nickname}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${m.role === "owner" ? "bg-npc/30 text-npc" : "bg-surface-raised text-text-muted"}`}
                        >
                          {m.role === "owner" ? t("settings.roleOwner") : t("settings.roleMember")}
                        </span>
                      </div>
                      {m.role !== "owner" && (
                        <button
                          onClick={() => setConfirmKick(m)}
                          disabled={kickingUserId === m.userId}
                          className="text-danger hover:text-danger-hover text-xs px-2 py-1 disabled:opacity-50"
                        >
                          {t("settings.kick")}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {confirmKick && (
                <div className="mt-4 p-3 bg-danger-hover/30 border border-danger rounded">
                  <p className="text-sm text-text mb-2">
                    {t("settings.kickConfirm", { name: confirmKick.nickname })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleKick(confirmKick)}
                      className="px-3 py-1 bg-danger hover:bg-danger-hover rounded text-sm text-white"
                    >
                      {t("common.confirm")}
                    </button>
                    <button
                      onClick={() => setConfirmKick(null)}
                      className="px-3 py-1 bg-surface-raised hover:bg-border rounded text-sm text-text-secondary"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : tab === "gateway" ? (
            <div className="space-y-4">
              {gatewayLoading ? (
                <p className="text-text-muted text-sm py-4 text-center">
                  {t("settings.loadingGateway")}
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-2">
                      {t("settings.gatewaySource")}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGatewayMode("resource");
                          setGatewayConnectionState({ status: "idle" });
                          setGatewayNotice(null);
                        }}
                        className={`px-3 py-2 rounded text-sm font-semibold ${
                          gatewayMode === "resource"
                            ? "bg-primary text-white"
                            : "bg-surface-raised text-text-secondary"
                        }`}
                      >
                        {t("settings.gatewayUseSaved")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGatewayMode("direct");
                          setGatewayCanEditCredentials(true);
                          setGatewayConnectionState({ status: "idle" });
                          setGatewayNotice(null);
                        }}
                        className={`px-3 py-2 rounded text-sm font-semibold ${
                          gatewayMode === "direct"
                            ? "bg-primary text-white"
                            : "bg-surface-raised text-text-secondary"
                        }`}
                      >
                        {t("settings.gatewayUseCustom")}
                      </button>
                    </div>
                  </div>
                  {gatewayMode === "resource" ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-1">
                          {t("settings.gatewaySaved")}
                        </label>
                        <select
                          value={selectedGatewayId}
                          onChange={(e) => {
                            const nextId = e.target.value;
                            const option = gatewayOptions.find((item) => item.id === nextId);
                            setSelectedGatewayId(nextId);
                            setGatewayCanEditCredentials(option?.canEditCredentials ?? true);
                            setGatewayId(nextId || null);
                            setGatewayUrl(option?.baseUrl ?? "");
                            if (!option?.canEditCredentials) {
                              setGatewayToken("");
                            }
                            setGatewayConnectionState({ status: "idle" });
                            setGatewayNotice(null);
                          }}
                          className="w-full px-3 py-2 bg-bg border border-border rounded text-text focus:outline-none focus:border-primary-light"
                        >
                          <option value="">{t("settings.gatewaySelect")}</option>
                          {gatewayOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.displayName || option.baseUrl}
                            </option>
                          ))}
                        </select>
                        {selectedGatewayId && (
                          <p className="mt-2 text-xs text-text-muted">
                            {gatewayOptions.find((option) => option.id === selectedGatewayId)
                              ?.baseUrl ?? ""}
                          </p>
                        )}
                        {gatewayOptions.length === 0 && (
                          <p className="mt-2 text-xs text-npc-dark">
                            {t("settings.gatewayNoSaved")}
                          </p>
                        )}
                      </div>
                      {!gatewayCanEditCredentials && selectedGatewayId && (
                        <p className="text-xs text-npc-dark">
                          {t("settings.gatewaySharedReadOnly")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-1">
                          {t("settings.gatewayUrl")}
                        </label>
                        <input
                          type="text"
                          value={gatewayUrl}
                          onChange={(e) => setGatewayUrl(e.target.value)}
                          placeholder={t("settings.gatewayUrlPlaceholder")}
                          disabled={!gatewayCanEditCredentials}
                          className="w-full px-3 py-2 bg-bg border border-border rounded text-text placeholder-text-dim focus:outline-none focus:border-primary-light disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-1">
                          {t("settings.gatewayToken")}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type={showToken ? "text" : "password"}
                            value={gatewayToken}
                            onChange={(e) => setGatewayToken(e.target.value)}
                            placeholder={
                              gatewayHasSavedToken
                                ? t("settings.gatewayTokenSaved")
                                : t("settings.gatewayTokenPlaceholder")
                            }
                            disabled={!gatewayCanEditCredentials}
                            className="flex-1 px-3 py-2 bg-bg border border-border rounded text-text placeholder-text-dim focus:outline-none focus:border-primary-light disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken((v) => !v)}
                            className="px-3 py-2 bg-surface-raised hover:bg-border rounded text-sm text-text-secondary"
                          >
                            {showToken ? t("common.hide") : t("common.show")}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-npc-dark">
                        {t("channel.gateway.directInputHint")}{" "}
                        <Link href="/gateways" className="underline hover:text-npc">
                          {t("gateways.title")}
                        </Link>
                      </p>
                    </>
                  )}
                  {gatewayConnectionState.status !== "idle" && (
                    <GatewayStatusCard
                      status={gatewayConnectionState.status}
                      error={gatewayConnectionState.error}
                      detail={
                        gatewayConnectionState.status === "connected"
                          ? t("settings.connected")
                          : undefined
                      }
                    />
                  )}
                  {gatewayNotice && (
                    <p
                      className={`text-sm ${gatewayNotice.success ? "text-success" : "text-danger"}`}
                    >
                      {gatewayNotice.message}
                    </p>
                  )}
                  {gatewayError && <p className="text-danger text-sm">{gatewayError}</p>}
                  <div className="flex gap-2">
                    {gatewayId && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteGateway()}
                        disabled={gatewaySaving}
                        className="px-4 py-2 bg-danger/70 hover:bg-danger-hover rounded font-semibold text-white disabled:opacity-50"
                      >
                        {t("settings.disconnectGateway")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleTestConnection()}
                      disabled={
                        gatewayTesting ||
                        (gatewayMode === "resource" ? !selectedGatewayId : !gatewayUrl.trim())
                      }
                      className="flex-1 px-4 py-2 bg-surface-raised hover:bg-border rounded font-semibold text-text disabled:opacity-50"
                    >
                      {gatewayTesting ? t("common.loading") : t("settings.testConnection")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveGateway()}
                      disabled={gatewaySaving || (gatewayMode === "resource" && !selectedGatewayId)}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover rounded font-semibold text-white disabled:opacity-50"
                    >
                      {gatewaySaving ? t("common.loading") : t("common.save")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {aiLoading ? (
                <p className="text-text-muted text-sm py-8 text-center flex items-center justify-center gap-2">
                  <RefreshCw size={15} className="animate-spin" />
                  Đang tải cấu hình AI từ Hermes...
                </p>
              ) : (
                <form onSubmit={handleSaveAiConfig} className="space-y-4">
                  {/* Current status card */}
                  <div className="rounded-lg border border-border bg-bg p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                        <Bot size={14} className="text-primary" /> Trạng thái Hermes AI hiện tại
                      </span>
                      <button
                        type="button"
                        onClick={() => void loadAiConfig()}
                        className="text-xs text-text-muted hover:text-text flex items-center gap-1 transition-colors"
                        title="Tải lại trạng thái"
                      >
                        <RefreshCw size={12} className={aiLoading ? "animate-spin" : ""} />
                        Làm mới
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="rounded bg-surface px-2.5 py-1 text-xs font-medium text-text border border-border">
                        Model: <strong className="text-primary">{aiCurrentConfig?.model || "Chưa thiết lập"}</strong>
                      </span>
                      <span className="rounded bg-surface px-2.5 py-1 text-xs font-medium text-text border border-border">
                        Provider: <strong>{aiCurrentConfig?.provider || "nvidia"}</strong>
                      </span>
                      <span
                        className={`rounded px-2.5 py-1 text-[11px] font-semibold border ${
                          aiCurrentConfig?.hasKey
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-warning/10 text-warning border-warning/30"
                        }`}
                      >
                        {aiCurrentConfig?.hasKey ? "✓ Đã lưu API Key" : "⚠ Chưa có API Key"}
                      </span>
                    </div>
                  </div>

                  {/* Provider selection */}
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                      Nhà cung cấp AI (Provider)
                    </label>
                    <select
                      value={aiProvider}
                      onChange={(e) => {
                        const nextP = e.target.value;
                        setAiProvider(nextP);
                        const prov = aiProvidersList.find((p) => p.id === nextP);
                        if (prov && prov.models.length > 0) {
                          setAiModel(prov.models[0]);
                        }
                        if (prov?.defaultBaseUrl) {
                          setAiBaseUrl(prov.defaultBaseUrl);
                        } else {
                          setAiBaseUrl("");
                        }
                      }}
                      className="w-full px-3 py-2 bg-bg border border-border rounded text-text focus:outline-none focus:border-primary-light text-sm"
                    >
                      {aiProvidersList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model selection / input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-text-secondary">
                        Tên Model AI (Model Name)
                      </label>
                      <span className="text-xs text-text-muted">Chọn gợi ý hoặc tự nhập tên</span>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        placeholder="ví dụ: z-ai/glm-5.3-flash, gpt-4o, deepseek-chat..."
                        className="w-full px-3 py-2 bg-bg border border-border rounded text-text focus:outline-none focus:border-primary-light text-sm"
                        required
                      />
                      {/* Quick model pills */}
                      {aiProvidersList.find((p) => p.id === aiProvider)?.models && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {aiProvidersList
                            .find((p) => p.id === aiProvider)
                            ?.models.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setAiModel(m)}
                                className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                                  aiModel === m
                                    ? "bg-primary/20 border-primary text-primary font-semibold"
                                    : "bg-surface hover:bg-surface-raised border-border text-text-muted"
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Key input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-text-secondary flex items-center gap-1.5">
                        <Key size={13} />
                        API Key
                      </label>
                      {aiProvidersList.find((p) => p.id === aiProvider)?.keyUrl && (
                        <a
                          href={aiProvidersList.find((p) => p.id === aiProvider)?.keyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Lấy API Key tại đây <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={aiShowKey ? "text" : "password"}
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        placeholder={
                          aiCurrentConfig?.hasKey
                            ? "•••••••••••••••• (Để trống nếu muốn giữ nguyên key cũ)"
                            : "Nhập API Key của nhà cung cấp..."
                        }
                        className="w-full px-3 py-2 pr-10 bg-bg border border-border rounded text-text focus:outline-none focus:border-primary-light text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setAiShowKey(!aiShowKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                      >
                        {aiShowKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Custom Base URL (Optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">
                      Endpoint Base URL (Tùy chọn — Dành cho Ollama hoặc Proxy riêng)
                    </label>
                    <input
                      type="text"
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      placeholder="ví dụ: http://localhost:11434/v1 hoặc để trống để dùng mặc định"
                      className="w-full px-3 py-1.5 bg-bg border border-border rounded text-text focus:outline-none focus:border-primary-light text-xs font-mono"
                    />
                  </div>

                  {/* Status message */}
                  {aiMessage && (
                    <div
                      className={`p-3 rounded-lg text-sm border flex items-start gap-2 ${
                        aiMessage.type === "success"
                          ? "bg-success/10 border-success/30 text-success"
                          : "bg-danger/10 border-danger/30 text-danger"
                      }`}
                    >
                      {aiMessage.type === "success" ? (
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      )}
                      <span>{aiMessage.text}</span>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={aiSaving || aiLoading}
                    className="w-full py-2.5 bg-primary hover:bg-primary-hover rounded-lg font-semibold text-white shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {aiSaving ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        Đang lưu và khởi động lại Hermes...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Lưu Cấu Hình AI Sang Hermes
                      </>
                    )}
                  </button>
                </form>
              )}
              <CliRoutingSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
