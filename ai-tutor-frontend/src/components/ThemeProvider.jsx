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
    // Exact values that match CSS --background tokens in globals.css
    const bg     = isDark ? '#0a0a0a' : '#f8fafc';
    const scheme = isDark ? 'dark' : 'light';

    const root = document.documentElement;

    // 1. Toggle Tailwind dark-mode class
    root.classList.toggle('dark', isDark);

    // 2. color-scheme inline style — tells Safari which native-control variant to use
    root.style.colorScheme = scheme;

    // 3. Set backgroundColor EXPLICITLY on <html> (do NOT clear it).
    //    iOS 26 Safari samples html.style.backgroundColor synchronously to decide
    //    the toolbar pill / status-bar color. If we clear the inline style, Safari
    //    must wait for the CSS custom-property cascade (var(--background)) to
    //    resolve — which happens too late. An explicit hex is always instant.
    root.style.backgroundColor = bg;

    // 4. Patch both meta tags that influence Safari chrome:
    //    - theme-color : tints address bar (Chrome Android, older Safari)
    //    - color-scheme: PRIMARY signal for iOS 26 toolbar pill appearance
    function patchMetas() {
      let tcMeta = document.querySelector('meta[name="theme-color"]');
      if (!tcMeta) {
        tcMeta = document.createElement('meta');
        tcMeta.name = 'theme-color';
        document.head.appendChild(tcMeta);
      }
      tcMeta.content = bg;

      let csMeta = document.querySelector('meta[name="color-scheme"]');
      if (!csMeta) {
        csMeta = document.createElement('meta');
        csMeta.name = 'color-scheme';
        document.head.appendChild(csMeta);
      }
      csMeta.content = scheme;
    }

    // Patch immediately …
    patchMetas();
    // … after two paint frames (DOM class has repainted) …
    requestAnimationFrame(() => requestAnimationFrame(patchMetas));
    // … and after a task boundary (iOS 26 chrome process needs this gap)
    setTimeout(patchMetas, 300);
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