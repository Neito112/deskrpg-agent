"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Folder,
  FolderOpen,
  HelpCircle,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import type { ReferenceFileInfo } from "@/lib/hermes/sandbox-manager";

interface SandboxSettingsCardProps {
  profileName: string;
  displayName?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function SandboxSettingsCard({ profileName, displayName }: SandboxSettingsCardProps) {
  const [sandboxDir, setSandboxDir] = useState("");
  const [fileNamingConvention, setFileNamingConvention] = useState("");
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFileInfo[]>([]);
  const [defaultWorkspaceDir, setDefaultWorkspaceDir] = useState("");
  const [existsOnDisk, setExistsOnDisk] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConfig = useCallback(async () => {
    if (!profileName) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(profileName)}/sandbox`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Không thể tải cấu hình sandbox");

      setSandboxDir(data.sandboxDir || "");
      setFileNamingConvention(data.fileNamingConvention || "");
      setReferenceFiles(Array.isArray(data.referenceFiles) ? data.referenceFiles : []);
      setDefaultWorkspaceDir(data.defaultWorkspaceDir || "");
      setExistsOnDisk(Boolean(data.existsOnDisk));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [profileName]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/profiles/${encodeURIComponent(profileName)}/sandbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandboxDir: sandboxDir.trim(),
          fileNamingConvention: fileNamingConvention.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Lưu thất bại");

      setExistsOnDisk(Boolean(data.existsOnDisk));
      setNotice("Đã lưu và đồng bộ cấu hình Sandbox vào hồ sơ bot thành công!");
      setTimeout(() => setNotice(""), 4500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/profiles/${encodeURIComponent(profileName)}/sandbox`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Tải lên tệp mẫu thất bại");

      setReferenceFiles(data.referenceFiles || []);
      setNotice(`Đã nạp file mẫu "${file.name}" cho bot tham chiếu!`);
      setTimeout(() => setNotice(""), 4500);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa file mẫu "${fileName}"?`)) return;

    setDeletingFile(fileName);
    setError("");
    try {
      const res = await fetch(
        `/api/profiles/${encodeURIComponent(profileName)}/sandbox/files?fileName=${encodeURIComponent(fileName)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Xóa thất bại");

      setReferenceFiles(data.referenceFiles || []);
      setNotice(`Đã xóa file mẫu "${fileName}".`);
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingFile(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 flex items-center justify-center gap-2 text-text-muted text-sm">
        <Loader2 className="animate-spin" size={16} />
        <span>Đang tải thiết lập Sandbox của nhân viên...</span>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderOpen size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">
              Thiết Lập Sandbox & Thư Mục Nhả File
            </h2>
            <p className="text-xs text-text-muted">
              Định hướng nơi lưu trữ sản phẩm xuất ra, quy tắc đặt tên và tài liệu mẫu cho{" "}
              <strong className="text-text">{displayName || profileName}</strong>.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs text-danger font-medium">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-3.5 py-2 text-xs text-success font-medium flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          <span>{notice}</span>
        </div>
      )}

      {/* 1. Thư mục nhả file */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
            <Folder size={14} className="text-primary" />
            <span>Thư mục làm việc / Nhả file (Output Sandbox)</span>
          </label>
          {defaultWorkspaceDir && (
            <button
              type="button"
              onClick={() => setSandboxDir(defaultWorkspaceDir)}
              className="text-[11px] font-semibold text-primary hover:underline transition-colors"
            >
              Chọn thư mục mặc định DeskRPG
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={sandboxDir}
            onChange={(e) => setSandboxDir(e.target.value)}
            placeholder="Để trống nếu chưa có (Ví dụ: C:\CongViec\ThietKe_Outputs hoặc D:\Workspace)"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-text-muted gap-1">
          <span>
            {sandboxDir.trim() ? (
              existsOnDisk ? (
                <span className="text-success font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Thư mục đã tồn tại và sẵn sàng hoạt động trên máy
                </span>
              ) : (
                <span className="text-warning font-medium">
                  Thư mục sẽ được tự động tạo khi bấm Lưu
                </span>
              )
            ) : (
              <span>
                (Đang để trống - bot sẽ lưu vào thư mục làm việc mặc định hoặc hỏi sếp khi cần xuất file)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 2. Quy chuẩn đặt tên file */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
          <FileCheck size={14} className="text-primary" />
          <span>Mô tả quy chuẩn đặt tên file (Naming Convention)</span>
        </label>

        <input
          type="text"
          value={fileNamingConvention}
          onChange={(e) => setFileNamingConvention(e.target.value)}
          placeholder="Ví dụ: [DuAn]_[YYYYMMDD]_[TenBanVe].[ext] hoặc TenBot_Task_v1.0.ext"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
        />

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-text-muted mr-1">Gợi ý mẫu nhanh:</span>
          {[
            "[DựÁn]_[TênBảnVẽ]_[PhiênBản].[ext]",
            "[YYYYMMDD]_[DựÁn]_[TácVụ].[ext]",
            "[Task]_[TênFile]_[v1.0].[ext]",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setFileNamingConvention(preset)}
              className="rounded bg-surface-raised px-2 py-0.5 text-[11px] text-text hover:bg-surface-raised/80 font-mono transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tải lên tệp mẫu & quy chuẩn tham chiếu */}
      <div className="space-y-2.5 border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-primary" />
              <span>Tài liệu mẫu & File tham chiếu cho bot</span>
            </label>
            <p className="text-xs text-text-muted">
              Tải lên tài liệu tiêu chuẩn, file mẫu (CAD, PDF, DOCX, hình ảnh...) để bot tham khảo phong cách làm việc.
            </p>
          </div>

          <label className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            <span>{uploading ? "Đang tải lên..." : "Tải lên tệp mẫu"}</span>
            <input
              ref={fileInputRef}
              type="file"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {referenceFiles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg/50 p-4 text-center text-xs text-text-muted">
            Chưa có tệp mẫu nào được nạp cho nhân viên này. Bạn có thể tải lên tài liệu hướng dẫn hoặc file mẫu thiết kế.
          </div>
        ) : (
          <div className="divide-y divide-border/50 rounded-lg border border-border bg-bg/50 overflow-hidden">
            {referenceFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-2.5 text-xs hover:bg-surface-raised/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileText size={15} className="text-text-muted shrink-0" />
                  <span className="font-medium text-text truncate font-mono" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[11px] text-text-muted shrink-0">
                    ({formatBytes(file.size)})
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/api/profiles/${encodeURIComponent(profileName)}/sandbox/files?fileName=${encodeURIComponent(file.name)}`}
                    download
                    className="rounded p-1 text-text-muted hover:text-primary transition-colors"
                    title="Tải về"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    type="button"
                    disabled={deletingFile === file.name}
                    onClick={() => handleDeleteFile(file.name)}
                    className="rounded p-1 text-text-muted hover:text-danger transition-colors disabled:opacity-50"
                    title="Xóa tệp"
                  >
                    {deletingFile === file.name ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Action save */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60 transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{saving ? "Đang lưu cấu hình..." : "Lưu cấu hình Sandbox"}</span>
        </button>
      </div>
    </section>
  );
}
