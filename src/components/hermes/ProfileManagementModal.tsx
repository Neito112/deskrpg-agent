"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import HermesProfileList from "./HermesProfileList";
import NpcHireWizard from "./NpcHireWizard";
import SandboxSettingsCard from "./SandboxSettingsCard";
import { loadGatewayPluginState, type GatewayPluginState } from "@/app/profiles/plugin-state";
import type { PluginStatus } from "@/lib/hermes/plugin-capability";

interface ProfileManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayId: string;
  initialProfileName?: string | null;
  initialView?: "list" | "detail" | "hire";
  onProfileUpdated?: () => void;
}

export default function ProfileManagementModal({
  isOpen,
  onClose,
  gatewayId,
  initialProfileName = null,
  initialView = "list",
  onProfileUpdated,
}: ProfileManagementModalProps) {
  const t = useT();
  const [view, setView] = useState<"list" | "detail" | "hire">(initialView);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(initialProfileName);
  const [pluginState, setPluginState] = useState<GatewayPluginState | null>(null);
  const [allNames, setAllNames] = useState<string[]>([]);

  // Update view/profile when opened with specific initial props
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setSelectedProfile(initialProfileName);
    }
  }, [isOpen, initialView, initialProfileName]);

  const loadData = useCallback(async () => {
    if (!gatewayId) return;
    try {
      const state = await loadGatewayPluginState(gatewayId);
      setPluginState(state);

      const res = await fetch(`/api/gateways/${gatewayId}/profiles`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.profiles)) {
        setAllNames(data.profiles.map((p: { profileName: string }) => p.profileName));
      }
    } catch (err) {
      console.warn("[ProfileManagementModal] Failed to load gateway plugin state:", err);
    }
  }, [gatewayId]);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const pluginStatus: PluginStatus = pluginState?.pluginStatus ?? "unknown";
  const dashboardUrl = pluginState?.row?.dashboardUrl ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-150">
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-raised/40">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button
                type="button"
                onClick={() => setView("list")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                title="Quay lại danh sách hồ sơ"
              >
                <ArrowLeft size={14} />
                <span>Quay lại</span>
              </button>
            )}
            <h2 className="text-base font-semibold text-text">
              {view === "list" && "Quản lý nhân sự & Hồ sơ Hermes"}
              {view === "detail" && `Cài đặt hồ sơ & Sandbox: ${selectedProfile || ""}`}
              {view === "hire" && "Tuyển nhân viên mới"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {view === "list" && (
            <HermesProfileList
              gatewayId={gatewayId}
              canRegister={true}
              onCreated={() => {
                void loadData();
                onProfileUpdated?.();
              }}
              onManageProfile={(name) => {
                setSelectedProfile(name);
                setView("detail");
              }}
              onHireClick={() => {
                setView("hire");
              }}
            />
          )}

          {view === "detail" && selectedProfile && (
            <div className="space-y-6">
              {/* Sandbox Card */}
              <SandboxSettingsCard profileName={selectedProfile} />

              {/* Hire/Edit Wizard embedded in step 2 (Identity & instructions) */}
              <div className="rounded-xl border border-border bg-surface p-5">
                <NpcHireWizard
                  title={`Cấu hình tính cách & Prompt: ${selectedProfile}`}
                  gatewayId={gatewayId}
                  pluginStatus={pluginStatus}
                  localDiscovery={false}
                  existingProfiles={allNames}
                  initialProfile={selectedProfile}
                  dashboardUrl={dashboardUrl}
                  canManageProviderAuth={pluginState?.row?.isOwner ?? true}
                  onDone={() => {
                    void loadData();
                    onProfileUpdated?.();
                    setView("list");
                  }}
                />
              </div>
            </div>
          )}

          {view === "hire" && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <NpcHireWizard
                gatewayId={gatewayId}
                pluginStatus={pluginStatus}
                localDiscovery={false}
                existingProfiles={allNames}
                dashboardUrl={dashboardUrl}
                canManageProviderAuth={pluginState?.row?.isOwner ?? true}
                onProfileCreated={() => {
                  void loadData();
                  onProfileUpdated?.();
                }}
                onDone={() => {
                  setView("list");
                  void loadData();
                  onProfileUpdated?.();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
