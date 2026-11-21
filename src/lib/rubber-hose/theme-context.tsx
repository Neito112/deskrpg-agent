"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface RubberHoseConfig {
  enabled: boolean;
  all: boolean;
  header: boolean;
  chat: boolean;
  modals: boolean;
  cards: boolean;
  buttons: boolean;
  font: boolean;
  filmEffect: boolean;
}

export const DEFAULT_RUBBER_HOSE_CONFIG: RubberHoseConfig = {
  enabled: false,
  all: true,
  header: true,
  chat: true,
  modals: true,
  cards: true,
  buttons: true,
  font: true,
  filmEffect: true,
};

const STORAGE_KEY = "deskrpg_rubber_hose_theme_v1";

interface RubberHoseContextValue {
  config: RubberHoseConfig;
  updateConfig: (partial: Partial<RubberHoseConfig>) => void;
  toggleMaster: () => void;
  resetConfig: () => void;
  applyPreset: (preset: "all" | "buttonsOnly" | "chatOnly" | "clean") => void;
  isSectionActive: (section: keyof Omit<RubberHoseConfig, "enabled">) => boolean;
}

const RubberHoseContext = createContext<RubberHoseContextValue | null>(null);

function loadStoredConfig(): RubberHoseConfig {
  if (typeof window === "undefined") return DEFAULT_RUBBER_HOSE_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RUBBER_HOSE_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_RUBBER_HOSE_CONFIG, ...parsed };
  } catch {
    return DEFAULT_RUBBER_HOSE_CONFIG;
  }
}

function saveConfigToStorage(config: RubberHoseConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

// Injects the Web Components from rubber-hose-ui
function loadWebComponents() {
  if (typeof window === "undefined") return;
  const scripts = [
    "/rubber-hose/button.js",
    "/rubber-hose/toggle.js",
    "/rubber-hose/checkbox.js",
    "/rubber-hose/slider.js",
    "/rubber-hose/toast.js",
  ];

  for (const src of scripts) {
    if (!document.querySelector(`script[src="${src}"]`)) {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }
  }
}

export function RubberHoseProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RubberHoseConfig>(DEFAULT_RUBBER_HOSE_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = loadStoredConfig();
    setConfig(initial);
    setMounted(true);
  }, []);

  // Sync data attributes to DOM
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    const isEnabled = config.enabled;
    const isAll = isEnabled && config.all;

    const attrs: Record<string, string> = {
      "data-rubber-hose": isEnabled ? "true" : "false",
      "data-rh-all": isAll ? "true" : "false",
      "data-rh-header": isEnabled && (config.all || config.header) ? "true" : "false",
      "data-rh-chat": isEnabled && (config.all || config.chat) ? "true" : "false",
      "data-rh-modals": isEnabled && (config.all || config.modals) ? "true" : "false",
      "data-rh-cards": isEnabled && (config.all || config.cards) ? "true" : "false",
      "data-rh-buttons": isEnabled && (config.all || config.buttons) ? "true" : "false",
      "data-rh-font": isEnabled && (config.all || config.font) ? "true" : "false",
      "data-rh-film": isEnabled && config.filmEffect ? "true" : "false",
    };

    for (const [key, value] of Object.entries(attrs)) {
      root.setAttribute(key, value);
      body.setAttribute(key, value);
    }

    if (isEnabled) {
      loadWebComponents();
    }
  }, [config, mounted]);

  // Sync across tabs
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setConfig((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updateConfig = useCallback((partial: Partial<RubberHoseConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfigToStorage(next);
      return next;
    });
  }, []);

  const toggleMaster = useCallback(() => {
    setConfig((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      saveConfigToStorage(next);
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_RUBBER_HOSE_CONFIG);
    saveConfigToStorage(DEFAULT_RUBBER_HOSE_CONFIG);
  }, []);

  const applyPreset = useCallback((preset: "all" | "buttonsOnly" | "chatOnly" | "clean") => {
    let next: RubberHoseConfig;
    switch (preset) {
      case "all":
        next = {
          enabled: true,
          all: true,
          header: true,
          chat: true,
          modals: true,
          cards: true,
          buttons: true,
          font: true,
          filmEffect: true,
        };
        break;
      case "buttonsOnly":
        next = {
          enabled: true,
          all: false,
          header: false,
          chat: false,
          modals: false,
          cards: false,
          buttons: true,
          font: true,
          filmEffect: false,
        };
        break;
      case "chatOnly":
        next = {
          enabled: true,
          all: false,
          header: false,
          chat: true,
          modals: false,
          cards: false,
          buttons: true,
          font: true,
          filmEffect: false,
        };
        break;
      case "clean":
        next = {
          ...DEFAULT_RUBBER_HOSE_CONFIG,
          enabled: false,
        };
        break;
    }
    setConfig(next);
    saveConfigToStorage(next);
  }, []);

  const isSectionActive = useCallback(
    (section: keyof Omit<RubberHoseConfig, "enabled">) => {
      if (!config.enabled) return false;
      if (config.all) return true;
      return Boolean(config[section]);
    },
    [config],
  );

  const value = useMemo(
    () => ({
      config,
      updateConfig,
      toggleMaster,
      resetConfig,
      applyPreset,
      isSectionActive,
    }),
    [config, updateConfig, toggleMaster, resetConfig, applyPreset, isSectionActive],
  );

  return (
    <RubberHoseContext.Provider value={value}>
      {children}
      {/* Vintage 1930s Film Overlay */}
      {config.enabled && config.filmEffect && (
        <div className="rubber-hose-film-layer" aria-hidden="true">
          <div className="rubber-hose-vignette" />
          <div className="rubber-hose-grain" />
        </div>
      )}
    </RubberHoseContext.Provider>
  );
}

export function useRubberHoseTheme() {
  const ctx = useContext(RubberHoseContext);
  if (!ctx) {
    throw new Error("useRubberHoseTheme must be used within a RubberHoseProvider");
  }
  return ctx;
}
