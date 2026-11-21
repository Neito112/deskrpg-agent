"use client";

import { useEffect, useState } from "react";
import DeskRpgMark from "./DeskRpgMark";

declare global {
  interface Window {
    desktopApp?: {
      isDesktop: boolean;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      toggleFullscreen: () => void;
      isMaximized: () => Promise<boolean>;
      openExternal?: (url: string) => void;
      onStateChanged: (callback: (state: { maximized: boolean; fullscreen: boolean }) => void) => void;
    };
  }
}

export default function AppTitlebar() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [openingHermes, setOpeningHermes] = useState(false);

  const handleOpenHermes = async () => {
    setOpeningHermes(true);
    try {
      const res = await fetch("/api/hermes/dashboard", { method: "POST" });
      const data = await res.json();
      if (data.type === "desktop" && data.ok) {
        return;
      }
      if (data.url) {
        if (window.desktopApp?.openExternal) {
          window.desktopApp.openExternal(data.url);
        } else {
          window.open(data.url, "_blank");
        }
      }
    } catch (err) {
      console.error("Open Hermes error:", err);
    } finally {
      setOpeningHermes(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.desktopApp?.isDesktop) {
      setIsDesktop(true);
      document.documentElement.setAttribute("data-desktop", "true");

      window.desktopApp.isMaximized().then(setIsMaximized);
      window.desktopApp.onStateChanged((state) => {
        setIsMaximized(state.maximized);
      });
    }
  }, []);

  if (!isDesktop) return null;

  return (
    <header
      className="app-titlebar h-8 w-full flex-shrink-0 flex items-center justify-between select-none border-b transition-colors"
      style={{
        backgroundColor: "var(--surface, #faf7ee)",
        borderColor: "var(--border-subtle, #e4ddcc)",
        color: "var(--text, #09223f)",
        zIndex: 9999,
      }}
      onDoubleClick={() => window.desktopApp?.maximize()}
    >
      {/* Brand logo & title */}
      <div className="flex items-center gap-2 px-3 h-full pointer-events-none select-none">
        <span className="flex items-center justify-center">
          <DeskRpgMark size={18} />
        </span>
        <span
          className="text-[11px] font-bold tracking-wider uppercase opacity-85"
          style={{ color: "var(--text, #09223f)" }}
        >
          DeskRPG
        </span>
      </div>

      {/* Drag region filler */}
      <div className="flex-1 h-full app-titlebar cursor-default" />

      {/* Window Controls */}
      <div className="flex items-center h-full app-titlebar-nodrag">
        {/* Quick link to open Hermes UI */}
        <button
          type="button"
          onClick={handleOpenHermes}
          disabled={openingHermes}
          aria-label="Mở giao diện Hermes Agent"
          title="Mở giao diện quản trị Hermes Agent (Dashboard)"
          className="h-full px-2.5 inline-flex items-center gap-1.5 transition-colors cursor-pointer hover:bg-black/5 active:bg-black/10 focus:outline-none text-[11px] font-medium"
          style={{ color: "var(--text-secondary, #3f4346)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
          </svg>
          <span>{openingHermes ? "Đang mở..." : "Hermes UI"}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => window.desktopApp?.minimize()}
          aria-label="Thu nhỏ"
          title="Thu nhỏ"
          className="h-full w-[46px] inline-flex items-center justify-center transition-colors cursor-pointer hover:bg-black/5 active:bg-black/10 focus:outline-none"
          style={{ color: "var(--text-secondary, #3f4346)" }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 5.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => window.desktopApp?.maximize()}
          aria-label={isMaximized ? "Khôi phục cửa sổ" : "Phóng to"}
          title={isMaximized ? "Khôi phục cửa sổ" : "Phóng to"}
          className="h-full w-[46px] inline-flex items-center justify-center transition-colors cursor-pointer hover:bg-black/5 active:bg-black/10 focus:outline-none"
          style={{ color: "var(--text-secondary, #3f4346)" }}
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="3.5" y="1.5" width="6" height="6" stroke="currentColor" strokeWidth="1.1" />
              <path d="M1.5 3.5V9.5H7.5V7.5" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="1.5" y="1.5" width="8" height="8" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => window.desktopApp?.close()}
          aria-label="Đóng"
          title="Đóng"
          className="h-full w-[46px] inline-flex items-center justify-center transition-colors cursor-pointer hover:bg-[#a63d33] hover:text-white active:bg-[#8b3029] focus:outline-none"
          style={{ color: "var(--text-secondary, #3f4346)" }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 1.5L9.5 9.5M9.5 1.5L1.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
