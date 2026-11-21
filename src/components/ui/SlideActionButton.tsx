"use client";

import { useState } from "react";
import { Presentation, ExternalLink, Check, Copy } from "lucide-react";
import { isSlideUrl } from "@/lib/slide-links";

interface SlideActionButtonProps {
  href: string;
  label?: string;
  compact?: boolean;
}

export default function SlideActionButton({
  href,
  label = "Mở Slide Động",
  compact = false,
}: SlideActionButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!isSlideUrl(href)) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(href, "_blank", "noopener,noreferrer");
  };

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 ml-2 align-middle">
        <button
          type="button"
          onClick={handleOpen}
          title={label}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors border border-primary/30"
        >
          <Presentation className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          title="Sao chép link slide"
          className="p-1 text-text-muted hover:text-text rounded hover:bg-surface-raised transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
        </button>
      </span>
    );
  }

  return (
    <div className="my-2 p-2.5 rounded-lg border border-primary/30 bg-primary/10 flex items-center justify-between gap-3 not-prose">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-md bg-primary/20 text-primary shrink-0">
          <Presentation className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-text truncate">{label}</div>
          <div className="text-[11px] text-text-muted truncate font-mono">{href}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-surface hover:bg-surface-raised text-text border border-border transition-colors"
          title="Sao chép đường dẫn"
        >
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Đã chép" : "Chép link"}</span>
        </button>
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span>Trình chiếu</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
