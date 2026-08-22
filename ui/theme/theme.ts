export const THEME_STORAGE_KEY = "kanban:theme";

export type Theme = "light" | "dark" | "auto";

export function applyTheme(next: Theme): void {
  if (next === "auto") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    // Direct DOM mutation, not React state — this is the theme mechanism
    // itself (ui/tokens.css keys off this attribute), same as the boot
    // script in app/layout.tsx. It needs no react-hooks/immutability
    // suppression here: this is a plain module, not a component or hook,
    // so the react-compiler rules don't analyze it.
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }
}
