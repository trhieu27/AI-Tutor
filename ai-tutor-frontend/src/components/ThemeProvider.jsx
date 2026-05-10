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
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
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