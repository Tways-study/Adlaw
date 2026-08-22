"use client";

import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";
import styles from "./BoardHeader.module.css";

// Temporary scaffolding: the theme control (ui/theme/) reads/writes
// localStorage directly. Slice 8 (Settings) relocates it into ui/settings/
// and switches the source of truth to the persisted `settings.theme` row —
// the CSS and the data-theme mechanism itself (ui/tokens.css) don't change,
// only who sets it.
export function BoardHeader() {
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <header className={styles.bar}>
      <div className={styles.date}>
        <h2>Today</h2>
      </div>
      <div className={styles.right}>
        <ThemeToggle />
        <button
          className={styles.signOut}
          onClick={async () => {
            // signOut() clears cookies but does not navigate. Without an
            // explicit redirect the user is stranded on /board
            // unauthenticated while every useQuery throws "Not signed in".
            // Go to the landing page — the honest signed-out home — and
            // replace so Back can't return to the dead board.
            await signOut();
            router.replace("/");
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
