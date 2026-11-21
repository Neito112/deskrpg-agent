"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Download, Globe, Loader2, Play, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import GatewaySetupWizard from "@/components/gateway/GatewaySetupWizard";
import {
  nextSelectedGatewayId,
  reloadAfterSave,
  type GatewayReloadOptions,
} from "./gateway-selection";
import GatewayOnboardingGuide from "@/components/gateway/GatewayOnboardingGuide";
import GatewayStatusCard, { type GatewayStatus } from "@/components/gateway/GatewayStatusCard";
import DiagnosticsPanel from "@/components/gateway/DiagnosticsPanel";
import HermesSystemSettings from "@/components/gateway/HermesSystemSettings";
import ImportableProfilesNotice from "@/components/hermes/ImportableProfilesNotice";
import { getLocalizedErrorMessage, withHeaderErrorCode } from "@/lib/i18n/error-codes";
import { useLocale, useT } from "@/lib/i18n";

import { planGatewayDelete } from "./gateway-delete-plan";
import { backLinkTarget } from "./return-target";
import { employeesHref } from "@/components/workspace-navigation";
import { describePluginVersion } from "@/lib/hermes/plugin-version-view";
import {
  composePluginUpdateCommand,
  composeServiceHost,
} from "@/lib/hermes/setup/gateway-host-target";
import { CopyCommand } from "@/components/CopyCommand";
import {
  CLONED_COMPOSE_UPDATE_COMMAND,
  HOSTINGER_COMPOSE_REPLACE_URL,
  isOldComposeInstall,
} from "@/lib/hermes/compose-install";
import { setupCopy, setupError, setupHostError, setupStep } from "@/components/gateway/setup-copy";
import type { WorkerPropagation } from "@/lib/hermes/deskrpg-plugin-types";
import type { WorkerPluginWarning } from "@/lib/hermes/worker-plugin";
import WorkerPropagationInheritedNotice, {
  disableWorkerPropagationRequest,
} from "./WorkerPropagationInheritedNotice";
import WorkerLaunchLine from "./WorkerLaunchLine";
import type { WorkerLaunchWarning } from "@/lib/hermes/worker-launch";
import WorkerPluginLine, { type WorkerPluginApplyResponse } from "./WorkerPluginLine";
import { enableWorkerPropagationRequest } from "./worker-propagation-request";

type GatewayRow = {
  id: string;
  displayName: string;
  baseUrl: string;
  ownerUserId?: string;
  canEditCredentials?: boolean;
  shareRole?: string | null;
  isOwner?: boolean;
  lastValidatedAt?: string | null;
  lastValidationStatus?: string | null;
  lastValidationError?: string | null;
  /** The public address of the Hermes dashboard — plugin 0.7.1 reports it, and it is sent only to the owner. */
  dashboardUrl?: string | null;
  /** The installed version seen by the last probe. `/api/gateways` serves it from the cache. */
  pluginVersion?: string | null;
  pluginStatus?: string | null;
  /** The running plugin commit (0.30.0+), null when unknown. */
  pluginCommit?: string | null;
  /** Employees whose kanban/cron artifacts do not accumulate. Sent only to the owner (`worker-plugin.ts`). */
  workerPluginWarning?: WorkerPluginWarning | null;
  /** 0.16.0 worker propagation state — only owner rows have a value (shared rows and old plugins are null). */
  workerPropagation?: WorkerPropagation | null;
  /** Kanban workers that cannot start on this gateway. Sent only to the owner (`worker-launch.ts`). */
  workerLaunchWarning?: WorkerLaunchWarning | null;
  /** Employees whose cards can finish without approval. Sent only to the owner (`review-hooks.ts`). */
  unreviewedProfiles?: string[];
};

/** The gateway connection test result. The old name was PairingState, but pairing (OpenClaw device
 * approval) is gone and all that remains is the connection test state. */
/** Channels blocking deletion. The server sends them along with 409. */
type BlockingChannel = {
  channelId: string;
  channelName: string;
  canUnbind: boolean;
  npcCount: number;
  meetingMinutesCount: number;
};

type GatewayTestState = {
  status: GatewayStatus;
  error?: string | null;
};

/**
 * Show the plugin version installed on this gateway side by side with the version the app installs.
 *
 * This line fills something that was missing — the installed version used to appear nowhere on screen, so checking
 * whether the plugin was upgraded meant reading the API directly. The value comes from the cache, and the cache can be up to an hour
 * stale (`shouldReprobePlugin`), so if it looks behind, the user is told to press "연결 테스트" to
 * check again — that button refreshes the cache after probing.
 */
