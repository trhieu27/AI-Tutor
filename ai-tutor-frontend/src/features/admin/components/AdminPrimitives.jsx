import { Children, isValidElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/shared/ui/Button";
import { ErrorState, Skeleton } from "@/shared/ui/States";
import { cx } from "@/shared/ui/Premium";
import { ADMIN_TEXTS } from "@/shared/constants/texts";

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

export function formatRelativeTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatDateTime(value);
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
    active: "Tài khoản mở",
    blocked: "Đã khóa",
    deleted: "Đã xóa",
    READY: "Sẵn sàng",
    PROCESSING: "Đang xử lý",
    UPLOADING: "Đang tải lên",
    FAILED: "Lỗi xử lý",
  }[status] || status || "Chưa rõ";
}

export function formatAuditAction(action) {
  if (action && typeof action === "object") return action.label || action.value || "Chưa rõ";
  const configured = ADMIN_TEXTS.audit.actions?.find((item) => item?.value === action);
  return configured?.label || ADMIN_TEXTS.audit.actionLabels?.[action] || action || "Chưa rõ";
}

export function formatAuditTarget(target) {
  if (target && typeof target === "object") return target.label || target.value || "Chưa rõ";
  return ADMIN_TEXTS.audit.targetLabels?.[target] || {
    user: "Người dùng",
    document: "Tài liệu",
    plan: "Gói dịch vụ",
  }[target] || target || "Chưa rõ";
}

function sectionIconFromTitle(title) {
  if (typeof title !== "string") return "view_agenda";
  const text = title.toLowerCase();
  if (text.includes("biểu đồ") || text.includes("chart")) return "monitoring";
  if (text.includes("tính năng")) return "analytics";
  if (text.includes("online") || text.includes("đang hoạt động")) return "wifi_tethering";
  if (text.includes("dùng ai") || text.includes("hỏi ai") || text.includes("chat")) return "forum";
  if (text.includes("nâng cấp") || text.includes("subscription")) return "workspace_premium";
  if (text.includes("chi tiết")) return "info";
  if (text.includes("dòng thao tác")) return "receipt_long";
  if (text.includes("cấu hình")) return "tune";
  if (text.includes("cảnh báo")) return "shield";
  if (text.includes("nhật ký")) return "history";
  if (text.includes("doanh thu") || text.includes("giao dịch")) return "payments";
  if (text.includes("người") || text.includes("phiên")) return "group";
  if (text.includes("tài liệu")) return "description";
  if (text.includes("gói")) return "workspace_premium";
  return "view_agenda";
}

function splitNumericDisplay(value) {
  const text = String(value ?? "");
  const match = text.match(/(\d[\d.,\s\u00a0]*)/);
  if (!match) return null;
  const numeric = Number(match[1].replace(/[^\d]/g, ""));
  if (!Number.isFinite(numeric)) return null;
  return {
    numeric,
    prefix: text.slice(0, match.index),
    suffix: text.slice((match.index || 0) + match[1].length),
  };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    setReduced(query.matches);
    const handleChange = () => setReduced(query.matches);
    query.addEventListener?.("change", handleChange);
    return () => query.removeEventListener?.("change", handleChange);
  }, []);

  return reduced;
}

