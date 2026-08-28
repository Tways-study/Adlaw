"use client";

import { setDayEnd } from "@/firebase/schedule";
import { useAuth } from "@/firebase/hooks";
import { minutesToTimeInput, timeInputToMinutes } from "./timeFormat";
import styles from "./DayEndControl.module.css";

const DEFAULT_DAY_END_MIN = 1260; // 21:00 — same default ui/board/useDayPlan.ts applies

interface DayEndControlProps {
  dayEndMin?: number;
}

// S4's "my day ends at" control. No save button — every change calls
// setDayEnd() directly, which merge:writes settings/prefs (creating it on
// first use). onSnapshot in usePrefs() reflects the change back into
// useDayPlan() without a reload.
export function DayEndControl({ dayEndMin }: DayEndControlProps) {
  const { user } = useAuth();
  const value = dayEndMin ?? DEFAULT_DAY_END_MIN;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const minutes = timeInputToMinutes(e.target.value);
    if (minutes === null || !user) return;
    void setDayEnd(user.uid, minutes);
  }

  return (
    <label className={styles.control}>
      <span className={styles.label}>My day ends at</span>
      <input
        type="time"
        className={styles.input}
        value={minutesToTimeInput(value)}
        onChange={handleChange}
        aria-describedby="day-end-hint"
      />
      <span id="day-end-hint" className={styles.hint}>
        Shortened automatically on days a work block starts before this time
      </span>
    </label>
  );
}
