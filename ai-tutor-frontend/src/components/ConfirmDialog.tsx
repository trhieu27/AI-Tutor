"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = red destructive · warning = slate dark · info = indigo */
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

/* ── Variant token map ──────────────────────────────────────────────────── */
const VARIANT_CONFIG = {
  danger: {
    icon: "delete_forever",
    iconWrapCls: "bg-[#FEF2F2] text-[#B91C1C]",
    confirmCls:  "bg-[#B91C1C] hover:bg-[#991B1B] text-white shadow-[0_2px_8px_rgba(185,28,28,0.25)]",
  },
  warning: {
    icon: "warning",
    iconWrapCls: "bg-[#FFFBEB] text-[#92400E]",
    confirmCls:  "bg-[#111827] hover:bg-[#1F2937] text-white shadow-[0_2px_8px_rgba(17,24,39,0.20)]",
  },
  info: {
    icon: "info",
    iconWrapCls: "bg-[#EEF2FF] text-[#4338CA]",
    confirmCls:  "bg-[#111827] hover:bg-[#1F2937] text-white shadow-[0_2px_8px_rgba(17,24,39,0.20)]",
  },
} as const;

/* ─────────────────────────────────────────────────────────────────────────── */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel  = "Hủy",
  variant      = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cfg        = VARIANT_CONFIG[variant];

  /* Auto-focus confirm button (per spec) */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* Escape → cancel */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    /* Overlay */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="animate-dialog-backdrop absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Card — spring entrance */}
      <div
        className="animate-dialog-enter relative z-10 w-full max-w-[400px] bg-white rounded-xl border border-[#E5E7EB] shadow-2xl overflow-hidden"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* ── Body ── */}
        <div className="px-6 pt-6 pb-5 space-y-4">

          {/* Icon + Title row */}
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconWrapCls}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                {cfg.icon}
              </span>
            </div>
            <div className="flex-1">
              <h2
                id="confirm-dialog-title"
                className="text-[15px] font-semibold leading-snug"
                style={{ color: "#111827", letterSpacing: "-0.01em" }}
              >
                {title}
              </h2>
            </div>
          </div>

          {/* Body text */}
          <p
            id="confirm-dialog-desc"
            className="text-[13px] leading-relaxed pl-[52px]"
            style={{ color: "#4B5563", fontWeight: 400, lineHeight: 1.6 }}
          >
            {message}
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-[#F3F4F6] mx-0" />

        {/* ── Actions ── */}
        <div className="px-6 py-4 flex items-center justify-end gap-2.5">
          {/* Cancel */}
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#D1D5DB] bg-white text-[13px] font-semibold transition-colors duration-150 hover:bg-[#F9FAFB] active:scale-[0.98]"
            style={{ color: "#4B5563" }}
          >
            {cancelLabel}
          </button>

          {/* Confirm */}
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] ${cfg.confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
