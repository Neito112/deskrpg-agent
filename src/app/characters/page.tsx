"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

import { useT } from "@/lib/i18n";
import MyCharacterForm from "./MyCharacterForm";
import RubberHoseSettingsCard from "@/components/rubber-hose/RubberHoseSettingsCard";
import { useRubberHoseTheme } from "@/lib/rubber-hose/theme-context";

export default function CharactersPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg text-text">
          {t("common.loading")}
        </div>
      }
    >
      <CharactersPageInner />
    </Suspense>
  );
}

function CharactersPageInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinChannel = searchParams.get("joinChannel");
  const { config, toggleMaster } = useRubberHoseTheme();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="theme-web workspace-page">
      <div className="workspace-page-inner">
        {/* Header & Rubber Hose Master Switch embedded directly inside My Character tab */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/70">
          <div>
            <h1 className="text-3xl font-bold text-text flex items-center gap-3">
              {t("characters.title")}
              {config.enabled && (
                <span className="rh-comic-sfx text-xs">1930s CARTOON</span>
              )}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Quản lý danh tính nhân vật văn phòng và kích hoạt giao diện hoạt họa cổ điển Rubber Hose.
            </p>
          </div>

          {/* Rubber Hose Activation Controls directly in "Nhân vật của tôi" */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={toggleMaster}
              data-rh-ignore="true"
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs shadow-sm transition-all ${
                config.enabled
                  ? "bg-[#251d16] text-[#fbe7c0] hover:bg-[#3d2e23] border-2 border-[#251d16]"
                  : "bg-surface text-text hover:bg-surface-raised border border-border"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  config.enabled ? "bg-emerald-400 animate-pulse" : "bg-text-dim"
                }`}
              />
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {config.enabled ? "ĐANG BẬT RUBBER HOSE UI" : "KÍCH HOẠT RUBBER HOSE UI"}
            </button>

            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              data-rh-ignore="true"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-surface border border-border hover:bg-surface-raised text-text transition-colors"
              title="Tùy chọn biến đổi UI từng phần"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Tùy chỉnh UI</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5 text-text-dim" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-text-dim" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Customization Details */}
        {showAdvanced && (
          <div className="mb-6 animate-in fade-in duration-200">
            <RubberHoseSettingsCard onClose={() => setShowAdvanced(false)} />
          </div>
        )}

        {/* Character Form (Appearance Lookbook & 3D Preview) */}
        <MyCharacterForm
          onSaved={() => {
            if (joinChannel) router.push(`/game?channelId=${encodeURIComponent(joinChannel)}`);
          }}
        />
      </div>
    </div>
  );
}
