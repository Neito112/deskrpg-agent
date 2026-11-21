"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Mic, MicOff, Paperclip, X } from "lucide-react";
import { accentClasses, type ChatAccent } from "./chat-accent";
import { useT } from "@/lib/i18n";
import MentionEditor, {
  type MentionEditorHandle,
  type SkillsBlockedReason,
} from "./mention-input/MentionEditor";
import {
  serializeSegments,
  splitSkillSegments,
  type MentionCandidate,
  type Segment,
  type SkillCandidate,
} from "./mention-input/mention-model";

export interface ChatInputProps {
  attachmentCount?: number;
  /** `skills` is set only when the message carries skill chips (they are not part of `message`). */
  onSend: (message: string, files?: File[], skills?: string[]) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledPlaceholder?: string;
  cooldown?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  /** With `autoFocus`, a new value focuses the input again (e.g. the panel was asked to show it). */
  focusKey?: number;
  showFileUpload?: boolean;
  onCustomFileUpload?: () => void;
  /** Accent color. Only pre-defined brand-token classes can be chosen — see `chat-accent.ts`. */
  accent?: ChatAccent;
  /**
   * When present, uses the `@` mention editor instead of a textarea. The candidates must match
   * the set the server responds with (channel chat: NPCs on duty; meeting: participating NPCs).
   * The sent value is serialized as `@[name]`.
   */
  mentionCandidates?: MentionCandidate[];
  /**
   * The conversation's draft with its chips. When present, the chip editor is used (with or
   * without mentions) and the draft is reported through `onDraftSegmentsChange`.
   */
  draftSegments?: Segment[];
  onDraftSegmentsChange?: (segments: Segment[]) => void;
  /** A new value remounts the editor so it shows `draftSegments` again (another conversation, or a chip added from outside). */
  editorKey?: string;
  /** Skills `/` can pick. See `MentionEditor`. */
  skillCandidates?: SkillCandidate[];
  skillsBlockedReason?: SkillsBlockedReason;
  /** `/` opened a skill query — load the list. See `MentionEditor`. */
  onSkillTrigger?: () => void;
  /** Which conversation this input belongs to. Not shown on screen, only exposed via `data-chat-scope` (picked up by captures/e2e). */
  scope?: "room" | "npc" | "meeting";
  /** A reply is running: the send button becomes a stop button that calls this. */
  onStop?: () => void;
}

