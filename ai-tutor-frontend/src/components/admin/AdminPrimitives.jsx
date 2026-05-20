import Button from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { cx } from "@/components/ui/Premium";
import { ADMIN_TEXTS } from "@/constants/texts";

export function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatFileSize(value) {
  return `${formatNumber(Number(value || 0).toFixed(Number(value || 0) >= 10 ? 0 : 1))} MB`;
}

export function formatAdminRole(role) {
  return {
    ADMIN: "Quản trị",
    STUDENT: "Học viên",
  }[role] || role || "Chưa rõ";
}

export function formatAdminStatus(status) {
  return {
    active: "Đang hoạt động",
    blocked: "Đã khóa",
    deleted: "Đã xóa",
    READY: "Sẵn sàng",
    PROCESSING: "Đang xử lý",
    UPLOADING: "Đang tải lên",
    FAILED: "Lỗi xử lý",
  }[status] || status || "Chưa rõ";
}

export function formatAuditAction(action) {
  return ADMIN_TEXTS.audit.actionLabels?.[action] || action || "Chưa rõ";
}

export function formatAuditTarget(target) {
  return ADMIN_TEXTS.audit.targetLabels?.[target] || target || "Chưa rõ";
}

export function AdminPageIntro({ title, subtitle, action }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_oklch,var(--sidebar-bg)_68%,transparent)] px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-[780] leading-tight text-[var(--foreground)] sm:text-[31px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-[13px] font-medium leading-6 text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminSection({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={cx("min-w-0 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] shadow-[var(--premium-shadow-sm)]", className)}>
      {(title || subtitle || action) && (
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            {typeof title === "string" ? (
              <h2 className="text-[15px] font-bold leading-5 text-[var(--foreground)]">{title}</h2>
            ) : (
              title && <div className="text-[15px] font-bold leading-5 text-[var(--foreground)]">{title}</div>
            )}
            {typeof subtitle === "string" ? (
              <p className="mt-1 text-[12px] font-medium text-[var(--muted)]">{subtitle}</p>
            ) : (
              subtitle && <div className="mt-1 text-[12px] font-medium text-[var(--muted)]">{subtitle}</div>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminMetric({ icon, label, value, helper, tone = "neutral" }) {
  const toneClass = {
    green: "text-[var(--brand-primary)] bg-[var(--success-soft)] border-[var(--success-border)]",
    blue: "text-[var(--brand-secondary)] bg-[var(--info-soft)] border-[var(--info-border)]",
    warm: "text-[var(--brand-warm)] bg-[var(--warning-soft)] border-[var(--warning-border)]",
    rose: "text-[var(--brand-rose)] bg-[var(--danger-soft)] border-[var(--danger-border)]",
    neutral: "text-[var(--muted)] bg-[var(--surface)] border-[var(--border-color)]",
  }[tone];

  return (
    <article className="min-w-0 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-[var(--premium-shadow-sm)] transition hover:border-[var(--border-emphasis)] hover:shadow-[var(--premium-shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold leading-5 text-[var(--muted)]">{label}</p>
          <p className="mt-2 break-words text-[24px] font-[780] leading-tight text-[var(--foreground)]">{value}</p>
        </div>
        <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-panel)] border", toneClass)}>
          <span className="material-symbols-outlined text-[19px]" aria-hidden="true">{icon}</span>
        </span>
      </div>
      {helper && <p className="mt-3 text-[11px] font-semibold leading-5 text-[var(--muted)]">{helper}</p>}
    </article>
  );
}

export function AdminStatusPill({ children, tone = "neutral", icon }) {
  const toneClass = {
    green: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-success)]",
    blue: "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--brand-secondary)]",
    warm: "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--brand-warm)]",
    rose: "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--brand-rose)]",
    neutral: "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted)]",
  }[tone];

  return (
    <span className={cx("inline-flex max-w-full items-center gap-1 rounded-[var(--radius-chip)] border px-2 py-1 text-[11px] font-bold leading-none", toneClass)}>
      {icon && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function AdminInput({ icon, className = "", ...props }) {
  return (
    <label className={cx("relative block", className)}>
      {icon && (
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[var(--muted)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <input
        {...props}
        className={cx("premium-input h-10 px-3", icon && "pl-9", props.className)}
      />
    </label>
  );
}

export function AdminSelect({ className = "", children, ...props }) {
  return (
    <label className={cx("relative block", className)}>
      <select
        {...props}
        className={cx("premium-input h-10 appearance-none px-3 pr-9", props.className)}
      >
        {children}
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[17px] text-[var(--muted)]" aria-hidden="true">
        expand_more
      </span>
    </label>
  );
}

export function AdminTable({ columns, children, minWidth = "900px" }) {
  return (
    <div className="hidden min-w-0 overflow-x-auto md:block custom-scrollbar">
      <table className="w-full table-fixed border-collapse text-left" style={{ minWidth }}>
        <thead className="bg-[var(--surface-raised)]">
          <tr className="border-b border-[var(--border-subtle)]">
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 text-[11px] font-bold text-[var(--muted)]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminPagination({ pagination, onPageChange }) {
  if (!pagination || pagination.total <= pagination.limit) return null;
  const { page, limit, total, totalPages } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        <span>{ADMIN_TEXTS.common.range(start, end, total)}</span>
        <span className="separator">·</span>
        <span>{ADMIN_TEXTS.common.page(page, totalPages)}</span>
      </div>
      <nav className="pagination-nav" aria-label="Phân trang admin">
        <button
          type="button"
          className="pagination-btn pagination-arrow"
          aria-label={ADMIN_TEXTS.common.previous}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
        </button>
        <button type="button" className="pagination-btn" aria-current="page">{page}</button>
        <button
          type="button"
          className="pagination-btn pagination-arrow"
          aria-label={ADMIN_TEXTS.common.next}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
        </button>
      </nav>
    </div>
  );
}

function AdminMetricLoadingGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4 shadow-[var(--premium-shadow-sm)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-[var(--radius-panel)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminChartLoading({ bars = 14 }) {
  return (
    <AdminSection title={<Skeleton className="h-5 w-44" />}>
      <div
        className="grid h-72 min-w-0 items-end gap-2 px-4 py-5 sm:px-5"
        style={{ gridTemplateColumns: `repeat(${bars}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: bars }).map((_, index) => (
          <div key={index} className="flex h-full min-w-0 flex-col justify-end gap-2">
            <Skeleton
              className="rounded-t-[var(--radius-chip)]"
              style={{ height: `${18 + ((index * 17) % 74)}%` }}
            />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </AdminSection>
  );
}

function AdminBarListLoading() {
  return (
    <AdminSection title={<Skeleton className="h-5 w-40" />}>
      <div className="space-y-4 p-4 sm:p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </AdminSection>
  );
}

function AdminPanelListLoading({ count = 3 }) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, panel) => (
        <AdminSection key={panel} title={<Skeleton className="h-5 w-40" />}>
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 3 }).map((__, row) => (
              <div key={row} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
                <Skeleton className="h-6 w-16 shrink-0 rounded-[var(--radius-chip)]" />
              </div>
            ))}
          </div>
        </AdminSection>
      ))}
    </div>
  );
}

function AdminTableLoading({ rows = 8 }) {
  return (
    <AdminSection title={<Skeleton className="h-5 w-44" />} subtitle={<Skeleton className="h-3 w-32" />}>
      <div className="hidden md:block">
        <div className="grid grid-cols-[1.2fr_1.5fr_0.8fr_0.8fr_1fr_1fr] gap-4 border-b border-[var(--border-subtle)] px-4 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-full max-w-28" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="grid grid-cols-[1.2fr_1.5fr_0.8fr_0.8fr_1fr_1fr] items-center gap-4 border-b border-[var(--border-subtle)] px-4 py-4 last:border-0">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-20 rounded-[var(--radius-chip)]" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-8 w-16 rounded-[var(--radius-control)]" />
              <Skeleton className="h-8 w-20 rounded-[var(--radius-control)]" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-6 w-16 rounded-[var(--radius-chip)]" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Skeleton className="h-8 rounded-[var(--radius-chip)]" />
              <Skeleton className="h-8 rounded-[var(--radius-chip)]" />
              <Skeleton className="h-8 rounded-[var(--radius-chip)]" />
            </div>
          </div>
        ))}
      </div>
    </AdminSection>
  );
}

function AdminDetailLoading() {
  return (
    <AdminSection title={<Skeleton className="h-5 w-40" />} subtitle={<Skeleton className="h-3 w-56" />}>
      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <section key={index} className={cx(index > 0 && "border-t border-[var(--border-subtle)] pt-4")}>
              <Skeleton className="h-3 w-28" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-20 rounded-[var(--radius-chip)]" />
                  <Skeleton className="h-7 w-24 rounded-[var(--radius-chip)]" />
                </div>
              </div>
            </section>
          ))}
        </div>
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <section key={index}>
              <Skeleton className="h-3 w-32" />
              <div className="mt-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
                {Array.from({ length: 3 }).map((__, row) => (
                  <div key={row} className="flex justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-3 last:border-0">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-5 w-16 rounded-[var(--radius-chip)]" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AdminSection>
  );
}

function AdminPlansLoading() {
  return (
    <AdminSection title={<Skeleton className="h-5 w-36" />} subtitle={<Skeleton className="h-3 w-44" />}>
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-9 w-24 rounded-[var(--radius-control)]" />
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {Array.from({ length: 6 }).map((__, field) => (
                <div key={field} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full rounded-[var(--radius-control)]" />
                </div>
              ))}
            </div>
            <div className="grid gap-3 border-t border-[var(--border-subtle)] p-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((__, quota) => (
                <Skeleton key={quota} className="h-10 rounded-[var(--radius-control)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminSection>
  );
}

function AdminDashboardLoading() {
  return (
    <>
      <AdminMetricLoadingGrid />
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <AdminChartLoading />
        <AdminBarListLoading />
      </div>
      <AdminPanelListLoading />
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSection title={<Skeleton className="h-5 w-44" />}>
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
                <Skeleton className="h-6 w-20 shrink-0 rounded-[var(--radius-chip)]" />
              </div>
            ))}
          </div>
        </AdminSection>
        <AdminSection title={<Skeleton className="h-5 w-36" />}>
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-12 shrink-0 rounded-[var(--radius-chip)]" />
              </div>
            ))}
          </div>
        </AdminSection>
      </div>
    </>
  );
}

function AdminRevenueLoading() {
  return (
    <>
      <AdminMetricLoadingGrid count={5} />
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <AdminChartLoading />
        <AdminBarListLoading />
      </div>
      <AdminTableLoading rows={5} />
    </>
  );
}

export function AdminLoading({ variant = "dashboard" }) {
  const content = {
    dashboard: <AdminDashboardLoading />,
    table: <AdminTableLoading />,
    detail: <AdminDetailLoading />,
    plans: <AdminPlansLoading />,
    revenue: <AdminRevenueLoading />,
  }[variant] || <AdminDashboardLoading />;

  return (
    <div className="min-w-0 space-y-5" role="status" aria-label={ADMIN_TEXTS.common.loading} aria-busy="true">
      {content}
    </div>
  );
}

export function AdminError({ message, onRetry }) {
  return (
    <ErrorState
      title={ADMIN_TEXTS.common.loadError}
      subtitle={message}
      action={onRetry ? <Button variant="secondary" icon="refresh" onClick={onRetry}>{ADMIN_TEXTS.common.retry}</Button> : null}
    />
  );
}

export function AdminEmpty({ title = ADMIN_TEXTS.common.emptyTitle, subtitle = ADMIN_TEXTS.common.emptySubtitle, icon = "inbox" }) {
  return <EmptyState icon={icon} title={title} subtitle={subtitle} />;
}

export function BarList({ items = [], valueKey = "count", labelKey = "label" }) {
  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  if (!items.length) return <AdminEmpty icon="bar_chart" />;

  return (
    <div className="space-y-3 p-4 sm:p-5">
      {items.map((item) => {
        const width = `${Math.max(4, (Number(item[valueKey] || 0) / max) * 100)}%`;
        return (
          <div key={item.id || item[labelKey]} className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-[12px] font-bold">
              <span className="min-w-0 truncate text-[var(--foreground)]">{item[labelKey]}</span>
              <span className="shrink-0 text-[var(--muted)]">{formatNumber(item[valueKey])}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RevenueBars({ series = [] }) {
  const max = Math.max(...series.map((item) => Number(item.revenue || 0)), 1);
  if (!series.length) return <AdminEmpty icon="show_chart" subtitle="Chưa có thanh toán trong khoảng thời gian này" />;

  return (
    <div
      className="grid h-72 min-w-0 items-end gap-2 px-4 py-5 sm:px-5"
      style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}
    >
      {series.map((item) => {
        const height = `${Math.max(6, (Number(item.revenue || 0) / max) * 100)}%`;
        return (
          <div key={item.date} className="flex h-full min-w-0 flex-col justify-end gap-2">
            <div
              className="rounded-t-[var(--radius-chip)] bg-[var(--brand-secondary)] transition hover:bg-[var(--brand-primary)]"
              style={{ height }}
              title={`${item.date}: ${formatVnd(item.revenue)}`}
            />
            <span className="break-words text-center text-[10px] font-bold leading-3 text-[var(--muted)]">{item.date}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminSkeletonRows({ rows = 5, cols = 5 }) {
  return Array.from({ length: rows }).map((_, row) => (
    <tr key={row} className="border-b border-[var(--border-subtle)]">
      {Array.from({ length: cols }).map((__, col) => (
        <td key={col} className="px-4 py-4">
          <Skeleton className="h-4 w-full max-w-36" />
        </td>
      ))}
    </tr>
  ));
}
