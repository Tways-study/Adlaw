import type { CSSProperties } from "react";
import styles from "./TaglineWord.module.css";

// The rotating final word of "A day that ___", used in the auth screens'
// echo line. Documented in DESIGN.md §Motion allowance (c).
//
// The four readings are all ledger-native rather than a thesaurus dump:
// "fits" is capacity (the product's actual thesis), while "adds up",
// "balances", and "closes out" are all accounting terms the product's name
// already invokes. They're a set that means something together, not four
// ways to say the same thing.
//
// Deliberately not a generic <RotatingWord words={...}> component: the
// keyframe percentages in the stylesheet encode a four-item cycle, so a
// caller passing three or five words would silently get a broken rhythm.
// Owning the list here makes that impossible.
const READINGS = ["fits.", "adds up.", "balances.", "closes out."] as const;

// No "use client": this is pure markup plus CSS keyframes, so it renders in
// a server component too (the landing page, should it ever want this).
export function TaglineWord() {
  return (
    <>
      {/* The accessible name. Assistive tech reads one stable tagline;
          without this it would either read all four readings run together
          or announce a word changing on a timer. */}
      <span className={styles.srOnly}>{READINGS[0]}</span>
      <span className={styles.rotator} aria-hidden="true">
        {READINGS.map((reading, i) => (
          <span key={reading} className={styles.word} style={{ "--i": i } as CSSProperties}>
            {reading}
          </span>
        ))}
      </span>
    </>
  );
}
