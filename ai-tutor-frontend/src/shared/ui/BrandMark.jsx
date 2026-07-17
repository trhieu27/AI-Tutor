import { Link } from "react-router-dom";
import { cx } from "@/shared/ui/Premium";

const MARK_SIZE = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const ICON_SIZE = {
  sm: "text-[18px]",
  md: "text-[20px]",
  lg: "text-[22px]",
};

export function BrandMark({ size = "md", quiet = false, className = "" }) {
  return (
    <span
      className={cx(
        "brand-mark",
        quiet && "brand-mark-quiet",
        MARK_SIZE[size] || MARK_SIZE.md,
        className
      )}
      aria-hidden="true"
    >
      <span className={cx("material-symbols-outlined brand-mark-icon", ICON_SIZE[size] || ICON_SIZE.md)}>
        school
      </span>
      <span className="brand-mark-accent" />
    </span>
  );
}

export function BrandLockup({
  title = "AI Tutor",
  subtitle,
  to,
  onClick,
  size = "md",
  quiet = false,
  className = "",
}) {
  const content = (
    <>
      <BrandMark size={size} quiet={quiet} />
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-[780] leading-5 text-[var(--foreground)]">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-[11px] font-bold leading-4 text-[var(--muted)]">
            {subtitle}
          </span>
        )}
      </span>
    </>
  );

  const classes = cx("group flex min-w-0 items-center gap-3", className);

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={classes} aria-label={title}>
        {content}
      </Link>
    );
  }

  return (
    <div className={classes} aria-label={title}>
      {content}
    </div>
  );
}
