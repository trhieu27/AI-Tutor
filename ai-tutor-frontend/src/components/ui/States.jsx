import Button from "@/components/ui/Button";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";
import { cx } from "@/components/ui/Premium";
import { UI_STATE_TEXTS } from "@/constants/texts";

export function EmptyState({
  icon = "folder_open",
  title,
  subtitle,
  action,
  secondaryAction,
  liquid = false,
  className = "",
}) {
  const ActionWrap = liquid ? LiquidGlassButton : Button;

  return (
    <div className={cx("flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-10 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] text-[var(--brand-primary)]">
        <span className="material-symbols-outlined text-[25px]" aria-hidden="true">
          {icon}
        </span>
      </span>
      <div className="max-w-md">
        <h3 className="text-[16px] font-semibold text-[var(--foreground)]">{title}</h3>
        {subtitle && <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">{subtitle}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {typeof action === "string" ? <ActionWrap>{action}</ActionWrap> : action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function LoadingState({ title = UI_STATE_TEXTS.loading.title, className = "" }) {
  return (
    <div
      className={cx("flex min-h-[260px] items-center justify-center px-6 py-10", className)}
      role="status"
      aria-label={title}
      aria-busy="true"
    >
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-[var(--radius-panel)]" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-[var(--radius-panel)]" />
        <div className="grid gap-2 sm:grid-cols-3">
          <Skeleton className="h-12 rounded-[var(--radius-panel)]" />
          <Skeleton className="h-12 rounded-[var(--radius-panel)]" />
          <Skeleton className="h-12 rounded-[var(--radius-panel)]" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({
  title = UI_STATE_TEXTS.error.title,
  subtitle = UI_STATE_TEXTS.error.subtitle,
  action,
  className = "",
}) {
  return (
    <div className={cx("flex min-h-[240px] flex-col items-center justify-center gap-4 px-6 py-10 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--brand-rose)]">
        <span className="material-symbols-outlined text-[25px]" aria-hidden="true">
          error
        </span>
      </span>
      <div className="max-w-md">
        <h3 className="text-[16px] font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={cx("premium-skeleton", className)} />;
}
