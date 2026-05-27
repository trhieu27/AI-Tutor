import { SETTINGS_PAGE_TEXTS } from "@/shared/constants/texts";
import { useTheme } from "@/shared/ui/ThemeProvider";

const TEXTS = SETTINGS_PAGE_TEXTS;

/** Chọn giao diện sáng / tối */
export default function AppearanceSection() {
  const {
    theme,
    setTheme
  } = useTheme();
  const cur = theme;
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[22px] font-semibold text-[var(--foreground)] tracking-tight">
          {TEXTS.appearance.title}
        </h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">
          {TEXTS.appearance.subtitle}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-xs">
        {[TEXTS.appearance.light, TEXTS.appearance.dark].map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(String(t.id))}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-3 transition-all ${cur === t.id ? "border-[var(--brand-primary)] bg-[hsl(166_61%_35%/0.06)]" : "border-[var(--border-color)] hover:border-[var(--border-emphasis)]"}`}
          >
            <span className={`material-symbols-outlined text-[24px] ${cur === t.id ? "text-[var(--brand-primary)]" : "text-[var(--muted)]"}`}>
              {t.icon}
            </span>
            <p className={`text-[12px] font-semibold ${cur === t.id ? "text-[var(--brand-primary)]" : "text-[var(--foreground)]"}`}>
              {t.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
