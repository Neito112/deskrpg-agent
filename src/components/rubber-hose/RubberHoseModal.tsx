"use client";

import { X } from "lucide-react";
import RubberHoseSettingsCard from "./RubberHoseSettingsCard";

interface RubberHoseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RubberHoseModal({ isOpen, onClose }: RubberHoseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-150">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface-raised/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎪</span>
            <span className="font-bold text-sm text-text">Tùy biến Phong cách Rubber Hose 1930s</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <RubberHoseSettingsCard isModal onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
