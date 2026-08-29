"use client";

import { useEffect, useState } from "react";
import { setTheme as persistTheme } from "@/firebase/settings";
import { useAuth } from "@/firebase/hooks";
import { applyTheme, THEME_STORAGE_KEY, type Theme } from "@/ui/theme/theme";
import shared from "./shared.module.css";
import styles from "./ThemeSection.module.css";

// The segmented control ui/theme/ThemeToggle.tsx used to render, relocated
// here per the plan ("ui/theme/ThemeToggle.tsx... Remove <ThemeToggle />
// from BoardHeader.tsx"). ui/theme/theme.ts's applyTheme/THEME_STORAGE_KEY
// and app/layout.tsx's beforeInteractive boot script are untouched — they
// remain the first-paint mechanism regardless of where the write comes
// from. This section additionally persists the choice to settings/prefs so
// it survives across devices/browsers, on top of (not instead of) the
// existing localStorage write.
export function ThemeSection() {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>("auto");

  useEffect(() => {
    // One-shot sync from localStorage on mount — same pattern
    // ui/theme/ThemeToggle.tsx used. The boot script already set the DOM
    // attribute before hydration; this only syncs this control's pressed
    // state to match.
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "light" || stored === "dark") setThemeState(stored);
  }, []);

  function handleSelect(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    if (user) void persistTheme(user.uid, next);
  }

  return (
    <section className={shared.section}>
      <h2 className={shared.heading}>Appearance</h2>
      <p className={shared.desc}>Light and dark are both fully supported — pick what&rsquo;s easiest to read.</p>
      <div className={styles.themes} role="group" aria-label="Appearance">
        {(["light", "dark", "auto"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={theme === t}
            onClick={() => handleSelect(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
    </section>
  );
}
