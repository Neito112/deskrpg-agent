"use client";

import { useState } from "react";
import { Sparkles, Film, Palette, Check, RefreshCw, Layers, Sliders, Type, ExternalLink } from "lucide-react";
import { useRubberHoseTheme } from "@/lib/rubber-hose/theme-context";

interface RubberHoseSettingsCardProps {
  className?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export default function RubberHoseSettingsCard({
  className = "",
  isModal = false,
  onClose,
}: RubberHoseSettingsCardProps) {
  const { config, updateConfig, toggleMaster, applyPreset, resetConfig } = useRubberHoseTheme();
  const [testBopCount, setTestBopCount] = useState(0);

  const sections = [
    {
      key: "all" as const,
      label: "Toàn bộ hệ thống (Global Layout)",
      desc: "Nền giấy parchment cổ điển, viền mực đậm 1930s, màu sắc hoạt hình cho toàn bộ DeskRPG.",
      icon: Layers,
    },
    {
      key: "buttons" as const,
      label: "Nút bấm & Bộ điều khiển (Buttons & Controls)",
      desc: "Hiệu ứng nảy đàn hồi (squash & stretch), viền mực đậm, nút bấm dạng cartoon pill.",
      icon: Sliders,
    },
    {
      key: "header" as const,
      label: "Thanh điều hướng & Header",
      desc: "Thanh trên cùng văn phòng 3D, thanh bên Workspace Shell, các menu tab.",
      icon: Palette,
    },
    {
      key: "chat" as const,
      label: "Khung trò chuyện & Chat (Conversation)",
      desc: "Khung chat NPC, bong bóng tin nhắn truyện tranh, ô nhập thoại cổ điển.",
      icon: Sparkles,
    },
    {
      key: "modals" as const,
      label: "Cửa sổ nổi & Bảng cài đặt (Modals & Dialogs)",
      desc: "Cửa sổ quản lý hồ sơ, tuyển dụng bot, sandbox settings, bảng thông tin.",
      icon: Layers,
    },
    {
      key: "cards" as const,
      label: "Thẻ nhân viên & Danh sách (Cards & Roster)",
      desc: "Thẻ hồ sơ nhân viên, danh sách bot, thẻ bảng công việc kanban.",
      icon: Palette,
    },
    {
      key: "font" as const,
      label: "Font chữ Hoạt họa (Itim / Mali / Patrick Hand)",
      desc: "Phông chữ hoạt hình truyện tranh cổ điển những năm 1930s (chuẩn 100% tiếng Việt có dấu, không lỗi font).",
      icon: Type,
    },
    {
      key: "filmEffect" as const,
      label: "Hiệu ứng Cuộn phim cổ điển (Film Reel & Vignette)",
      desc: "Lớp phủ hạt phim (film grain), bóng mờ góc ống kính máy quay cổ và rung nhẹ.",
      icon: Film,
    },
  ];

  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all ${className}`}
      style={{
        borderColor: config.enabled ? "var(--rh-ink, #251d16)" : undefined,
        backgroundColor: config.enabled ? "var(--rh-cream, #fbe7c0)" : undefined,
      }}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎪</span>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              Phong cách Giao diện Hoạt hình Rubber Hose 1930s
              <span className="rh-comic-sfx text-xs">HOT!</span>
            </h2>
          </div>
          <p className="text-xs text-text-secondary">
            Tích hợp bộ công cụ{" "}
            <a
              href="https://github.com/Neito112/rubber-hose-ui"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              Neito112/rubber-hose-ui
              <ExternalLink className="w-3 h-3" />
            </a>{" "}
            • Phong cách hoạt họa cổ điển Cuphead / 1930s Cartoon
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMaster}
            data-rh-ignore="true"
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-sm transition-all ${
              config.enabled
                ? "bg-[#251d16] text-[#fbe7c0] hover:bg-[#3d2e23] border-2 border-[#251d16]"
                : "bg-surface-raised text-text hover:bg-surface-raised/80 border border-border"
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full transition-colors ${
                config.enabled ? "bg-emerald-400 animate-pulse" : "bg-text-dim"
              }`}
            />
            {config.enabled ? "ĐANG BẬT RUBBER HOSE" : "BẬT RUBBER HOSE"}
          </button>
        </div>
      </div>

