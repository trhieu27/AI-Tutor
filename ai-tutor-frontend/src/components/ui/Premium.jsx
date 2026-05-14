import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PREMIUM_COMPONENT_TEXTS } from "@/constants/texts";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function PageFrame({ children, className = "", narrow = false }) {
  return (
    <div
      className={cx(
        "premium-page mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10",
        narrow ? "max-w-5xl" : "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  icon = "auto_awesome",
  actions,
  align = "left",
  className = "",
}) {
  return (
    <div
      className={cx(
        "premium-reveal flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:items-center md:text-left",
        className
      )}
    >
      <div className={cx("min-w-0", align === "center" ? "max-w-2xl" : "max-w-3xl")}>
        {kicker && (
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold text-[var(--muted)]">
            <span className="premium-kicker-icon">
              <span className="material-symbols-outlined text-[13px]">{icon}</span>
            </span>
            <span>{kicker}</span>
          </div>
        )}
        <h1 className="text-balance text-[2rem] font-semibold leading-[1.05] text-[var(--foreground)] sm:text-[2.45rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-[14px] font-medium leading-7 text-[var(--muted)] sm:text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Surface({
  children,
  className = "",
  as: Component = "section",
  hover = false,
  accent = false,
}) {
  return (
    <Component
      className={cx(
        "premium-card premium-reveal",
        hover && "premium-card-hover",
        accent && "premium-card-accent",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function Button({
  children,
  icon,
  variant = "primary",
  className = "",
  as,
  to,
  ...props
}) {
  const Component = as || (to ? Link : "button");
  return (
    <Component
      {...(to ? { to } : {})}
      className={cx(
        "premium-button",
        variant === "primary" && "premium-button-primary",
        variant === "secondary" && "premium-button-secondary",
        variant === "ghost" && "premium-button-ghost",
        variant === "danger" && "premium-button-danger",
        className
      )}
      {...props}
    >
      {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
      <span>{children}</span>
    </Component>
  );
}

export function IconButton({
  icon,
  label,
  className = "",
  variant = "ghost",
  as,
  to,
  ...props
}) {
  const Component = as || (to ? Link : "button");
  return (
    <Component
      {...(to ? { to } : {})}
      className={cx(
        "premium-icon-button",
        variant === "solid" && "premium-icon-button-solid",
        variant === "danger" && "premium-icon-button-danger",
        className
      )}
      title={label}
      aria-label={label}
      {...props}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </Component>
  );
}

export function FeatureCard({ icon, title, desc, tone = "blue", to, action = PREMIUM_COMPONENT_TEXTS.featureAction }) {
  const Component = to ? Link : "div";
  return (
    <Component {...(to ? { to } : {})} className={cx("premium-feature-card group", `tone-${tone}`)}>
      <span className="premium-feature-icon">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <span className="block min-w-0">
        <span className="block text-[14px] font-bold leading-snug text-[var(--foreground)]">
          {title}
        </span>
        <span className="mt-1 block text-[12px] font-medium leading-5 text-[var(--muted)]">
          {desc}
        </span>
      </span>
      {to && (
        <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">
          {action}
          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
        </span>
      )}
    </Component>
  );
}

export function StatCard({ label, value, icon, tone = "blue", helper }) {
  return (
    <div className={cx("premium-stat-card", `tone-${tone}`)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-[24px] font-semibold leading-none text-[var(--foreground)]">
            <AnimatedValue value={value} />
          </p>
        </div>
        <span className="premium-stat-icon" aria-hidden="true">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      {helper && <p className="mt-4 text-[11px] font-medium text-[var(--muted-light)]">{helper}</p>}
    </div>
  );
}

function AnimatedValue({ value }) {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : null;
  const [display, setDisplay] = useState(numericValue ?? value);

  useEffect(() => {
    if (numericValue === null) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 520;
    const from = 0;
    const to = numericValue;

    const tick = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numericValue, value]);

  return display;
}

export function SegmentedControl({ options, value, onChange, className = "" }) {
  const itemRefs = useRef([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoverStyle, setHoverStyle] = useState({});
  const [activeStyle, setActiveStyle] = useState({});
  const activeIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.id === value)),
    [options, value]
  );

  const measure = useCallback((index) => {
    const element = itemRefs.current[index];
    if (!element) return null;
    return {
      left: element.offsetLeft,
      top: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const box = measure(activeIndex);
      if (box) setActiveStyle(box);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [activeIndex, measure, options.length]);

  useEffect(() => {
    if (hoveredIndex === null) {
      setHoverStyle({});
      return;
    }
    const box = measure(hoveredIndex);
    if (box) setHoverStyle(box);
  }, [hoveredIndex, measure]);

  return (
    <div className={cx("premium-segmented", className)} role="tablist" onMouseLeave={() => setHoveredIndex(null)}>
      <span
        aria-hidden="true"
        className="premium-segmented-hover"
        style={{
          opacity: hoveredIndex === null ? 0 : 1,
          transform: `translate(${hoverStyle.left ?? 0}px, ${hoverStyle.top ?? 0}px)`,
          width: hoverStyle.width ?? 0,
          height: hoverStyle.height ?? 0,
        }}
      />
      <span
        aria-hidden="true"
        className="premium-segmented-active"
        style={{
          transform: `translate(${activeStyle.left ?? 0}px, ${activeStyle.top ?? 0}px)`,
          width: activeStyle.width ?? 0,
          height: activeStyle.height ?? 0,
        }}
      />
      {options.map((option, index) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            onMouseEnter={() => setHoveredIndex(index)}
            className={cx("premium-segmented-item", active && "is-active")}
          >
            {option.icon && <span className="material-symbols-outlined text-[16px]">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon = "folder_open", title, subtitle, action }) {
  return (
    <div className="premium-empty-state">
      <span className="premium-empty-icon">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </span>
      <div>
        <h3 className="text-[15px] font-bold text-[var(--foreground)]">{title}</h3>
        {subtitle && <p className="mt-1 text-[12px] font-medium leading-6 text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={cx("premium-skeleton", className)} />;
}
