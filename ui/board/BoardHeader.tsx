"use client";

import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import styles from "./BoardHeader.module.css";

type Theme = "light" | "dark" | "auto";
const STORAGE_KEY = "kanban:theme";

// Temporary scaffolding: this reads/writes localStorage directly. Slice 8
// (Settings) relocates this control into ui/settings/ and switches the
// source of truth to the persisted `settings.theme` row — the CSS and the
// data-theme mechanism itself (ui/tokens.css) don't change, only who sets it.
export function BoardHeader() {
  const { signOut } = useAuthActions();
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    // One-shot sync from localStorage (an external system, read once on
    // mount) — not a cascading-render risk. The boot script in app/layout.tsx
    // already set the DOM attribute before hydration; this only syncs the
    // toggle's own pressed state to match.
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    if (next === "auto") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem(STORAGE_KEY);
    } else {
      // Direct DOM mutation, not React state — this is the theme mechanism
      // itself (ui/tokens.css keys off this attribute), same as the boot
      // script. eslint's react-compiler rule flags it as an external
      // mutation; that's correct and intentional here.
      // eslint-disable-next-line react-hooks/immutability
      document.documentElement.dataset.theme = next;
      localStorage.setItem(STORAGE_KEY, next);
    }
  }

  return (
    <header className={styles.bar}>
      <div className={styles.date}>
        <h2>Today</h2>
      </div>
      <div className={styles.right}>
        <div className={styles.themes} role="group" aria-label="Appearance">
          {(["light", "dark", "auto"] as const).map((t) => (
            <button key={t} aria-pressed={theme === t} onClick={() => applyTheme(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button className={styles.signOut} onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );
}