      {/* Presets & Controls */}
      <div className="mt-5 space-y-5">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary mr-1">Cấu hình nhanh:</span>
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className="px-3 py-1 rounded-full text-xs font-semibold border border-border bg-surface hover:bg-surface-raised text-text transition-colors flex items-center gap-1.5"
          >
            🎪 Bật toàn bộ
          </button>
          <button
            type="button"
            onClick={() => applyPreset("buttonsOnly")}
            className="px-3 py-1 rounded-full text-xs font-semibold border border-border bg-surface hover:bg-surface-raised text-text transition-colors flex items-center gap-1.5"
          >
            🎯 Chỉ Nút & Bộ điều khiển
          </button>
          <button
            type="button"
            onClick={() => applyPreset("chatOnly")}
            className="px-3 py-1 rounded-full text-xs font-semibold border border-border bg-surface hover:bg-surface-raised text-text transition-colors flex items-center gap-1.5"
          >
            💬 Chỉ Khung Chat
          </button>
          <button
            type="button"
            onClick={resetConfig}
            className="px-3 py-1 rounded-full text-xs font-semibold border border-border bg-surface hover:bg-surface-raised text-text-muted hover:text-text transition-colors flex items-center gap-1"
            title="Khôi phục mặc định"
          >
            <RefreshCw className="w-3 h-3" />
            Mặc định
          </button>
        </div>

        {/* Granular Section Toggles */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Tùy chọn biến đổi UI từng phần:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map(({ key, label, desc, icon: Icon }) => {
              const active = config.enabled && (config.all || config[key]);
              const isIndependentlyChecked = config[key];

              return (
                <div
                  key={key}
                  onClick={() => {
                    if (key === "all") {
                      updateConfig({ all: !config.all });
                    } else {
                      updateConfig({ [key]: !config[key], all: false });
                    }
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                    active
                      ? "border-text bg-surface-raised/70 shadow-sm"
                      : "border-border/60 bg-surface/50 opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    borderColor: active && config.enabled ? "var(--rh-ink, #251d16)" : undefined,
                  }}
                >
                  <div
                    className={`mt-0.5 p-2 rounded-lg border ${
                      active
                        ? "bg-[#251d16] text-[#fbe7c0] border-[#251d16]"
                        : "bg-surface text-text-muted border-border"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-text truncate">{label}</span>
                      <input
                        type="checkbox"
                        checked={key === "all" ? config.all : isIndependentlyChecked}
                        onChange={() => {}} // Handled by parent div
                        className="w-4 h-4 rounded text-primary focus:ring-primary/40 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1 leading-snug">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Rubber Hose Preview & Playground */}
        <div
          className="rounded-xl border border-dashed p-4 mt-4 transition-colors"
          style={{
            borderColor: config.enabled ? "var(--rh-ink, #251d16)" : "var(--border)",
            backgroundColor: config.enabled ? "var(--rh-paper, #ecd7ac)" : "var(--surface-raised)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text flex items-center gap-1.5">
              <span>🎮</span> Trải nghiệm thử hiệu ứng tương tác:
            </span>
            <span className="text-[11px] text-text-muted">
              {config.enabled ? "Phong cách hoạt họa đang kích hoạt!" : "Bật Rubber Hose để xem hiệu ứng"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Custom Cartoon Click Button */}
            <button
              type="button"
              onClick={() => setTestBopCount((c) => c + 1)}
              className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <span>🥊</span>
              Bấm thử vào tôi! {testBopCount > 0 ? `(Đã bop ${testBopCount} lần!)` : ""}
            </button>

            {/* Comic Stickers */}
            <span className="rh-comic-sfx">BOP!</span>
            <span className="rh-comic-sfx" style={{ color: "#27ae60", transform: "rotate(3deg)" }}>
              SPLAT!
            </span>
            <span className="rh-comic-sfx" style={{ color: "#2980b9", transform: "rotate(-2deg)" }}>
              DING!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
