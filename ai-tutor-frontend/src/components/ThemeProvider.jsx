import { createContext, useContext, useState, useEffect } from "react";

// ── Colors must match CSS --background tokens exactly ─────────────────────────
const PALETTE = {
  light: { bg: "#f3f6f8", scheme: "light" },
  dark:  { bg: "#0f1218", scheme: "dark"  },
};

// ── Inject <style> rule for color-scheme (CSS path, different from inline) ────
function injectColorSchemeRule(scheme) {
  let s = document.getElementById("__ai_cs__");
  if (!s) {
    s = document.createElement("style");
    s.id = "__ai_cs__";
    document.head.prepend(s);
  }
  s.textContent = `:root { color-scheme: ${scheme} !important; }`;
}

// ── Recreate a single meta tag (destroy old → insert fresh) ───────────────────
function forceMetaTag(name, content, media) {
  document.querySelectorAll(
    media ? `meta[name="${name}"][media]` : `meta[name="${name}"]:not([media])`
  ).forEach(el => el.remove());
  const m = document.createElement("meta");
  m.setAttribute("name", name);
  m.setAttribute("content", content);
  if (media) m.setAttribute("media", media);
  document.head.prepend(m);
}

// ── Force Safari Liquid Glass compositor to re-sample page background ─────────
// Safari re-evaluates page appearance on scroll events.
function triggerSafariResample() {
  const y = window.scrollY;
  window.scrollTo({ top: y === 0 ? 1 : y - 1, behavior: "instant" });
  requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
}

function applyTheme(theme) {
  const { bg, scheme } = PALETTE[theme] ?? PALETTE.light;
  const root = document.documentElement;

  // ── 1. Kill transitions (Safari samples at tap time) ──────────────────────
  root.classList.add("theme-switching");

  // ── 2. DOM class + inline styles ──────────────────────────────────────────
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = scheme;
  root.style.backgroundColor = bg;
  // Safari samples BODY background for its toolbar color (guide step 1).
  // Setting it here ensures it updates synchronously before Safari reads it.
  if (document.body) document.body.style.backgroundColor = bg;

  // ── 3. Override glass/header CSS vars instantly (before cascade resolves) ─
  // The sticky header reads var(--glass-bg) which would take 1 frame to update
  // via CSS cascade. Setting it inline is synchronous → Safari sees final color.
  if (theme === "light") {
    root.style.setProperty("--header-bg",    "oklch(98% 0.010 210 / 0.84)");
    root.style.setProperty("--glass-bg",     "oklch(99% 0.006 205 / 0.76)");
    root.style.setProperty("--glass-border", "oklch(82% 0.020 218 / 0.75)");
  } else {
    root.style.setProperty("--header-bg",    "oklch(15% 0.018 238 / 0.84)");
    root.style.setProperty("--glass-bg",     "oklch(19% 0.020 238 / 0.72)");
    root.style.setProperty("--glass-border", "oklch(35% 0.022 238 / 0.72)");
  }

  // ── 4. CSS rule for color-scheme ──────────────────────────────────────────
  injectColorSchemeRule(scheme);

  // ── 5. Meta tags ──────────────────────────────────────────────────────────
  // JolyUI technique: theme-color matches the page background EXACTLY so the
  // Safari address bar appears to "merge" with the page (visually seamless).
  // We set both the plain meta AND a media-query-scoped version so Safari
  // picks up the correct value regardless of which path it evaluates.
  forceMetaTag("theme-color", bg);               // plain (active theme)
  forceMetaTag("color-scheme", scheme);           // light/dark chrome signal

  // ── 6. Re-enable transitions + trigger resample ───────────────────────────
  requestAnimationFrame(() => {
    root.classList.remove("theme-switching");
    triggerSafariResample();
    forceMetaTag("theme-color", bg);
    forceMetaTag("color-scheme", scheme);
    injectColorSchemeRule(scheme);

    requestAnimationFrame(() => {
      triggerSafariResample();
      forceMetaTag("theme-color", bg);
      forceMetaTag("color-scheme", scheme);
    });
  });

  setTimeout(() => {
    forceMetaTag("theme-color", bg);
    forceMetaTag("color-scheme", scheme);
    injectColorSchemeRule(scheme);
    triggerSafariResample();
  }, 100);

  setTimeout(() => {
    forceMetaTag("theme-color", bg);
    forceMetaTag("color-scheme", scheme);
    triggerSafariResample();
  }, 400);
}

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("theme") ?? "light";
    return "light";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (t) => {
    if (t === theme) return;
    localStorage.setItem("theme", t);
    applyTheme(t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
