import Button from "@/components/ui/Button";
import { QUIZ_WORKSPACE_TEXTS } from "@/constants/texts";

const T = QUIZ_WORKSPACE_TEXTS.result;

export default function QuizResultPanel({ score, total, onRetake }) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const message =
    percent >= 90
      ? T.strong
      : percent >= 60
        ? T.good
        : T.needsReview;

  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-[var(--premium-shadow-sm)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full bg-[var(--surface)]">
          <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="10" className="text-[var(--border-subtle)]" />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={301.6}
              strokeDashoffset={301.6 - (301.6 * percent) / 100}
              className="text-[var(--brand-primary)] transition-all duration-700"
            />
          </svg>
          <span className="text-[24px] font-bold text-[var(--foreground)]">{percent}%</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-normal text-[var(--muted)]">{T.summaryLabel}</p>
          <h2 className="mt-2 text-[22px] font-bold text-[var(--foreground)]">
            {T.score(score, total)}
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] font-medium leading-6 text-[var(--muted)]">{message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" icon="replay" onClick={onRetake}>
              {T.retake}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