function AnimatedAdminValue({ value }) {
  const parts = useMemo(() => splitNumericDisplay(value), [value]);
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(parts?.numeric ?? value);

  useEffect(() => {
    if (!parts || reducedMotion) {
      setDisplay(parts?.numeric ?? value);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 220;
    const target = parts.numeric;

    const tick = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [parts, reducedMotion, value]);

  if (!parts) return value;
  return (
    <span className="admin-counter">
      {parts.prefix}
      {formatNumber(display)}
      {parts.suffix}
    </span>
  );
}

export function AdminPageIntro({ title, subtitle, action }) {
  return (
    <div className="admin-page-intro flex min-w-0 flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="admin-page-title-wrap">
          <h1 className="text-[22px] font-[780] leading-tight text-[var(--foreground)] sm:text-[24px]">{title}</h1>
        </div>
        {subtitle && (
          <p className="admin-page-subtitle mt-3 flex max-w-3xl items-center gap-2 text-[13px] font-medium text-[var(--muted)]">
            <span className="material-symbols-outlined admin-page-subtitle-icon text-[16px]" aria-hidden="true">info</span>
            <span className="leading-5">{subtitle}</span>
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AdminSection({ title, subtitle, action, children, className = "", icon }) {
  const resolvedIcon = icon || sectionIconFromTitle(title);
  return (
    <section className={cx("admin-section min-w-0", className)}>
      {(title || subtitle || action) && (
        <div className="admin-section-header flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="admin-section-title-row flex min-w-0 items-center gap-3">
            {typeof title === "string" && (
              <span className="admin-section-title-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-panel)]">
                <span className="material-symbols-outlined admin-section-title-symbol text-[16px]" aria-hidden="true">{resolvedIcon}</span>
              </span>
            )}
            <div className="admin-section-title-copy min-w-0">
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
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminMetric({ icon, label, value, helper, tone = "neutral", className }) {
  const toneClass = {
    green: "admin-tone-green",
    blue: "admin-tone-blue",
    warm: "admin-tone-warm",
    rose: "admin-tone-rose",
    neutral: "admin-tone-neutral",
  }[tone];

  return (
    <article className={cx("admin-metric min-w-0 p-4", toneClass, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold leading-5 text-[var(--muted)]">{label}</p>
          <p className="mt-1.5 break-words text-[22px] font-[780] leading-tight text-[var(--foreground)]">
            <AnimatedAdminValue value={value} />
          </p>
        </div>
        <span className="admin-metric-icon flex shrink-0 items-center justify-center rounded-[var(--radius-panel)]">
          <span className="material-symbols-outlined icon-strong text-[21px]" aria-hidden="true">{icon}</span>
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
    <span className={cx("inline-flex max-w-full items-center gap-1 rounded-[var(--radius-chip)] border px-2 py-1 text-[11px] font-bold leading-snug", toneClass)}>
      {icon && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function AdminInput({ icon, className = "", type, value, ...props }) {
  const inputRef = useRef(null);

  // Force-sync DOM value for number inputs to strip leading zeros
  // React won't update DOM when Number("010") === Number("10")
  useEffect(() => {
    const el = inputRef.current;
    if (!el || type !== "number" || document.activeElement !== el) return;
    const expected = String(value ?? "");
    if (el.value !== expected && Number(el.value) === Number(expected)) {
      el.value = expected;
    }
  });

  return (
    <label className={cx("relative block min-w-0", className)}>
      {icon && (
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[var(--muted)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <input
        ref={inputRef}
        type={type}
        value={value}
        {...props}
        className={cx("premium-input h-10 px-3", icon && "pl-9", props.className)}
      />
    </label>
  );
}

function getOptionText(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getOptionText).join("");
  if (isValidElement(node)) return getOptionText(node.props.children);
  return "";
}

export function AdminSelect({
  className = "",
  children,
  value,
  defaultValue,
  onChange,
  disabled = false,
  name,
  id,
  "aria-label": ariaLabel,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const options = useMemo(() => Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const label = getOptionText(child.props.children);
      return {
        label,
        value: String(child.props.value ?? label),
        disabled: Boolean(child.props.disabled),
      };
    }), [children]);
  const currentValue = String(value ?? defaultValue ?? options[0]?.value ?? "");
  const selected = options.find((option) => option.value === currentValue) || options[0];
  const updateMenuPosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportGap = 8;
    const menuGap = 6;
    const menuHeight = menuRef.current?.offsetHeight || Math.min(240, options.length * 40 + 8);
    const availableRight = window.innerWidth - rect.width - viewportGap;
    const left = Math.min(Math.max(rect.left, viewportGap), Math.max(availableRight, viewportGap));
    const shouldOpenAbove = rect.bottom + menuGap + menuHeight > window.innerHeight - viewportGap
      && rect.top > menuHeight + menuGap + viewportGap;
    const top = shouldOpenAbove ? rect.top - menuHeight - menuGap : rect.bottom + menuGap;

    setMenuStyle({
      position: "fixed",
      left: `${left}px`,
      right: "auto",
      top: `${Math.max(viewportGap, top)}px`,
      width: `${rect.width}px`,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    updateMenuPosition();
    return undefined;
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const commitValue = (nextValue) => {
    setOpen(false);
    if (nextValue === currentValue) return;
    onChange?.({
      target: { value: nextValue, name, id },
      currentTarget: { value: nextValue, name, id },
    });
  };

  const menu = open && menuStyle ? (
    <div
      ref={menuRef}
      className="admin-select-menu custom-scrollbar is-open"
      role="listbox"
      style={menuStyle}
    >
      {options.map((option) => {
        const selectedOption = option.value === currentValue;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selectedOption}
            disabled={option.disabled}
            className={cx("admin-select-option", selectedOption && "is-selected")}
            onClick={() => commitValue(option.value)}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cx("admin-select relative", open && "is-open", disabled && "is-disabled", className)}>
      <select className="sr-only" tabIndex={-1} aria-hidden="true" name={name} value={currentValue} onChange={() => {}}>
        {children}
      </select>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx("premium-input admin-select-trigger h-10 px-3 pr-9", props.className)}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="truncate">{selected?.label || "Chọn"}</span>
        <span className="material-symbols-outlined admin-select-chevron text-[17px]" aria-hidden="true">expand_more</span>
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

export function AdminTable({ columns, children, minWidth = "900px", widths, aligns }) {
  return (
    <div className="hidden min-w-0 overflow-x-auto md:block custom-scrollbar">
      <table className="admin-table w-full table-fixed border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-4 py-3 text-[11px] font-bold text-[var(--muted)]"
                style={{ ...(widths?.[index] ? { width: widths[index] } : {}), ...(aligns?.[index] ? { textAlign: aligns[index] } : {}) }}
              >
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

export function AdminActionButton({
  children,
  icon,
  loading = false,
  disabled = false,
  tone = "neutral",
  tooltip = true,
  className = "",
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  onClick,
  ...props
}) {
  const label = typeof children === "string" ? children : props["aria-label"];
  const buttonRef = useRef(null);
  const [tooltipState, setTooltipState] = useState(null);

  const updateTooltip = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect || !label || !tooltip) return;

    const viewportGap = 12;
    const maxTooltipWidth = Math.min(220, window.innerWidth - viewportGap * 2);
    // Estimate width based on label length (approx 7px per char + 20px padding) to prevent wrong clamping for short texts
    const estimatedWidth = Math.min(maxTooltipWidth, label.length * 7 + 20);
    const minLeft = viewportGap + estimatedWidth / 2;
    const maxLeft = window.innerWidth - viewportGap - estimatedWidth / 2;
    const placement = rect.top < 54 ? "bottom" : "top";
    const centeredLeft = rect.left + rect.width / 2;
    const left = Math.min(Math.max(centeredLeft, minLeft), maxLeft);

    setTooltipState({
      placement,
      style: {
        left: `${left}px`,
        top: `${placement === "bottom" ? rect.bottom : rect.top}px`,
        maxWidth: `${maxTooltipWidth}px`,
      },
    });
  }, [label, tooltip]);

  const showTooltip = useCallback(() => {
    updateTooltip();
  }, [updateTooltip]);

  const hideTooltip = useCallback(() => {
    setTooltipState(null);
  }, []);

  useEffect(() => {
    if (!tooltipState) return undefined;
    window.addEventListener("resize", updateTooltip);
    window.addEventListener("scroll", updateTooltip, true);
    return () => {
      window.removeEventListener("resize", updateTooltip);
      window.removeEventListener("scroll", updateTooltip, true);
    };
  }, [tooltipState, updateTooltip]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={cx("admin-action-button", className)}
        data-tone={tone}
        aria-label={label}
        disabled={disabled || loading}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          showTooltip();
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          hideTooltip();
        }}
        onFocus={(event) => {
          onFocus?.(event);
          showTooltip();
        }}
        onBlur={(event) => {
          onBlur?.(event);
          hideTooltip();
        }}
        onClick={(event) => {
          hideTooltip();
          buttonRef.current?.blur();
          onClick?.(event);
        }}
        {...props}
      >
        {loading ? (
          <span className="admin-action-spinner" aria-hidden="true" />
        ) : (
          <span className="material-symbols-outlined text-[16px] leading-none flex items-center justify-center" aria-hidden="true">{icon}</span>
        )}
        <span className="admin-action-label">{children}</span>
      </button>
      {label && tooltipState ? createPortal((
        <span className="admin-action-tooltip is-portal" data-placement={tooltipState.placement} style={tooltipState.style} aria-hidden="true">
          {label}
        </span>
      ), document.body) : null}
    </>
  );
}

export function AdminPagination({ pagination, onPageChange, onLimitChange }) {
  if (!pagination) return null;
  const { page, limit, total, totalPages } = pagination;
  
  if (!onLimitChange && total <= limit) return null;
  if (onLimitChange && total <= 5) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Build page range: always show first, last, current ±1, with ellipsis gaps
  const getPageRange = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages]);
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.add(i);
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
      result.push(sorted[i]);
    }
    return result;
  };

  return (
    <div className="pagination-bar">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="pagination-info">
          <span>{ADMIN_TEXTS.common.range(start, end, total)}</span>
          <span className="separator">·</span>
          <span>{ADMIN_TEXTS.common.page(page, totalPages)}</span>
        </div>
        {onLimitChange && (
          <LimitDropdown value={limit} onChange={onLimitChange} options={[5, 10]} />
        )}
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
        {getPageRange().map((item, index) =>
          item === "…" ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis" aria-hidden="true">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className="pagination-btn"
              aria-current={item === page ? "page" : undefined}
              onClick={() => item !== page && onPageChange(item)}
            >
              {item}
            </button>
          )
        )}
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

function LimitDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); };
  }, [open]);

  return (
    <div className="pagination-per-page" ref={wrapRef}>
      <span className="label">Hiển thị</span>
      <div className="limit-dropdown">
        <button
          type="button"
          className="limit-dropdown-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{value} / trang</span>
          <span className="material-symbols-outlined limit-dropdown-icon" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none" }}>
            expand_more
          </span>
        </button>
        {open && (
          <ul className="limit-dropdown-menu" role="listbox" aria-label="Số bản ghi mỗi trang">
            {options.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={opt === value}
                className={cx("limit-dropdown-item", opt === value && "active")}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                <span>{opt} / trang</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AdminMetricLoadingGrid({ count = 6, className = "grid-cols-2 sm:grid-cols-3", firstSpanFull = false }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cx("admin-metric-skeleton p-4", firstSpanFull && index === 0 && "col-span-2 sm:col-span-1")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-4 w-4/5 max-w-28" />
              <Skeleton className="h-7 w-3/5 max-w-24" />
              <Skeleton className="h-3 w-1/2 max-w-20" />
            </div>
            <Skeleton className="h-[46px] w-[46px] shrink-0 rounded-[var(--radius-panel)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminChartLoading() {
  const ticks = ["T1/26", "T2/26", "T3/26", "T4/26", "T5/26"];
  return (
    <AdminSection title={<Skeleton className="h-5 w-44" />}>
      <div className="admin-chart-loading px-4 py-5 sm:px-5">
        <div className="admin-chart-loading-plot">
          <div className="admin-chart-loading-grid" />
          <svg className="admin-chart-loading-svg" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="admin-chart-loading-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--admin-skeleton-shine)" stopOpacity="0.42" />
                <stop offset="58%" stopColor="var(--admin-skeleton-shine)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="var(--admin-skeleton-shine)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="admin-chart-loading-area" d="M0 238 C120 238 150 216 220 180 C325 126 365 78 470 116 C590 160 615 80 730 58 C850 35 900 86 1000 42 L1000 260 L0 260 Z" />
            <path className="admin-chart-loading-line" d="M0 238 C120 238 150 216 220 180 C325 126 365 78 470 116 C590 160 615 80 730 58 C850 35 900 86 1000 42" />
          </svg>
        </div>
        <div className="admin-chart-loading-labels">
          {ticks.map((tick) => <span key={tick}>{tick}</span>)}
        </div>
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

function SkeletonCell({ type = "text" }) {
  switch (type) {
    case "nameRole":
      return (
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-5 w-16 rounded-[var(--radius-chip)]" />
        </div>
      );
    case "twoLine":
      return (
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      );
    case "pill":
      return <Skeleton className="h-6 w-20 rounded-[var(--radius-chip)]" />;
    case "pillSub":
      return (
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-6 w-20 rounded-[var(--radius-chip)]" />
          <Skeleton className="h-3 w-16" />
        </div>
      );
    case "actions":
      return (
        <div className="flex items-center gap-1.5" style={{ opacity: 0.65 }}>
          <Skeleton className="h-[36px] w-[36px] rounded-[calc(var(--radius-control)-3px)]" />
          <Skeleton className="h-[36px] w-[36px] rounded-[calc(var(--radius-control)-3px)]" />
        </div>
      );
    case "longText":
      return <Skeleton className="h-4 w-full" />;
    case "shortText":
      return <Skeleton className="h-4 w-16" />;
    default:
      return <Skeleton className="h-4 w-24" />;
  }
}

function AdminTableLoading({ rows = 8, columns, widths, cellTypes }) {
  const colCount = columns?.length || 6;
  const defaultCellTypes = Array.from({ length: colCount }, () => "text");
  const types = cellTypes || defaultCellTypes;

  return (
    <AdminSection title={<Skeleton className="h-5 w-44" />} subtitle={<Skeleton className="h-3 w-32" />}>
      {columns ? (
        <AdminTable columns={columns.map(() => "")} widths={widths}>
          {Array.from({ length: rows }).map((_, row) => (
            <tr key={row} className="border-b border-[var(--border-subtle)] last:border-0">
              {types.map((type, col) => (
                <td key={col} className="px-4 py-4">
                  <SkeletonCell type={type} />
                </td>
              ))}
            </tr>
          ))}
        </AdminTable>
      ) : (
        <div className="hidden md:block">
          <div className="grid grid-cols-6 gap-4 border-b border-[var(--border-subtle)] px-4 py-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-full max-w-28" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} className="grid grid-cols-6 items-center gap-4 border-b border-[var(--border-subtle)] px-4 py-4 last:border-0">
              <SkeletonCell type="twoLine" />
              <SkeletonCell type="text" />
              <SkeletonCell type="pill" />
              <SkeletonCell type="shortText" />
              <SkeletonCell type="text" />
              <SkeletonCell type="actions" />
            </div>
          ))}
        </div>
      )}
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
      <AdminMetricLoadingGrid count={3} firstSpanFull />
      <AdminChartLoading />
      <AdminPanelListLoading count={3} />
    </>
  );
}

function AdminRevenueLoading() {
  return (
    <>
      <AdminMetricLoadingGrid count={2} className="sm:grid-cols-2" />
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <AdminChartLoading />
        <AdminBarListLoading />
      </div>
      <AdminTableLoading
        rows={5}
        columns={["Người dùng", "Gói", "Số tiền", "Ngày thanh toán"]}
        cellTypes={["twoLine", "text", "text", "text"]}
      />
    </>
  );
}

export function AdminLoading({ variant = "dashboard", columns, widths, cellTypes }) {
  const content = {
    dashboard: <AdminDashboardLoading />,
    table: <AdminTableLoading columns={columns} widths={widths} cellTypes={cellTypes} />,
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

export function AdminEmpty({ title = "Không có dữ liệu", subtitle = "Chưa có dữ liệu để hiển thị", icon = "inbox", action }) {
  return (
    <div className="admin-empty-state">
      <span className="admin-empty-icon">
        <span className="material-symbols-outlined icon-strong text-[30px]" aria-hidden="true">{icon}</span>
      </span>
      <div className="max-w-md">
        <h3 className="text-[15px] font-[760] leading-5 text-[var(--foreground)]">{title}</h3>
        {subtitle && <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export function AdminConfirmDialog({ open, title = "Xác nhận", message, confirmLabel = "Xác nhận", cancelLabel = "Hủy", onConfirm, onCancel, tone = "rose" }) {
  if (!open) return null;
  const toneMap = { rose: "var(--brand-rose)", green: "var(--brand-primary)", blue: "var(--brand-secondary)" };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="fixed inset-0" style={{ background: "color-mix(in oklch, var(--foreground) 42%, transparent)" }} />
      <div className="relative w-full max-w-[400px] rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-[var(--premium-shadow-md)]" onClick={e => e.stopPropagation()}>
        <p className="text-[15px] font-[760] text-[var(--foreground)]">{title}</p>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--muted)]">{message}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-9 rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface)] px-4 text-[12px] font-bold text-[var(--foreground)] transition hover:bg-[var(--card-bg-hover)]">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="h-9 rounded-[var(--radius-control)] px-4 text-[12px] font-bold text-[var(--on-danger)] transition hover:opacity-90" style={{ background: toneMap[tone] || toneMap.rose }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function AdminToast({ message, tone = "green", visible, onDismiss }) {
  if (!visible) return null;
  const toneStyles = {
    green: "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--brand-primary)]",
    rose: "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--brand-rose)]",
    blue: "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--brand-secondary)]",
  };
  return (
    <div className={cx("fixed bottom-6 right-6 z-[110] flex items-center gap-3 rounded-[var(--radius-panel)] border px-4 py-3 shadow-[var(--premium-shadow-md)] transition-all duration-200", toneStyles[tone] || toneStyles.green)}>
      <span className="text-[13px] font-bold">{message}</span>
      <button type="button" onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-[16px]">close</span></button>
    </div>
  );
}

export function BarList({ items = [], valueKey = "count", labelKey = "label", formatValue }) {
  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  if (!items.length) return <AdminEmpty icon="bar_chart" title="Chưa có dữ liệu sử dụng" subtitle="Khi người học dùng các tính năng AI, phân bổ sẽ hiển thị tại đây" />;

  return (
    <div className="space-y-3 p-4 sm:p-5">
      {items.map((item) => {
        const width = `${Math.max(4, (Number(item[valueKey] || 0) / max) * 100)}%`;
        const displayValue = formatValue ? formatValue(item[valueKey]) : formatNumber(item[valueKey]);
        return (
          <div key={item.id || item[labelKey]} className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-[12px] font-bold">
              <span className="min-w-0 truncate text-[var(--foreground)]">{item[labelKey]}</span>
              <span className="shrink-0 text-[var(--muted)]">{displayValue}</span>
            </div>
            <div className="admin-bar-track">
              <div className="admin-bar-fill" style={{ width }} />
            </div>
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
