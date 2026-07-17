import { Link } from "react-router-dom";
import { cx } from "@/shared/ui/Premium";

const VARIANT_CLASS = {
  primary:
    "bg-[var(--brand-primary)] text-[var(--on-primary)] border-transparent hover:bg-[var(--brand-primary-strong)]",
  secondary:
    "bg-[var(--surface-raised)] text-[var(--foreground)] border-[var(--border-color)] shadow-[var(--premium-shadow-sm)] hover:bg-[var(--card-bg-hover)] hover:border-[var(--border-emphasis)]",
  outline:
    "bg-transparent text-[var(--foreground)] border-[var(--border-color)] hover:bg-[var(--surface)] hover:border-[var(--border-emphasis)]",
  ghost:
    "bg-transparent text-[var(--muted)] border-transparent hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
  subtle:
    "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border-subtle)] hover:bg-[var(--card-bg-hover)] hover:border-[var(--border-color)]",
  destructive:
    "bg-[var(--brand-rose)] text-[var(--on-danger)] border-transparent shadow-[0_10px_24px_var(--shadow-danger)] hover:brightness-95",
  icon:
    "bg-transparent text-[var(--muted)] border-transparent hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
};

const SIZE_CLASS = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-10 px-4 text-[13px]",
  lg: "h-11 px-5 text-[14px]",
  icon: "h-9 w-9 p-0 text-[13px]",
};

export default function Button({
  children,
  icon,
  trailingIcon,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  iconClassName = "",
  as,
  to,
  type,
  ...props
}) {
  const Component = as || (to ? Link : "button");
  const iconOnly = variant === "icon" || size === "icon";
  const isDisabled = disabled || loading;

  return (
    <Component
      {...(to ? { to } : {})}
      {...(!to && !as ? { type: type || "button" } : {})}
      aria-disabled={isDisabled || undefined}
      disabled={!to && !as ? isDisabled : undefined}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border font-[760] leading-tight transition-[background,border-color,color,box-shadow,transform,opacity] duration-150 ease-[var(--ease-reveal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
        SIZE_CLASS[iconOnly ? "icon" : size] || SIZE_CLASS.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" />
      ) : icon ? (
        <span className={cx("material-symbols-outlined text-[17px] leading-none", iconClassName)} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {!iconOnly && <span className="truncate leading-tight">{children}</span>}
      {!loading && trailingIcon && !iconOnly && (
        <span className="material-symbols-outlined text-[17px] leading-none" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
      {iconOnly && <span className="sr-only">{children}</span>}
    </Component>
  );
}

export function IconButton({ label, icon, className = "", variant = "ghost", ...props }) {
  return (
    <Button
      variant={variant === "danger" ? "destructive" : "icon"}
      size="icon"
      icon={icon}
      className={className}
      aria-label={label}
      title={label}
      {...props}
    >
      {label}
    </Button>
  );
}
