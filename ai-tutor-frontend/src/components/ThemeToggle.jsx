import { useTheme } from "@/components/ThemeProvider";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ThemeToggle() {
  const {
    theme,
    setTheme
  } = useTheme();
  const isDark = theme === 'dark';
  return /*#__PURE__*/_jsx("button", {
    onClick: () => setTheme(isDark ? "light" : "dark"),
    className: `w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-250 active:scale-90 relative overflow-hidden group ${isDark ? 'bg-[hsl(239_68%_58%/0.10)] text-[hsl(239_68%_68%)] hover:bg-[hsl(239_68%_58%/0.15)]' : 'bg-[var(--surface)] text-[hsl(38_92%_50%)] hover:bg-[var(--card-bg-hover)]'}`,
    "aria-label": "Toggle theme",
    title: isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối',
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