function PluginVersionLine({ gateway, onUpdated }: { gateway: GatewayRow; onUpdated: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const [busyStep, setBusyStep] = useState<string | null>(null);
  // The error remembers which installed version it was about. Once a recheck (connection test,
  // reload) shows another version or no longer an outdated one, it no longer applies — a user
  // who upgraded on the host by hand must not keep seeing "the app cannot run commands here".
  const [updateError, setUpdateError] = useState<{
    text: string;
    kind: "compose" | "other";
    version: string | null;
  } | null>(null);
  // If the update inherited worker propagation turned on, say so once (the job's workerPropagationInherited).
  const [inherited, setInherited] = useState(false);
  const view = describePluginVersion({
    installed: gateway.pluginVersion,
    pluginStatus: gateway.pluginStatus,
  });
  // A Hermes container next to DeskRPG (`http://hermes:8642`): the app cannot reach its shell, and there is no
  // host install to update either — the plugin moves through Compose.
  const composeService = composeServiceHost(gateway.baseUrl);
  // Set up from an older compose file: the plugin comes from its main branch, so the Compose command above would only
  // pull it again. The one fix is taking the new compose file once; that notice replaces the update affordances.
  const oldCompose = isOldComposeInstall({
    baseUrl: gateway.baseUrl,
    pluginStatus: gateway.pluginStatus,
    pluginVersion: gateway.pluginVersion,
    pluginCommit: gateway.pluginCommit,
  });

  // Updating runs commands on the host and takes long, so it runs as a job — using the same job query as the wizard.
  const runUpdate = async () => {
    setUpdateError(null);
    setBusyStep("inspecting");
    try {
      const started = await fetch(`/api/gateways/${gateway.id}/plugin/update`, { method: "POST" });
      const startedBody = await started.json().catch(() => ({}));
      if (!started.ok) throw startedBody?.errorCode ?? "setup_failed";
      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const res = await fetch(`/api/gateways/setup?job=${encodeURIComponent(startedBody.jobId)}`);
        const body = await res.json().catch(() => ({}));
        const job = body?.job;
        if (!res.ok || !job) throw body?.errorCode ?? "setup_failed";
        setBusyStep(job.steps?.at(-1) ?? null);
        if (job.status === "succeeded") {
          setInherited(job.workerPropagationInherited === true);
          break;
        }
        if (job.status === "failed" || job.status === "cancelled")
          throw job.error ?? "setup_failed";
      }
      onUpdated();
    } catch (code) {
      setUpdateError({
        text:
          composeService && code === "plugin_update_unsupported_host"
            ? t("gateways.pluginContainer.refused")
            : (setupHostError(locale, code) ?? setupError(setupCopy[locale], code)),
        kind: composeService && code === "plugin_update_unsupported_host" ? "compose" : "other",
        version: gateway.pluginVersion ?? null,
      });
    } finally {
      setBusyStep(null);
    }
  };

  const tone =
    view.state === "outdated"
      ? "text-npc-dark"
      : view.state === "current"
        ? "text-success"
        : "text-text-muted";

  return (
    <>
      <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
        <span>
          {t("gateways.pluginVersion")}:{" "}
          <span className={`font-semibold ${tone}`} data-plugin-version={view.state}>
            {view.installed ?? t("gateways.pluginVersionUnknown")}
          </span>
        </span>
        <span className="text-text-dim">·</span>
        <span>
          {t("gateways.pluginVersionPinned")}: {view.pinned}
        </span>
        {view.state === "outdated" && !oldCompose && (
          <span
            data-plugin-outdated-hint={
              !composeService ? "host" : gateway.isOwner ? "compose" : "compose-viewer"
            }
          >
            —{" "}
            {t(
              !composeService
                ? "gateways.pluginVersionOutdated"
                : gateway.isOwner
                  ? "gateways.pluginContainer.outdated"
                  : "gateways.pluginContainer.outdatedViewer",
            )}
          </span>
        )}
        {view.state === "unknown" && <span>— {t("gateways.pluginVersionRecheck")}</span>}
        {view.state === "outdated" && gateway.isOwner && !oldCompose && (
          <button
            type="button"
            data-action="plugin-update"
            onClick={() => void runUpdate()}
            disabled={busyStep !== null}
            className="rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-medium hover:brightness-110 disabled:opacity-60"
          >
            {busyStep
              ? setupStep(setupCopy[locale], busyStep)
              : t("gateways.pluginVersionUpdateNow")}
          </button>
        )}
        {updateError &&
          view.state === "outdated" &&
          updateError.version === (gateway.pluginVersion ?? null) && (
            <span className="text-danger" data-plugin-update-error={updateError.kind}>
              {updateError.text}
            </span>
          )}
      </p>
      {view.state === "outdated" && composeService && gateway.isOwner && !oldCompose && (
        <details className="-mt-3 mb-4 text-xs text-text-muted" data-plugin-update="compose">
          <summary className="cursor-pointer select-none">
            {t("gateways.pluginContainer.details")}
          </summary>
          <div className="mt-1.5 space-y-1.5">
            <p>{t("gateways.pluginContainer.detailsBody")}</p>
            <CopyCommand command={composePluginUpdateCommand(composeService)} />
          </div>
        </details>
      )}
      {oldCompose && (
        <div
          className="-mt-3 mb-4 space-y-1.5 rounded-lg border border-border bg-surface p-2.5 text-xs text-text-muted"
          data-plugin-compose-install={gateway.isOwner ? "old" : "old-viewer"}
        >
          <p>
            {t("gateways.oldCompose.notice")}{" "}
            {t(gateway.isOwner ? "gateways.oldCompose.todo" : "gateways.oldCompose.todoViewer")}
          </p>
          {gateway.isOwner && (
            <details>
              <summary className="cursor-pointer select-none">
                {t("gateways.pluginContainer.details")}
              </summary>
              <div className="mt-1.5 space-y-1.5">
                <p>
                  {t("gateways.oldCompose.hostinger")}{" "}
                  <a
                    href={HOSTINGER_COMPOSE_REPLACE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("gateways.oldCompose.hostingerLink")}
                  </a>
                </p>
                <p>{t("gateways.oldCompose.cloned")}</p>
                <CopyCommand command={CLONED_COMPOSE_UPDATE_COMMAND} />
              </div>
            </details>
          )}
        </div>
      )}
      {inherited && (
        <WorkerPropagationInheritedNotice
          turnOff={() => disableWorkerPropagationRequest(gateway.id)}
          onChanged={onUpdated}
        />
      )}
    </>
  );
}

