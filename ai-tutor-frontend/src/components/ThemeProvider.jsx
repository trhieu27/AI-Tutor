import { createContext, useContext, useState, useEffect } from "react";

// Simple theme provider without next-themes dependency
import { jsx as _jsx } from "react/jsx-runtime";
const ThemeContext = /*#__PURE__*/createContext({
  theme: 'light',
  setTheme: _t => {}
});
export function ThemeProvider({
  children
}) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      // If explicitly set by user, respect it. Otherwise default light.
      return stored ?? 'light';
    }
    return 'light';
  });
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    const bg = isDark ? '#0a0a0a' : '#f8fafc';
    root.classList.toggle('dark', isDark);
    root.style.background = bg;
    localStorage.setItem('theme', theme);
    // Remove + re-add meta[theme-color] — forces iOS Safari to re-read and update toolbar
    const old = document.querySelector('meta[name="theme-color"]');
    if (old) old.remove();
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = bg;
    document.head.appendChild(meta);
  }, [theme]);
  const setTheme = t => {
    setThemeState(t);
  };
  return /*#__PURE__*/_jsx(ThemeContext.Provider, {
    value: {
      theme,
      setTheme
    },
    children: children
  });
}
export function useTheme() {
  return useContext(ThemeContext);
}