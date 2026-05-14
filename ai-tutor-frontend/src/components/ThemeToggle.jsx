import { useTheme } from "@/components/ThemeProvider";
import { THEME_TOGGLE_TEXTS } from "@/constants/texts";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ThemeToggle() {
  const {
    theme,
    setTheme
  } = useTheme();
  const isDark = theme === 'dark';
  return /*#__PURE__*/_jsx("button", {
    onClick: () => setTheme(isDark ? "light" : "dark"),
    className: `w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-90 relative overflow-hidden group ${isDark ? 'bg-[hsl(216_84%_65%/0.12)] text-[var(--brand-secondary)] hover:bg-[hsl(216_84%_65%/0.18)]' : 'bg-[var(--surface)] text-[var(--brand-warm)] hover:bg-[var(--card-bg-hover)]'}`,
    "aria-label": THEME_TOGGLE_TEXTS.ariaLabel,
    title: isDark ? THEME_TOGGLE_TEXTS.toLight : THEME_TOGGLE_TEXTS.toDark,
    children: /*#__PURE__*/_jsxs("div", {
      className: "relative w-5 h-5 flex items-center justify-center",
      children: [/*#__PURE__*/_jsx("span", {
        className: `material-symbols-outlined absolute text-[18px] transition-all duration-300 ${isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`,
        style: {
          fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24"
        },
        children: "light_mode"
      }), /*#__PURE__*/_jsx("span", {
        className: `material-symbols-outlined absolute text-[18px] transition-all duration-300 ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`,
        style: {
          fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24"
        },
        children: "dark_mode"
      })]
    })
  });
}
