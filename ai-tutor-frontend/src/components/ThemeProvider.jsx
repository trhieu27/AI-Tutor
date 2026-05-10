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
  function applyTheme(t) {
    const isDark = t === 'dark';
    const bg = isDark ? '#0a0a0a' : '#f8fafc';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    // Remove + re-add theme-color meta — forces iOS Safari to re-read toolbar color
    const old = document.querySelector('meta[name="theme-color"]');
    if (old) old.remove();
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = bg;
    document.head.appendChild(meta);
  }
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const setTheme = t => {
    applyTheme(t); // update DOM immediately (before React re-render)
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