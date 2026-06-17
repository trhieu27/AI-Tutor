import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { COMMON_ACTION_TEXTS } from "@/shared/constants/texts";

const VARIANT_CONFIG = {
  danger: {
    icon: "delete_forever",
    iconWrapCls: "bg-[hsl(343_85%_58%/0.10)] text-[hsl(4_72%_52%)]",
    confirmCls: "bg-[hsl(4_72%_52%)] hover:bg-[hsl(343_65%_42%)] text-white shadow-[0_4px_16px_hsl(343_72%_48%/0.30)] hover:shadow-[0_8px_24px_hsl(343_72%_48%/0.40)]",
  },
  warning: {
    icon: "warning",
    iconWrapCls: "bg-[hsl(38_92%_50%/0.10)] text-[hsl(38_85%_42%)]",
    confirmCls: "bg-[var(--foreground)] hover:bg-[var(--foreground)] text-[var(--background)] shadow-[0_4px_16px_hsl(0_0%_0%/0.15)]",
  },
  info: {
    icon: "info",
    iconWrapCls: "bg-[hsl(166_61%_35%/0.10)] text-[var(--brand-primary)]",
    confirmCls: "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-strong)] text-white shadow-[0_4px_16px_hsl(166_61%_35%/0.28)]",
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = COMMON_ACTION_TEXTS.confirm,
  cancelLabel = COMMON_ACTION_TEXTS.cancel,
  variant = "danger",
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const cfg = VARIANT_CONFIG[variant];

  /* Auto-focus confirm button */
  useEffect(() => {
    if (open) {
      const focusTimerId = setTimeout(() => confirmRef.current?.focus(), 60);
      return () => clearTimeout(focusTimerId);
    }
  }, [open]);

  /* Escape → cancel */
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
    >
      {/* Backdrop — blur (floating context = allowed) */}
      <div
        className="animate-dialog-backdrop absolute inset-0 bg-[hsl(228_25%_5%/0.6)] backdrop-blur-[6px]"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog card — glass on floating = allowed */}
      <div className="animate-dialog-enter relative z-10 w-full max-w-[400px] bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)] shadow-[0_24px_64px_hsl(228_25%_5%/0.5)] overflow-hidden">
        {/* Body */}
        <div className="px-6 pt-6 pb-5 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconWrapCls}`}>
              <span className="material-symbols-outlined icon-thin text-[18px]">{cfg.icon}</span>
            </div>
            <h2
              id="confirm-dialog-title"
              className="text-[15px] font-semibold text-[var(--foreground)] leading-snug tracking-tight flex-1"
            >
              {title}
            </h2>
          </div>
          <p
            id="confirm-dialog-desc"
            className="text-[13px] leading-relaxed pl-[52px] text-[var(--muted)] font-medium break-all"
          >
            {message}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border-subtle)]" />

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg-hover)] transition-all duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] focus-visible:outline-offset-2"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 ${cfg.confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