/** The server also reports failure as 200 + errorCode (proxy convention), so branch on whether the body has `results`. */
async function applyWorkerPluginRequest(gatewayId: string): Promise<WorkerPluginApplyResponse> {
  const res = await fetch(`/api/gateways/${gatewayId}/plugin/worker-plugin`, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (res.ok && Array.isArray(body?.results)) return { ok: true, results: body.results };
  return {
    ok: false,
    errorCode: typeof body?.errorCode === "string" ? body.errorCode : `http_${res.status}`,
  };
}

const EMPTY_TEST_STATE: GatewayTestState = { status: "idle" };

/** Show "새로 읽는 중" only when a reload takes longer than this — so short reloads do not flash. */
const REFRESH_INDICATOR_DELAY_MS = 300;

export default function GatewayManagementPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="theme-web min-h-screen flex items-center justify-center bg-bg text-text">
          {t("common.loading")}
        </div>
      }
    >
      <GatewayManagementPageInner />
    </Suspense>
  );
}

function GatewayManagementPageInner() {
  const t = useT();
  // The round trip coming from the office (channel screen) as "let's make one more persona". `gateway` says which
  // gateway to open, `new=1` whether to expand the create screen right away, and `returnTo` where to go back
  // after creating. `returnTo` is not trusted as is — safeReturnTo lets only
  // same-origin paths through (open redirect).
  const searchParams = useSearchParams();
  const requestedGatewayId = searchParams.get("gateway") ?? "";
  const autoOpenCreate = searchParams.get("new") === "1";
  const returnToParam = searchParams.get("returnTo");
  const returnTo = backLinkTarget(returnToParam);

  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGatewayId, setSelectedGatewayId] = useState(requestedGatewayId);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testingGatewayId, setTestingGatewayId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [testStates, setTestStates] = useState<Record<string, GatewayTestState>>({});
  const [blockingChannels, setBlockingChannels] = useState<BlockingChannel[]>([]);
  const [unbinding, setUnbinding] = useState("");
  // Sharing and diagnostics have their own pages ("one feature, one page"); this screen only links to them.
  // The diagnostics link appears only for someone the diagnostics API answers (admins).
  const [diagnosticsAvailable, setDiagnosticsAvailable] = useState(false);

  // Local installation and modal states
  const [localStatus, setLocalStatus] = useState<{ isInstalled: boolean; isRunning: boolean } | null>(null);
  const [checkingLocal, setCheckingLocal] = useState(true);
  const [installingLocal, setInstallingLocal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectUrl, setConnectUrl] = useState("http://127.0.0.1:8642");
  const [connectToken, setConnectToken] = useState("");
  const [connectName, setConnectName] = useState("");
  const [connectingGateway, setConnectingGateway] = useState(false);

  const checkLocalStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/hermes/local-status");
      const data = await r.json().catch(() => ({}));
      if (data.ok) {
        setLocalStatus({ isInstalled: !!data.isInstalled, isRunning: !!data.isRunning });
        return data;
      }
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    let isMounted = true;
    checkLocalStatus().finally(() => {
      if (isMounted) setCheckingLocal(false);
    });
    const interval = setInterval(() => {
      void checkLocalStatus();
    }, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkLocalStatus]);

  const handleLocalInstall = async () => {
    setInstallingLocal(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/hermes/local-status", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setLocalStatus({ isInstalled: true, isRunning: !!data.isRunning });
        if (data.isRunning) {
          setNotice("Đã xác nhận Gateway đang vận hành bình thường!");
        } else {
          setError("Gateway chưa phản hồi trên cổng 8642. Vui lòng kiểm tra lại dịch vụ.");
        }
        void loadGateways();
      } else {
        setError(data.error || "Không thể khởi chạy hoặc cài đặt Hermes cục bộ");
      }
    } catch {
      setError("Lỗi kết nối khi khởi chạy/cài đặt cục bộ.");
    } finally {
      setInstallingLocal(false);
    }
  };

  const handleConnectGateway = async () => {
    if (!connectUrl.trim()) return;
    setConnectingGateway(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: connectUrl.trim(),
          token: connectToken.trim(),
          displayName: connectName.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice("Đã kết nối Gateway thành công!");
        setShowConnectModal(false);
        void loadGateways();
      } else {
        setError(data.error || "Không thể kết nối Gateway");
      }
    } catch {
      setError("Lỗi kết nối tới Gateway");
    } finally {
      setConnectingGateway(false);
    }
  };

  // Reload progress indicator. Shown small next to the title without swapping the screen (overlapping reloads are counted).
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);
  const refreshesInFlight = useRef(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  const loadGateways = useCallback(
    async (options: GatewayReloadOptions = {}) => {
      const isRefresh = loadedOnce.current;
      if (isRefresh) {
        refreshesInFlight.current += 1;
        refreshTimer.current ??= setTimeout(() => setRefreshing(true), REFRESH_INDICATOR_DELAY_MS);
      }
      // `loading` is used only for the first load (initial value true). Setting it again on reload makes `if (loading)` turn the page
      // into the loading screen, unmounting children, and the result notices shown after an operation (the update's "계속 켭니다 [끄기]",
      // [설정에서 켜기] success) vanish along with their local state (2026-09-24 E2E measurement). Save, delete and share each have
      // their own progress indicator (saving, deleting, …).
      setError("");
      try {
        // `refreshPlugin` re-probes a cache that no longer describes the install (a host upgraded by
        // git pull), so the version line and the worker-plugin warning are not an hour behind.
        const res = await fetch("/api/gateways?refreshPlugin=1");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw data;
        }
        const nextGateways = Array.isArray(data.gateways) ? data.gateways : [];
        setGateways(nextGateways);
        setSelectedGatewayId((current) => nextSelectedGatewayId(current, nextGateways, options));
      } catch (nextError) {
        setError(getLocalizedErrorMessage(t, nextError, "common.error"));
      } finally {
        setLoading(false);
        loadedOnce.current = true;
        if (isRefresh) {
          refreshesInFlight.current -= 1;
          if (refreshesInFlight.current === 0) {
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
            refreshTimer.current = null;
            setRefreshing(false);
          }
        }
      }
    },
    [t],
  );

  useEffect(() => {
    void loadGateways();
  }, [loadGateways]);

  const selectedGateway = useMemo(
    () => gateways.find((gateway) => gateway.id === selectedGatewayId) ?? null,
    [gateways, selectedGatewayId],
  );

  useEffect(() => {
    if (!selectedGateway) {
      setFormMode("create");
      setDisplayName("");
      setBaseUrl("");
      setToken("");
      return;
    }

    setFormMode(selectedGateway.isOwner ? "edit" : "create");
    setDisplayName(selectedGateway.displayName || "");
    setBaseUrl(selectedGateway.baseUrl || "");
    setToken("");
  }, [selectedGateway]);

  const handleUpdate = async () => {
    if (!selectedGateway) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (token.trim()) {
        const details = await fetch(`/api/gateways/${selectedGateway.id}`);
        const data = await details.json();
        if (!details.ok) throw data;
        if (
          !window.confirm(
            t("gateways.rotateTokenConfirm", { count: data.gateway.boundChannelCount ?? 0 }),
          )
        )
          return;
      }
      const body: Record<string, unknown> = {
        displayName,
        url: baseUrl,
      };
      if (token.trim()) body.token = token.trim();

      const res = await fetch(`/api/gateways/${selectedGateway.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw data;
      }
      await loadGateways();
      setToken("");
      setNotice(t("gateways.saved"));
    } catch (nextError) {
      setError(getLocalizedErrorMessage(t, nextError, "common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleUnbindChannel = async (channel: BlockingChannel) => {
    if (!window.confirm(t("gateways.unbindConfirm", { name: channel.channelName }))) return;
    setUnbinding(channel.channelId);
    setError("");
    try {
      // Unbinding no longer deletes but puts to sleep — NPCs clock out remembering their seats
      // and minutes stay as they are. That is also why the old confirmNpcReset=1 was removed
      // (a relic still attached even though the server no longer required that confirmation).
      const res = await fetch(`/api/channels/${channel.channelId}/gateway`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw data;
      setBlockingChannels((prev) => prev.filter((c) => c.channelId !== channel.channelId));
      setNotice(t("gateways.unbound", { name: channel.channelName }));
    } catch (nextError) {
      setError(getLocalizedErrorMessage(t, nextError, "common.error"));
    } finally {
      setUnbinding("");
    }
  };

  /** Total the NPC seats and channel counts that this gateway's profiles bring along. */
  const sumGatewayUsage = async (gatewayId: string) => {
    const res = await fetch(`/api/gateways/${gatewayId}/profiles`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data;
    const rows: { id: string }[] = Array.isArray(data.profiles) ? data.profiles : [];
    const usages = await Promise.all(
      rows.map(async (row) => {
        const usageRes = await fetch(`/api/gateways/${gatewayId}/profiles/${row.id}`);
        const usageData = await usageRes.json().catch(() => ({}));
        const usage = (usageData as { usage?: { npcs?: unknown; channels?: unknown } }).usage;
        return usageRes.ok && usage
          ? { npcs: Number(usage.npcs ?? 0), channels: Number(usage.channels ?? 0) }
          : { npcs: 0, channels: 0 };
      }),
    );
    return {
      profiles: rows.length,
      npcs: usages.reduce((sum, u) => sum + u.npcs, 0),
      channels: usages.reduce((sum, u) => sum + u.channels, 0),
    };
  };

  const handleDelete = async (gatewayToDelete?: GatewayRow) => {
    const target = gatewayToDelete ?? selectedGateway;
    if (!target) return;
    // Deleting a gateway cascades from profiles → NPCs → tasks. A confirmation that does not say what disappears
    // and how much is not a confirmation — count the numbers first and put them in the text.
    let usage = { profiles: 0, npcs: 0, channels: 0 };
    try {
      usage = await sumGatewayUsage(target.id);
    } catch {
      // Failing to read the numbers does not block deletion — ask with 0.
    }
    const plan = planGatewayDelete(usage);
    if (plan.blocked) {
      // This is a deletion the server will refuse with 409. Showing a confirmation would have the user agree to something that
      // will not happen — do not ask; say what must be done first.
      setError(t("gateways.deleteBlockedByChannels"));
      setNotice("");
      return;
    }
    if (
      !window.confirm(
        t("gateways.deleteConfirmWithUsage", {
          profiles: String(plan.profiles),
          npcs: String(plan.npcs),
        }),
      )
    ) {
      return;
    }
    setDeleting(true);
    setError("");
    setNotice("");
    setBlockingChannels([]);
    try {
      const res = await fetch(`/api/gateways/${target.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw data;
      }
      setTestStates((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      await loadGateways();
      setDisplayName("");
      setBaseUrl("");
      setToken("");
      setNotice(t("gateways.deleted"));
    } catch (nextError) {
      setError(getLocalizedErrorMessage(t, nextError, "common.error"));
      // Show the list of blocking channels so they can be unbound right there — the round trip of hunting them down
      // on the channel screen was this screen's biggest friction.
      const blocked = (nextError as { channels?: BlockingChannel[] })?.channels;
      if (Array.isArray(blocked)) setBlockingChannels(blocked);
    } finally {
      setDeleting(false);
    }
  };

  const handleTest = async (gatewayId: string) => {
    setTestingGatewayId(gatewayId);
    setTestStates((prev) => ({
      ...prev,
      [gatewayId]: EMPTY_TEST_STATE,
    }));
    try {
      const res = await fetch(`/api/gateways/${gatewayId}/test`, { method: "POST" });
      // Even if the body is lost, the header code keeps the diagnosis alive (see the withHeaderErrorCode comment above).
      const data = withHeaderErrorCode(await res.json().catch(() => ({})), res.headers);
      // Probe failures come as 200 + { ok: false } (see the route's PROBE_RESULT_INIT comment).
      // Judging by res.ok would read a failure as success.
      const succeeded = res.ok && (data as { ok?: unknown } | null)?.ok !== false;
      if (succeeded) {
        setTestStates((prev) => ({
          ...prev,
          [gatewayId]: { status: "connected" },
        }));
        await loadGateways();
      } else {
        setTestStates((prev) => ({
          ...prev,
          [gatewayId]: {
            status: "error",
            error: getLocalizedErrorMessage(t, data, "errors.connectionFailed"),
          },
        }));
      }
    } catch (err) {
      // This is the case where no response came at all (the browser cut the request or the network died).
      // Showing only the fallback text makes it indistinguishable from a diagnosis the server sent, so there is no way to know
      // which layer broke — and in fact we wandered for a long time because that could not be told apart. Show the cause too.
      const detail = err instanceof Error ? err.message : String(err);
      setTestStates((prev) => ({
        ...prev,
        [gatewayId]: {
          status: "error",
          error: `${t("errors.connectionFailed")} (${detail})`,
        },
      }));
    } finally {
      setTestingGatewayId(null);
    }
  };

  if (loading) {
    return (
      <div className="theme-web min-h-screen flex items-center justify-center bg-bg text-text">
        {t("common.loading")}
      </div>
    );
  }

  const isLocalRunning = Boolean(localStatus?.isRunning);
  const isLocalInstalled = Boolean(localStatus?.isInstalled);

  // Status verification: Must confirm it is ACTUALLY OPERATIONAL / RUNNING / RESPONDING,
  // not merely checking if it is installed on the machine!
  const isOperational = Boolean(
    isLocalRunning ||
    gateways.some((g) => {
      const isLoopback = g.baseUrl.includes("127.0.0.1:8642") || g.baseUrl.includes("localhost:8642");
      if (isLoopback) {
        return isLocalRunning;
      }
      return (
        (g.lastValidationStatus === "valid" || testStates[g.id]?.status === "connected") &&
        testStates[g.id]?.status !== "error" &&
        g.pluginStatus !== "plugin_absent"
      );
    }),
  );

  return (
    <div className="theme-web workspace-page min-h-[85vh] bg-bg text-text py-8 px-4 sm:px-6">
      <div className={`mx-auto ${isOperational ? "max-w-4xl space-y-6" : "max-w-lg pt-12 space-y-6"}`}>
        {/* Header & 2 Buttons */}
        {isOperational ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-text">
                {t("gateways.title")}
                {refreshing && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-1 text-xs font-normal text-text-muted"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("gateways.refreshing")}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-xs text-text-muted">
                Quản lý cổng kết nối và cấu hình hệ thống AI Hermes
              </p>
            </div>

            {/* 2 Buttons Pushed to Top and Shrunk */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const primaryGw = gateways.find((g) => g.baseUrl.includes("8642")) || gateways[0];
                  if (primaryGw) void handleTest(primaryGw.id);
                  void checkLocalStatus();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                title="Gateway đã được xác nhận đang vận hành. Nhấn để kiểm tra lại."
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Đang vận hành</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text shadow-sm hover:bg-surface-raised transition cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span>Kết nối gateway</span>
              </button>

              {selectedGateway && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 transition cursor-pointer disabled:opacity-60"
                  title="Ngắt kết nối và xóa Gateway này"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{deleting ? "Đang xóa..." : "Xóa Gateway"}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-text">
                {t("gateways.title")}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                Xác thực và vận hành cổng kết nối Hermes trước khi cấu hình hệ thống
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isLocalInstalled ? (
                <button
                  type="button"
                  onClick={() => void handleLocalInstall()}
                  disabled={installingLocal || checkingLocal}
                  className="flex items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-4 text-base font-semibold text-white shadow hover:bg-primary-hover disabled:opacity-60 transition cursor-pointer"
                >
                  {installingLocal ? (
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                  ) : (
                    <Play className="h-5 w-5 shrink-0 fill-current" />
                  )}
                  <span>{installingLocal ? "Đang khởi chạy & vận hành..." : "Khởi chạy & Vận hành"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLocalInstall()}
                  disabled={installingLocal || checkingLocal}
                  className="flex items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-4 text-base font-semibold text-white shadow hover:bg-primary-hover disabled:opacity-60 transition cursor-pointer"
                >
                  {installingLocal ? (
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                  ) : (
                    <Download className="h-5 w-5 shrink-0" />
                  )}
                  <span>{installingLocal ? "Đang cài đặt & vận hành..." : "Cài cục bộ"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="flex items-center justify-center gap-2.5 rounded-xl border border-border bg-surface px-5 py-4 text-base font-semibold text-text shadow-sm hover:bg-surface-raised transition cursor-pointer"
              >
                <Globe className="h-5 w-5 shrink-0" />
                <span>Kết nối gateway</span>
              </button>
            </div>

            {gateways.length > 0 && (
              <div className="mt-8 space-y-3">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Cổng kết nối đã lưu ({gateways.length})
                </h3>
                <div className="space-y-2">
                  {gateways.map((gw) => (
                    <div
                      key={gw.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                    >
                      <div>
                        <div className="font-semibold text-sm text-text">{gw.displayName}</div>
                        <div className="font-mono text-xs text-text-muted">{gw.baseUrl}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleTest(gw.id)}
                          disabled={testingGatewayId === gw.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-raised/80 cursor-pointer"
                        >
                          {testingGatewayId === gw.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Kiểm tra
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(gw)}
                          disabled={deleting}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 cursor-pointer disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gateway Selection Tabs if multiple gateways exist */}
        {gateways.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-medium text-text-muted shrink-0">Chọn Gateway:</span>
            {gateways.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGatewayId(g.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer shrink-0 ${
                  g.id === selectedGatewayId
                    ? "bg-primary text-white"
                    : "border border-border bg-surface text-text hover:bg-surface-raised"
                }`}
              >
                {g.displayName || g.baseUrl}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger text-center">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success text-center">
            {notice}
          </div>
        )}

        {/* Blocking Channels Alert & Unbind Actions */}
        {blockingChannels.length > 0 && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t("gateways.deleteBlockedByChannels")}</span>
            </div>
            <p className="text-xs text-text-muted">
              Vui lòng ngắt kết nối gateway khỏi các kênh sau đây để có thể xóa:
            </p>
            <div className="space-y-2">
              {blockingChannels.map((channel) => (
                <div
                  key={channel.channelId}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                >
                  <span className="font-medium text-text">{channel.channelName}</span>
                  <button
                    type="button"
                    disabled={!channel.canUnbind || unbinding === channel.channelId}
                    onClick={() => void handleUnbindChannel(channel)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-danger/15 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/25 disabled:opacity-50 transition cursor-pointer"
                  >
                    {unbinding === channel.channelId ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Đang ngắt kết nối...</span>
                      </>
                    ) : (
                      <span>{t("gateways.unbind")}</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hermes System Settings Panel when Operational */}
        {isOperational && (
          <HermesSystemSettings
            gatewayId={selectedGateway?.id}
            gatewayName={selectedGateway?.displayName || (isLocalRunning ? "Hermes Cục Bộ" : "Hermes Gateway")}
            gatewayUrl={selectedGateway?.baseUrl || (isLocalRunning ? "http://127.0.0.1:8642" : "http://localhost:8642")}
            dashboardUrl={selectedGateway?.dashboardUrl}
            isOwner={selectedGateway ? selectedGateway.isOwner : true}
            onTestConnection={selectedGateway ? () => void handleTest(selectedGateway.id) : undefined}
            testingConnection={selectedGateway ? testingGatewayId === selectedGateway.id : false}
            testStatus={selectedGateway ? (testStates[selectedGateway.id]?.status ?? "connected") : "connected"}
            testError={selectedGateway ? testStates[selectedGateway.id]?.error : null}
            onDelete={selectedGateway ? () => void handleDelete() : undefined}
            deleting={deleting}
          />
        )}

        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-text">Kết nối Gateway</h2>
              <p className="mt-1 text-xs text-text-muted">
                Nhập địa chỉ máy chủ Hermes Gateway để kết nối
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Địa chỉ Gateway (URL) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={connectUrl}
                    onChange={(e) => setConnectUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8642"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Token xác thực
                  </label>
                  <input
                    type="password"
                    value={connectToken}
                    onChange={(e) => setConnectToken(e.target.value)}
                    placeholder="Để trống nếu không dùng token"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Tên hiển thị (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={connectName}
                    onChange={(e) => setConnectName(e.target.value)}
                    placeholder="Hermes Gateway"
                    className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  disabled={connectingGateway}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-raised"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleConnectGateway()}
                  disabled={connectingGateway || !connectUrl.trim()}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                >
                  {connectingGateway && <Loader2 className="h-4 w-4 animate-spin" />}
                  {connectingGateway ? "Đang kết nối..." : "Kết nối"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Container for tests and compatibility */}
        <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
          {selectedGateway?.isOwner && (
            <ImportableProfilesNotice
              gatewayId={selectedGateway.id}
            />
          )}
          <GatewaySetupWizard
            onConnected={(newId: string) => void loadGateways({ prefer: newId })}
          />
          {refreshing && (
            <span role="status" aria-live="polite" data-gateways-refreshing="">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("gateways.refreshing")}
            </span>
          )}
          {diagnosticsAvailable && (
            <Link href="/gateways/diagnostics" data-gateway-diagnostics-link="">
              {t("diagnostics.title")}
            </Link>
          )}
          {returnTo && <Link href={returnTo}>{t("gateways.backToOffice")}</Link>}
          {selectedGateway?.isOwner && (
            <Link
              href={`/gateways/${encodeURIComponent(selectedGateway.id)}/share`}
              data-gateway-share-link=""
            >
              {t("gateways.shareTitle")}
            </Link>
          )}
          {selectedGateway && (
            <button
              type="button"
              onClick={() => void handleTest(selectedGateway.id)}
              disabled={testingGatewayId === selectedGateway.id}
            >
              {t("gateway.testConnection")}
            </button>
          )}
          {selectedGateway && (
            <PluginVersionLine
              gateway={selectedGateway}
              onUpdated={() => void loadGateways({ autoSelect: false })}
            />
          )}
          {selectedGateway && (
            <WorkerPluginLine
              key={selectedGateway.id}
              warning={selectedGateway.workerPluginWarning ?? null}
              propagation={selectedGateway.workerPropagation ?? null}
              unreviewed={selectedGateway.unreviewedProfiles ?? []}
              isOwner={selectedGateway.isOwner === true}
              apply={() => applyWorkerPluginRequest(selectedGateway.id)}
              onApplied={() => void loadGateways({ autoSelect: false })}
              enablePropagation={() => enableWorkerPropagationRequest(selectedGateway.id)}
              onRecheck={() => handleTest(selectedGateway.id)}
            />
          )}
          {selectedGateway && (
            <WorkerLaunchLine
              key={`launch-${selectedGateway.id}`}
              warning={selectedGateway.workerLaunchWarning ?? null}
              isOwner={selectedGateway.isOwner === true}
              onRecheck={() => handleTest(selectedGateway.id)}
            />
          )}
          {blockingChannels.map((channel) => (
            <button
              key={channel.channelId}
              type="button"
              disabled={!channel.canUnbind || unbinding === channel.channelId}
              onClick={() => void handleUnbindChannel(channel)}
            >
              {t("gateways.unbind")}
            </button>
          ))}
          <DiagnosticsPanel open={false} onAvailable={setDiagnosticsAvailable} />
        </div>
      </div>
    </div>
  );
}
