"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useT } from "@/lib/i18n";
import Toast from "@/components/ui/Toast";
import { quickStartGamePath } from "@/lib/quick-start";

/**
 * Onboarding Guide displayed when no gateways exist or during first setup.
 * Allows choosing between Local Embedded Hermes (Default) and External/Remote Gateway.
 */
const TOAST_MS = 3000;

export default function GatewayOnboardingGuide() {
  const t = useT();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(toastTimer.current ?? undefined), []);

  const fail = useCallback((message: string) => {
    clearTimeout(toastTimer.current ?? undefined);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const quickStart = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      const response = await fetch("/api/quick-start", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload?.channelId !== "string") {
        fail(t("quickStart.failed") || "Không thể khởi động Hermes tự động");
        return;
      }
      router.push(quickStartGamePath({ channelId: payload.channelId }));
    } catch {
      fail(t("quickStart.failed") || "Không thể kết nối đến máy chủ");
    } finally {
      setRunning(false);
    }
  }, [fail, router, running, t]);

  const scrollToRemoteForm = useCallback(() => {
    const formElement = document.querySelector("form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <section className="mb-8 rounded-2xl border border-primary/40 bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-text">
          Chọn Chế Độ Vận Hành Hermes Cho DeskRPG
        </h2>
        <p className="mt-1.5 text-sm text-text-muted">
          DeskRPG có thể tự vận hành Hermes Desktop tích hợp ngay trên máy tính hoặc liên kết với Gateway máy chủ từ xa. Bạn có thể dễ dàng chuyển đổi bất kỳ lúc nào trong Cài đặt.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Option 1: Embedded Local Hermes */}
        <div className="relative flex flex-col justify-between rounded-xl border-2 border-primary bg-primary/5 p-5 transition hover:shadow-md">
          <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
            Khuyên dùng
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🖥️</span>
              <h3 className="text-base font-bold text-text">Hermes Tích Hợp Cục Bộ</h3>
            </div>
            <p className="mt-2 text-sm text-text-muted">
              Tự động cài đặt và móc nối trực tiếp đến bản Hermes Desktop chính thức trong cùng thư mục. Hoạt động độc lập, không cần tab trình duyệt ngoài.
            </p>
            <div className="mt-4 rounded-lg bg-surface-raised/80 p-3 text-xs space-y-1.5">
              <p className="font-semibold text-text">⚡ Đi kèm sẵn 2 nhân viên AI mặc định:</p>
              <p>• <strong className="text-primary">Tuyển Nhân Sự:</strong> Chat mô tả công việc để tự động tạo nhân viên tương xứng.</p>
              <p>• <strong className="text-primary">Đào Tạo Nhân Sự:</strong> Huấn luyện, gom kiến thức, nạp skill, tool, MCP nâng cấp bot.</p>
            </div>
          </div>
          <div className="mt-5">
            <button
              type="button"
              onClick={quickStart}
              disabled={running}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {running ? "Đang khởi động..." : "🚀 Kích Hoạt & Vào Văn Phòng Ngay"}
            </button>
          </div>
        </div>

        {/* Option 2: Custom Remote Gateway */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-raised/40 p-5 transition hover:border-primary/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌐</span>
              <h3 className="text-base font-bold text-text">Kết Nối Gateway Từ Xa</h3>
            </div>
            <p className="mt-2 text-sm text-text-muted">
              Dành cho trường hợp bạn triển khai Hermes Agent trên máy chủ VPS, Docker, hoặc một thiết bị độc lập khác trong mạng nội bộ.
            </p>
            <div className="mt-4 rounded-lg bg-surface p-3 text-xs text-text-muted space-y-1">
              <p>• Kết nối qua URL Gateway (ví dụ <code>https://...:8642</code>)</p>
              <p>• Xác thực bằng Gateway Token của bạn</p>
              <p>• Không chiếm dụng tài nguyên máy tính cục bộ</p>
            </div>
          </div>
          <div className="mt-5">
            <button
              type="button"
              onClick={scrollToRemoteForm}
              className="w-full rounded-lg border border-border bg-surface py-2.5 text-sm font-semibold text-text hover:bg-surface-raised"
            >
              Điền Thông Tin Gateway Ngoài ↓
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-text-muted">
        <span>💡 Bất kể lựa chọn cách nào, bạn đều có thể đổi lại bất cứ lúc nào trong danh sách Gateway.</span>
        <div className="flex gap-3">
          <Link href="/characters" className="text-primary hover:underline">
            Tùy chỉnh nhân vật
          </Link>
          <span>•</span>
          <Link href="/channels" className="text-primary hover:underline">
            Quản lý văn phòng
          </Link>
        </div>
      </div>

      <Toast message={toast ?? ""} visible={toast !== null} />
    </section>
  );
}
