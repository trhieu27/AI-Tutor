import { Link } from "react-router-dom";
import { cx } from "@/components/ui/Premium";

const VARIANT_CLASS = {
  subtle:
    "text-[var(--liquid-text)] bg-[linear-gradient(135deg,var(--liquid-soft),var(--liquid-clear))]",
  default:
    "text-[var(--liquid-text)] bg-[linear-gradient(135deg,var(--liquid-primary),var(--liquid-secondary))]",
  bold:
    "text-[var(--liquid-text)] bg-[linear-gradient(135deg,var(--liquid-bold-a),var(--liquid-bold-b))]",
  ghost:
    "text-[var(--foreground)] bg-[var(--liquid-ghost)]",
};

const SIZE_CLASS = {
  sm: "h-9 px-3.5 text-[12px]",
  md: "h-10 px-4 text-[13px]",
  lg: "h-12 px-5 text-[14px]",
  icon: "h-10 w-10 p-0 text-[13px]",
};

export default function LiquidGlassButton({
  children,
  icon,
  trailingIcon,
  variant = "default",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  as,
  to,
  type,
  ...props
}) {
  const Component = as || (to ? Link : "button");
  const isDisabled = disabled || loading;
  const iconOnly = size === "icon";

  return (
    <Component
      {...(to ? { to } : {})}
      {...(!to && !as ? { type: type || "button" } : {})}
      disabled={!to && !as ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
      data-liquid-glass
      className={cx(
        "liquid-glass-button group relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-control)] border border-[var(--liquid-border)] font-semibold leading-snug shadow-[var(--liquid-shadow)] transition-[transform,box-shadow,opacity,border-color] duration-200 ease-[var(--ease-reveal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55",
        VARIANT_CLASS[variant] || VARIANT_CLASS.default,
        SIZE_CLASS[iconOnly ? "icon" : size] || SIZE_CLASS.md,
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-80 [background:linear-gradient(115deg,transparent_0%,var(--liquid-sheen)_42%,transparent_70%)] motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:translate-x-8" />
      <span className="pointer-events-none absolute inset-[1px] rounded-[calc(var(--radius-control)-1px)] border border-white/20 opacity-65" />
      <span className="relative z-10 inline-flex min-w-0 items-center justify-center gap-2">
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden="true" />
        ) : icon ? (
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {!iconOnly && <span className="truncate">{children}</span>}
        {!loading && trailingIcon && !iconOnly && (
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
        {iconOnly && <span className="sr-only">{children}</span>}
      </span>
    </Component>
  );
}
