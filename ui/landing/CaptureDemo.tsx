"use client";

import { useMemo, useState } from "react";
import { parseHeuristic } from "@/core/heuristic";
import { formatEstimate, formatDue } from "@/ui/board/format";
import { HERO_SENTENCE } from "./copy";
import styles from "./CaptureDemo.module.css";

// This is the real parser — core/heuristic.ts, the same module the board's
// capture bar uses. It is pure (no imports at all), which is exactly what makes
// it legal to run here for a signed-out visitor. Nothing else from the app
// crosses this boundary.
export function CaptureDemo() {
  const [value, setValue] = useState(HERO_SENTENCE);

  // Seeded once, then held. Server and first client render must agree on "now"
  // or relative dates ("thursday") resolve differently and React reports a
  // hydration mismatch.
  const [now] = useState(() => Date.now());

  const parsed = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return parseHeuristic(trimmed, now);
  }, [value, now]);

  return (
    <div className={styles.demo}>
      <label className={styles.srOnly} htmlFor="capture-demo">
        Try it: type a task the way you would say it
      </label>
      <div className={styles.inner}>
        <input
          id="capture-demo"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={HERO_SENTENCE}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Reserved height, so typing into an empty field doesn't shift the page. */}
      <div className={styles.parsed} aria-live="polite">
        {parsed ? (
          <>
            {parsed.courseCode && <span className={styles.chip}>{parsed.courseCode}</span>}
            <span className={`${styles.chip} num`}>{formatEstimate(parsed.estimateMin)}</span>
            {parsed.dueAt && (
              <span className={styles.chip}>{formatDue(parsed.dueAt, now)}</span>
            )}
            {parsed.shouldSplit && <span className={styles.chipQuiet}>breaks into steps</span>}
          </>
        ) : (
          <span className={styles.empty}>Type a task to see what it becomes.</span>
        )}
      </div>
    </div>
  );
}
