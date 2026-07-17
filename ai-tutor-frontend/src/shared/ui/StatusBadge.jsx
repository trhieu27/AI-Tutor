import { cx } from "@/shared/ui/Premium";
import { STATUS_BADGE_TEXTS } from "@/shared/constants/texts";

const STATUS = {
  READY: {
    label: STATUS_BADGE_TEXTS.ready,
    icon: "check_circle",
    className: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-success)]",
  },
  PROCESSING: {
    label: STATUS_BADGE_TEXTS.processing,
    icon: "progress_activity",
    className: "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--brand-warm)]",
  },
  UPLOADING: {
    label: STATUS_BADGE_TEXTS.uploading,
    icon: "sync",
    className: "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--brand-secondary)]",
  },
  FAILED: {
    label: STATUS_BADGE_TEXTS.failed,
    icon: "error",
    className: "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--brand-rose)]",
  },
};

export default function StatusBadge({ status, className = "", children }) {
  const normalizedStatus = status?.toUpperCase();
  const item = STATUS[normalizedStatus] || STATUS.PROCESSING;
  const spinning = normalizedStatus === "PROCESSING" || normalizedStatus === "UPLOADING";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border px-2.5 py-1 text-[11px] font-[760] leading-normal",
        item.className,
        className
      )}
    >
      <span className={cx("material-symbols-outlined text-[13px]", spinning && "animate-spin")} aria-hidden="true">
        {item.icon}
      </span>
      {children || item.label}
    </span>
  );
}
