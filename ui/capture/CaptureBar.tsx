"use client";

import styles from "./CaptureBar.module.css";

// Visually present, structurally ported from docs/design/prototype.html's
// .capture markup, but inert: no submit handler. Parsing + task creation
// land in Slice 2. Not `disabled` — a disabled input reads as broken; an
// inert one reads as "not built yet," which is accurate here.
export function CaptureBar() {
  return (
    <div className={styles.capture}>
      <div className={styles.inner}>
        <input placeholder="finish bio lab report by thursday" autoComplete="off" spellCheck={false} />
        <span className={styles.hint}>
          <kbd>↩</kbd> to capture
        </span>
      </div>
    </div>
  );
}
