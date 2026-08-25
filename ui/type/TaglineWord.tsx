import styles from "./TaglineWord.module.css";

// The rotating final word of "A day that ___" — used in the landing hero's
// <h1> and in the auth screens' echo line. Documented in DESIGN.md
// §Components → rotating tagline and §Motion allowance (c).
//
// The four readings are all about how a day resolves, not a thesaurus dump:
// "fits" is capacity (the product's actual thesis), while "adds up",
// "balances", and "closes out" describe a day the way a ledger describes a
// set of entries — things that sum, settle, and get closed out by day's end.
// They are a set that means something together, not four ways to say the
// same thing.
//
// The readings themselves live in TaglineWord.module.css as ::after
// content — see that file's header for why (short version: keeping them out
// of the DOM is what stops the landing <h1> from indexing as all four at
// once). This component renders only the canonical sentence plus the empty
// slots the stylesheet fills.
//
// Deliberately not a generic <RotatingWord words={...}>: the keyframe
// percentages encode a four-item cycle, so a caller passing three or five
// would silently get a broken rhythm.
const CANONICAL = "fits.";
const SLOTS = 4;

// No "use client": this is markup plus CSS keyframes, nothing else, so it
// renders inside the landing page's server component unchanged.
export function TaglineWord() {
  return (
    <>
      {/* The real text. Carries the accessible name, the indexable heading
          text, and what a selection copies — all three, from one place. */}
      <span className={styles.srOnly}>{CANONICAL}</span>
      <span className={styles.rotator} aria-hidden="true">
        {Array.from({ length: SLOTS }, (_, i) => (
          <span key={i} className={styles.word} />
        ))}
      </span>
    </>
  );
}
