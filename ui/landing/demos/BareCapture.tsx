import styles from "./demos.module.css";
import { HERO_SENTENCE, REFUSED_FIELDS } from "../copy";

// The fourth failure — abandonment — gets no widget of its own. Its evidence is
// absence: one input, and the list of fields this product refuses to ask for.
// Inventing a widget here would be the exact failure the section names, so this
// deliberately shows less than the other three miniatures, not more.
export function BareCapture() {
  return (
    <div className={styles.bare}>
      <div className={styles.bareInner}>
        <span>{HERO_SENTENCE}</span>
        <span className={styles.bareHint}>
          <kbd>↩</kbd> to capture
        </span>
      </div>
      <ul className={styles.refused}>
        {REFUSED_FIELDS.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  );
}
