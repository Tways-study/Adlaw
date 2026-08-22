"use client";

import { useEffect, useState } from "react";
import { applyTheme, THEME_STORAGE_KEY, type Theme } from "./theme";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    // One-shot sync from localStorage (an external system, read once on
    // mount) — not a cascading-render risk. The boot script in app/layout.tsx
    // already set the DOM attribute before hydration; this only syncs the
    // toggle's own pressed state to match.
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  return (
    <div className={styles.themes} role="group" aria-label="Appearance">
      {(["light", "dark", "auto"] as const).map((t) => (
        <button
          key={t}
          aria-pressed={theme === t}
          onClick={() => {
            setTheme(t);
            applyTheme(t);
          }}
        >
          {t[0].toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}
