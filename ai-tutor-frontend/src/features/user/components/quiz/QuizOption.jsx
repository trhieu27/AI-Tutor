import { cx } from "@/shared/ui/Premium";

export default function QuizOption({ option, index, selected, correct, checked, disabled, onSelect }) {
  const letter = String.fromCharCode(65 + index);
  const stateClass = checked
    ? correct
      ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]"
      : selected
        ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--foreground)]"
        : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted)]"
    : selected
      ? "border-[var(--brand-primary)] bg-[hsl(166_61%_35%/0.08)] text-[var(--foreground)] shadow-[0_0_0_3px_oklch(49%_0.115_175/0.10)]"
      : "border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(index)}
      className={cx(
        "flex w-full items-start gap-3 rounded-[var(--radius-panel)] border p-4 text-left transition-[border-color,background,box-shadow,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-default",
        !checked && !disabled && "hover:-translate-y-0.5",
        stateClass
      )}
    >
      <span
        className={cx(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[12px] font-[800]",
          checked && correct
            ? "border-transparent bg-[var(--brand-success)] text-white"
            : checked && selected
              ? "border-transparent bg-[var(--brand-rose)] text-white"
              : selected
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--on-primary)]"
                : "border-[var(--border-color)] bg-[var(--surface)] text-[var(--muted)]"
        )}
      >
        {checked && correct ? (
          <span className="material-symbols-outlined text-[15px]">check</span>
        ) : checked && selected ? (
          <span className="material-symbols-outlined text-[15px]">close</span>
        ) : (
          letter
        )}
      </span>
      <span className="text-[13px] font-semibold leading-6">{option}</span>
    </button>
  );
}