export default function ChatInput({
  onSend,
  attachmentCount = 0,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  disabledPlaceholder,
  cooldown = false,
  maxLength = 500,
  autoFocus = false,
  focusKey,
  showFileUpload = false,
  onCustomFileUpload,
  accent = "npc",
  mentionCandidates,
  draftSegments,
  onDraftSegmentsChange,
  editorKey,
  skillCandidates,
  skillsBlockedReason,
  onSkillTrigger,
  scope,
  onStop,
}: ChatInputProps) {
  const t = useT();
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionRef = useRef<MentionEditorHandle>(null);
  const useMentions = Array.isArray(mentionCandidates) || draftSegments !== undefined;
  const [editorSegments, setEditorSegments] = useState<Segment[]>(() => draftSegments ?? []);
  const segments = draftSegments ?? editorSegments;
  const skills = useMemo(
    () => (useMentions ? splitSkillSegments(segments).skills : []),
    [useMentions, segments],
  );
  const controlled = value !== undefined || draftSegments !== undefined;
  const draft =
    draftSegments !== undefined ? serializeSegments(draftSegments) : controlled ? value! : input;
  const updateDraft = useCallback(
    (next: string) => {
      if (!controlled) setInput(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!draft) {
      el.style.height = "38px";
      return;
    }
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px"; // max ~5 lines
  }, [draft]);

  useEffect(() => {
    adjustHeight();
  }, [draft, adjustHeight]);

  // Auto-focus when enabled
  useEffect(() => {
    if (autoFocus && !disabled) {
      textareaRef.current?.focus();
      mentionRef.current?.focus();
    }
  }, [autoFocus, disabled, focusKey]);

  // Re-focus when cooldown/disabled ends
  useEffect(() => {
    if (!disabled && !cooldown) {
      textareaRef.current?.focus();
      mentionRef.current?.focus();
    }
  }, [disabled, cooldown]);

  const updateSegments = useCallback(
    (next: Segment[]) => {
      if (draftSegments === undefined) setEditorSegments(next);
      onDraftSegmentsChange?.(next);
    },
    [draftSegments, onDraftSegmentsChange],
  );

  const handleSend = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed && files.length === 0 && attachmentCount === 0 && skills.length === 0) return;
    if (cooldown || disabled) return;
    if (skills.length > 0) onSend(trimmed, files.length > 0 ? files : undefined, skills);
    else onSend(trimmed, files.length > 0 ? files : undefined);
    updateDraft("");
    updateSegments([]);
    setFiles([]);
    mentionRef.current?.clear();
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [
    draft,
    files,
    attachmentCount,
    skills,
    cooldown,
    disabled,
    onSend,
    updateDraft,
    updateSegments,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Prevent the simulation from intercepting keys while this has focus
      e.stopPropagation();

      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      setFiles((prev) => [...prev, ...pastedFiles].slice(0, 3));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles].slice(0, 3));
    }
  }, []);

  const toggleSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (typeof window !== "undefined" && typeof (window as any).alert === "function") {
        (window as any).alert("Trình duyệt không hỗ trợ Web Speech API. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge.");
      }
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "vi-VN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          updateDraft((draft ? draft + " " : "") + transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setIsListening(false);
    }
  }, [isListening, draft, updateDraft]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const newFiles = Array.from(selected).slice(0, 3); // max 3 files
    setFiles((prev) => [...prev, ...newFiles].slice(0, 3));
    e.target.value = ""; // reset for re-select
  }, []);

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const hasSpeech =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const canSend =
    (draft.trim() || files.length > 0 || attachmentCount > 0 || skills.length > 0) &&
    !cooldown &&
    !disabled;

  const accentTheme = accentClasses(accent);
  const btnColor = canSend
    ? accentTheme.sendButton
    : "bg-surface-raised text-text-dim cursor-not-allowed";
  const resolvedPlaceholder = placeholder ?? t("chat.placeholder");
  const resolvedDisabledPlaceholder = disabledPlaceholder ?? t("chat.responding");

  return (
    <div
      className={`relative border-t border-border px-3 py-2 transition-colors ${
        isDragging ? "bg-primary/10 border-primary border-dashed" : ""
      }`}
      data-chat-scope={scope}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Drag & drop visual hint */}
      {isDragging && (
        <div className="absolute inset-0 bg-surface/90 flex items-center justify-center z-10 pointer-events-none rounded border-2 border-dashed border-primary text-primary text-xs font-bold">
          📎 Thả tệp tại đây để đính kèm (Tối đa 3 tệp)
        </div>
      )}

      {/* File preview */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1 text-xs text-text-secondary shadow-sm"
            >
              <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[140px] font-medium">{f.name}</span>
              <span className="text-text-dim text-[11px]">({(f.size / 1024).toFixed(0)}KB)</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-text-dim hover:text-danger ml-1 p-0.5 rounded hover:bg-surface-raised"
                aria-label={t("chat.removeFile")}
                title={t("chat.removeFile")}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 w-full min-w-0">
        {/* File upload button */}
        {showFileUpload && (
          <>
            <button
              type="button"
              onClick={() => (onCustomFileUpload ? onCustomFileUpload() : fileInputRef.current?.click())}
              disabled={disabled}
              className="h-[38px] w-[38px] flex items-center justify-center p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface-raised shrink-0 self-end transition-colors"
              title="Đính kèm tệp văn bản / hình ảnh"
              aria-label="Đính kèm tệp"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".txt,.md,.json,.csv,.pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
            />
          </>
        )}

        {/* Voice Input (Microphone) button */}
        <button
          type="button"
          onClick={toggleSpeechRecognition}
          disabled={disabled || !hasSpeech}
          className={`h-[38px] w-[38px] flex items-center justify-center p-2 rounded-lg shrink-0 self-end transition-all ${
            !hasSpeech
              ? "opacity-40 cursor-not-allowed text-text-dim"
              : isListening
                ? "bg-danger text-white animate-pulse"
                : "text-text-muted hover:text-text hover:bg-surface-raised"
          }`}
          title={
            !hasSpeech
              ? "Trình duyệt không hỗ trợ Web Speech"
              : isListening
                ? "Đang lắng nghe... (Nhấn để dừng)"
                : "Nhập bằng giọng nói (Microphone)"
          }
          aria-label="Nhập bằng giọng nói"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Textarea or mention editor */}
        {useMentions ? (
          <MentionEditor
            key={editorKey}
            ref={mentionRef}
            candidates={mentionCandidates}
            skillCandidates={skillCandidates}
            skillsBlockedReason={skillsBlockedReason}
            onSkillTrigger={onSkillTrigger}
            initialSegments={draftSegments}
            value={draft}
            onChange={(v, segs) => {
              if (draftSegments === undefined) updateDraft(v.slice(0, maxLength));
              updateSegments(segs);
            }}
            onSubmit={handleSend}
            placeholder={
              cooldown
                ? t("chat.cooldown")
                : disabled
                  ? resolvedDisabledPlaceholder
                  : resolvedPlaceholder
            }
            disabled={disabled}
            autoFocus={autoFocus}
            accent={accent}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              if (!disabled) updateDraft(e.target.value.slice(0, maxLength));
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              cooldown
                ? t("chat.cooldown")
                : disabled
                  ? resolvedDisabledPlaceholder
                  : resolvedPlaceholder
            }
            rows={1}
            readOnly={disabled}
            className={`flex-1 bg-surface text-text px-3 py-2 rounded-lg border focus:outline-none text-sm min-w-0 resize-none overflow-hidden leading-5 min-h-[38px] ${
              disabled ? "border-border text-text-dim" : `border-border ${accentTheme.focusBorder}`
            }`}
            style={{ maxHeight: "120px" }}
          />
        )}

        {/* Send button — a stop button while a reply is running */}
        {onStop ? (
          <button
            type="button"
            data-testid="chat-stop"
            onClick={onStop}
            aria-label={t("chat.stopResponse")}
            className="h-[38px] px-3.5 flex items-center justify-center rounded-lg font-semibold text-sm shrink-0 whitespace-nowrap min-w-fit self-end transition-colors bg-surface-raised text-text border border-border hover:bg-surface select-none"
          >
            {t("chat.stop")}
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`h-[38px] px-3.5 flex items-center justify-center rounded-lg font-semibold text-sm shrink-0 whitespace-nowrap min-w-fit self-end transition-colors select-none ${btnColor}`}
          >
            {t("common.send")}
          </button>
        )}
      </div>

      {/* Character count */}
      {draft.length > maxLength * 0.8 && (
        <div className="text-right mt-1">
          <span
            className={`text-[10px] ${draft.length >= maxLength ? "text-danger" : "text-text-dim"}`}
          >
            {draft.length}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
}
