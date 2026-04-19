"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-100 text-slate-400 dark:text-indigo-400 light:text-slate-500 hover:bg-white/10 dark:hover:bg-indigo-500/10 light:hover:bg-slate-200 transition-all active:scale-95 group relative overflow-hidden"
      aria-label="Toggle theme"
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Sun Icon */}
        <span className={`material-symbols-outlined absolute transition-all duration-500 transform ${theme === 'dark' ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
          light_mode
        </span>
        {/* Moon Icon */}
        <span className={`material-symbols-outlined absolute transition-all duration-500 transform ${theme === 'light' ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}>
          dark_mode
        </span>
      </div>
      
      {/* Subtle background glow that changes color */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-amber-500/10'}`}></div>
    </button>
  );
}
