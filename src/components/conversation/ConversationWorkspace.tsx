"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useT } from "@/lib/i18n";

const MIN_NAV_WIDTH = 180;
const MAX_NAV_WIDTH = 500;
const DEFAULT_NAV_WIDTH = 260;

type Props = {
  navigator: ReactNode;
  conversation: ReactNode;
  conversationWidth: number;
  navigatorWidth?: number;
  onNavigatorWidthChange?: (width: number) => void;
  children: ReactNode;
  inactive?: boolean;
};

/** Three-column frame. The CSS variables also constrain the fixed Three.js presentation. */
export default function ConversationWorkspace({
  navigator,
  conversation,
  conversationWidth,
  navigatorWidth: navigatorWidthProp,
  onNavigatorWidthChange,
  children,
  inactive = false,
}: Props) {
  const t = useT();
  const [mobilePanel, setMobilePanel] = useState<"navigator" | "conversation" | null>(null);
  const [conversationCollapsed, setConversationCollapsed] = useState(false);
  const navigatorButtonRef = useRef<HTMLButtonElement>(null);
  const conversationButtonRef = useRef<HTMLButtonElement>(null);

  const [internalNavWidth, setInternalNavWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_NAV_WIDTH;
    try {
      const saved = localStorage.getItem("deskrpg_workspace_nav_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_NAV_WIDTH && parsed <= MAX_NAV_WIDTH) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_NAV_WIDTH;
  });

  const currentNavWidth = navigatorWidthProp ?? internalNavWidth;

  const setNavWidth = useCallback(
    (nextWidth: number) => {
      const clamped = Math.min(MAX_NAV_WIDTH, Math.max(MIN_NAV_WIDTH, nextWidth));
      setInternalNavWidth(clamped);
      onNavigatorWidthChange?.(clamped);
      try {
        localStorage.setItem("deskrpg_workspace_nav_width", String(clamped));
      } catch {}
    },
    [onNavigatorWidthChange],
  );

  // Set CSS variables on :root so they cascade to fixed-position descendants (office-presentation)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--workspace-nav-width", `${currentNavWidth}px`);
    root.style.setProperty(
      "--conversation-pane-width",
      conversationCollapsed ? "0px" : `${conversationWidth}px`,
    );
    return () => {
      root.style.removeProperty("--workspace-nav-width");
      root.style.removeProperty("--conversation-pane-width");
    };
  }, [conversationCollapsed, conversationWidth, currentNavWidth]);

  // Drag handle for left navigator column
  const [isNavDragging, setIsNavDragging] = useState(false);
  const navWidthRef = useRef(currentNavWidth);
  useEffect(() => {
    navWidthRef.current = currentNavWidth;
  }, [currentNavWidth]);

  const handleNavMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsNavDragging(true);
      const startX = e.clientX;
      const startWidth = navWidthRef.current;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = e.clientX - startX;
        setNavWidth(startWidth + delta);
      };

      const handleMouseUp = () => {
        setIsNavDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [setNavWidth],
  );

  const closeMobilePanel = useCallback(() => {
    const closing = mobilePanel;
    setMobilePanel(null);
    queueMicrotask(() => {
      if (closing === "navigator") navigatorButtonRef.current?.focus();
      if (closing === "conversation") conversationButtonRef.current?.focus();
    });
  }, [mobilePanel]);

  useEffect(() => {
    if (!mobilePanel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobilePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMobilePanel, mobilePanel]);

  return (
    <div
      data-conversation-workspace="true"
      data-inactive={inactive}
      aria-hidden={inactive || undefined}
      inert={inactive || undefined}
      style={
        {
          "--workspace-nav-width": `${currentNavWidth}px`,
          "--conversation-pane-width": conversationCollapsed ? "0px" : `${conversationWidth}px`,
        } as CSSProperties
      }
      className="conversation-workspace fixed inset-x-0 bottom-0 top-[var(--game-header-height,48px)] z-0 grid min-h-0 overflow-hidden"
    >
      <div
        data-workspace-navigator="true"
        data-drawer-open={mobilePanel === "navigator"}
        role={mobilePanel === "navigator" ? "dialog" : undefined}
        aria-modal={mobilePanel === "navigator" ? true : undefined}
        className="workspace-navigator relative min-h-0 min-w-0 flex"
      >
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          {navigator}
        </div>
        {/* Resize handle between navigator and map (Desktop only) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Điều chỉnh độ rộng danh sách"
          title="Kéo để điều chỉnh độ rộng cột danh sách"
          onMouseDown={handleNavMouseDown}
          className={`hidden md:flex w-2.5 -mr-1.5 cursor-col-resize z-20 items-center justify-center transition-colors select-none group ${
            isNavDragging ? "bg-primary/50" : "hover:bg-primary/30"
          }`}
        >
          <div
            className={`w-0.5 h-8 rounded transition-colors ${
              isNavDragging ? "bg-primary" : "bg-text-dim group-hover:bg-primary"
            }`}
          />
        </div>
      </div>
      <main
        data-workspace-map="true"
        aria-label={t("workspace.map")}
        className="relative min-h-0 min-w-0 overflow-hidden"
      >
        {children}
      </main>
      <div
        data-workspace-conversation="true"
        data-drawer-open={mobilePanel === "conversation"}
        data-collapsed={conversationCollapsed}
        role={mobilePanel === "conversation" ? "dialog" : undefined}
        aria-modal={mobilePanel === "conversation" ? true : undefined}
        className="workspace-conversation relative z-20 min-h-0 min-w-0 border-l border-border bg-bg"
      >
        {conversation}
      </div>
      <button
        type="button"
        aria-label={t(
          conversationCollapsed
            ? "workspace.conversation.expand"
            : "workspace.conversation.collapse",
        )}
        aria-expanded={!conversationCollapsed}
        className="workspace-conversation-collapse"
        style={{ right: conversationCollapsed ? 0 : conversationWidth }}
        onClick={() => setConversationCollapsed((collapsed) => !collapsed)}
      >
        {conversationCollapsed ? "◀" : "▶"}
      </button>
      {mobilePanel && (
        <button
          type="button"
          aria-label={t("workspace.drawer.close")}
          className="workspace-drawer-backdrop"
          onClick={closeMobilePanel}
        />
      )}
      <button
        type="button"
        ref={navigatorButtonRef}
        aria-expanded={mobilePanel === "navigator"}
        className="workspace-drawer-toggle workspace-navigator-toggle"
        onClick={() => setMobilePanel((current) => (current === "navigator" ? null : "navigator"))}
      >
        {t("workspace.drawer.navigator")}
      </button>
      <button
        type="button"
        ref={conversationButtonRef}
        aria-expanded={mobilePanel === "conversation"}
        className="workspace-drawer-toggle workspace-conversation-toggle"
        onClick={() =>
          setMobilePanel((current) => (current === "conversation" ? null : "conversation"))
        }
      >
        {t("workspace.drawer.conversation")}
      </button>
    </div>
  );
}
