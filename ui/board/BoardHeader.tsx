"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/firebase/auth";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";
import { useDayPlan } from "./useDayPlan";
import { prefersReducedMotion } from "@/ui/drag/reducedMotion";
import { formatEstimate } from "./format";
import styles from "./BoardHeader.module.css";

// Temporary scaffolding: the theme control (ui/theme/) reads/writes
// localStorage directly. Slice 8 (Settings) relocates it into ui/settings/
// and switches the source of truth to the persisted `settings.theme` row —
// the CSS and the data-theme mechanism itself (ui/tokens.css) don't change,
// only who sets it.
export function BoardHeader() {
  const router = useRouter();
  const plan = useDayPlan();

  // Read once per render, same pattern as the wall-clock reads elsewhere in
  // ui/ (TaskCard's due-date label, CaptureBar's live preview) — this is a
  // display decision, not state to track.
  const reduceMotion = prefersReducedMotion();
  const widthTransition = reduceMotion ? "none" : "width 450ms var(--ease)";

  // The structural guarantee (core/capacity.ts's CapacityResult doc):
  // overageMin > 0 exactly when cutIndex !== null. "Does the day fit" reads
  // cutIndex, never a plannedMin/freeMin comparison computed here.
  const fits = plan ? plan.cutIndex === null : null;
  // Safe to derive "spare" as freeMin - plannedMin ONLY on the fits branch:
  // layout() only ever places a task fully inside a free window while
  // cutIndex stays null, so plannedMin is a sum of disjoint sub-intervals of
  // the windows and can never exceed freeMin there. The "over" branch reads
  // overageMin directly, per the CapacityResult contract's own warning
  // against plannedMin - freeMin.
  const amountMin = plan ? (fits ? Math.max(0, plan.freeMin - plan.plannedMin) : plan.overageMin) : 0;
  const fillPct = plan && plan.freeMin > 0 ? Math.min(1, plan.plannedMin / plan.freeMin) : plan && plan.plannedMin > 0 ? 1 : 0;
  const spillPct =
    plan && plan.freeMin > 0 ? Math.max(0, Math.min(1, plan.overageMin / plan.freeMin)) : plan && plan.overageMin > 0 ? 1 : 0;

  return (
    <header className={styles.bar}>
      <div className={styles.date}>
        <h2>Today</h2>
      </div>

      <div className={styles.cap}>
        <div className={styles.capTop}>
          <span className={styles.lhs}>Planned against time left</span>
          <span
            className={`${styles.rhs} num ${fits === null ? "" : fits ? styles.fits : styles.over}`}
            aria-live="polite"
          >
            {plan === undefined ? "—" : `${formatEstimate(amountMin)} ${fits ? "spare" : "over"}`}
          </span>
        </div>
        <div className={styles.slot}>
          <div className={styles.fill} style={{ width: `${fillPct * 100}%`, transition: widthTransition }} />
          <div className={styles.spill} style={{ width: `${spillPct * 100}%`, transition: widthTransition }} />
          <div className={styles.notch} />
        </div>
      </div>

      <div className={styles.right}>
        <Link href="/schedule" className={styles.scheduleLink}>
          Schedule
        </Link>
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
