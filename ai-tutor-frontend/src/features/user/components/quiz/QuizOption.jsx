import { cx } from "@/shared/ui/Premium";

export default function QuizOption({ option, index, selected, correct, checked, disabled, multi, onSelect }) {
  const letter = String.fromCharCode(65 + index);

  // Card border + bg — 4 states when checked:
  // correct+selected = solid green (you got it right)
  // correct+!selected = dashed outline, very light (you missed this)
  // !correct+selected = red (you chose wrong)
  // !correct+!selected = grey (neutral)
  const stateClass = checked
    ? correct
      ? selected
        ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]"
        : "border-[var(--success-border)] border-dashed bg-transparent text-[var(--foreground)] opacity-70"
      : selected
        ? "border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--foreground)]"
        : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted)] opacity-60"
    : selected
      ? "border-[var(--brand-primary)] bg-[hsl(166_61%_35%/0.08)] text-[var(--foreground)] shadow-[0_0_0_3px_oklch(49%_0.115_175/0.10)]"
      : "border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] hover:border-[var(--border-emphasis)] hover:bg-[var(--card-bg-hover)]";

  // Badge style for single-select (letter badge)
  const badgeClass = checked && correct
    ? "border-transparent bg-[var(--brand-success)] text-white"
    : checked && selected
      ? "border-transparent bg-[var(--brand-rose)] text-white"
      : selected
        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--on-primary)]"
        : "border-[var(--border-color)] bg-[var(--surface)] text-[var(--muted)]";

  // Icon for checked state (after submit)
  const checkedIcon = checked && correct ? "check" : checked && selected ? "close" : null;

  // Multi-select: checkbox color
  const checkboxColor = checked
    ? correct
      ? "text-[var(--brand-success)]"
      : selected
        ? "text-[var(--brand-rose)]"
        : "text-[var(--muted)]"
    : selected
      ? "text-[var(--brand-primary)]"
      : "text-[var(--muted)]";

  // Tags for review mode
  const showSelectedTag = checked && selected;
  const showMissedTag = checked && correct && !selected;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(index)}
      className={cx(
        "flex w-full items-center gap-3 rounded-[var(--radius-panel)] border p-4 text-left transition-[border-color,background,box-shadow,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-default",
        !checked && !disabled && "hover:-translate-y-0.5",
        stateClass
      )}
    >
      {multi ? (
        <span className={cx("flex shrink-0 items-center justify-center", checkboxColor)}>
          {checkedIcon ? (
            <span className={cx(
              "flex h-6 w-6 items-center justify-center rounded-md text-white",
              checked && correct ? "bg-[var(--brand-success)]" : "bg-[var(--brand-rose)]"
            )}>
              <span className="material-symbols-outlined text-[14px]">{checkedIcon}</span>
            </span>
          ) : (
            <span className="material-symbols-outlined text-[22px] leading-none">
              {selected ? "check_box" : "check_box_outline_blank"}
            </span>
          )}
        </span>
      ) : (
        <span className={cx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[12px] font-[800]",
          badgeClass
        )}>
          {checkedIcon ? (
            <span className="material-symbols-outlined text-[15px]">{checkedIcon}</span>
          ) : (
            letter
          )}
        </span>
      )}
      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-normal">{option}</span>
      {showSelectedTag && (
        <span className={cx(
          "shrink-0 rounded-[var(--radius-chip)] px-1.5 py-0.5 text-[9px] font-bold",
          correct
            ? "bg-[var(--brand-success)]/15 text-[var(--brand-success)]"
            : "bg-[var(--brand-rose)]/15 text-[var(--brand-rose)]"
        )}>
          Đã chọn
        </span>
      )}
      {showMissedTag && (
        <span className="shrink-0 rounded-[var(--radius-chip)] border border-dashed border-[var(--success-border)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-success)]">
          Bỏ sót
        </span>
      )}
    </button>
  );
}
