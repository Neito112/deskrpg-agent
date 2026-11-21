"use client";

import React, { useEffect, useState, useRef } from "react";
import { useT } from "@/lib/i18n";
import { Sparkles, LogIn, X, CheckCircle2, RefreshCw } from "lucide-react";

const DISMISS_KEY = "deskrpg_gemini_setup_dismissed_session";

export default function GeminiSetupBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [connected, setConnected] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if dismissed in this browser/app session
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (dismissed === "1") return;
    }

    let mounted = true;
    async function checkStatus() {
      try {
        const res = await fetch("/api/settings/gemini-bridge");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.ok && data.bridge) {
            const status = data.bridge.status;
            // Only prompt if account is not yet connected
            if (status === "needs_login" || status === "not_started") {
              setVisible(true);
            }
          }
        }
      } catch {
        // ignore errors
      }
    }

    checkStatus();

    return () => {
      mounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      const res = await fetch("/api/settings/gemini-bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.bridge?.status === "connected") {
          onConnectedSuccess();
          return;
        }
      }
    } catch {
      // ignore
    }

    // Start polling every 3 seconds to detect when user finishes login in the browser window
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const checkRes = await fetch("/api/settings/gemini-bridge");
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.ok && checkData.bridge?.status === "connected") {
            onConnectedSuccess();
          }
        }
      } catch {
        // ignore
      }
    }, 3000);
  };

  const onConnectedSuccess = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setLoggingIn(false);
    setConnected(true);
    setTimeout(() => {
      setVisible(false);
    }, 2200);
  };

  const handleDismiss = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "1");
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Setup notice"
      className="w-full bg-surface-raised border-b border-border/80 px-4 py-2.5 flex items-center justify-between text-xs transition-all duration-300 select-none shadow-sm z-40"
      style={{
        backgroundColor: "var(--surface-raised, #f6f1e5)",
        borderColor: "var(--border, #dfd7c5)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-3">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {connected ? (
            <CheckCircle2 size={14} className="text-success" />
          ) : (
            <Sparkles size={14} className="text-primary" />
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 truncate">
          <span className="font-semibold text-text shrink-0">
            {connected
              ? t("banner.geminiSetup.connected")
              : t("banner.geminiSetup.title")}
          </span>
          <span className="text-text-muted truncate hidden sm:inline">•</span>
          <span className="text-text-secondary truncate">
            {t("banner.geminiSetup.desc")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!connected && (
          <>
            <button
              type="button"
              onClick={handleLogin}
              disabled={loggingIn}
              className="py-1 px-3 rounded font-medium bg-primary text-bg hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {loggingIn ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>{t("banner.geminiSetup.opening")}</span>
                </>
              ) : (
                <>
                  <LogIn size={12} />
                  <span>{t("banner.geminiSetup.loginBtn")}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="py-1 px-2.5 rounded text-text-muted hover:text-text hover:bg-surface transition-colors"
            >
              {t("banner.geminiSetup.laterBtn")}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="p-1 rounded text-text-muted hover:text-text hover:bg-surface transition-colors ml-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
