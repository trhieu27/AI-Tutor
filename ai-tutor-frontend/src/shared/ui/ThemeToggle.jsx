import { useTheme } from "@/shared/ui/ThemeProvider";
import { THEME_TOGGLE_TEXTS } from "@/shared/constants/texts";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-90 relative overflow-hidden group ${isDark ? 'bg-[hsl(216_84%_65%/0.12)] text-[var(--brand-secondary)] hover:bg-[hsl(216_84%_65%/0.18)]' : 'bg-[var(--surface)] text-[var(--brand-warm)] hover:bg-[var(--card-bg-hover)]'}`}
      aria-label={THEME_TOGGLE_TEXTS.ariaLabel}
      title={isDark ? THEME_TOGGLE_TEXTS.toLight : THEME_TOGGLE_TEXTS.toDark}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <span
          className={`material-symbols-outlined absolute text-[18px] transition-all duration-300 ${isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
        >
          light_mode
        </span>
        <span
          className={`material-symbols-outlined absolute text-[18px] transition-all duration-300 ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`}
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
        >
          dark_mode
        </span>
      </div>
    </button>
  );
}
