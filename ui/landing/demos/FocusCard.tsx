import styles from "./demos.module.css";
import { FOCUS, NOT_SHIPPED } from "../copy";

// The focus card is deliberately a different shape from every other card: a
// larger radius, a larger title, the parent breakdown, and the reason line.
// Exactly one of these exists on the board at a time — that is the answer to
// the cold start.
export function FocusCard() {
  return (
    <>
      <article className={`${styles.card} ${styles.focus}`}>
        <span className={styles.course}>{FOCUS.courseCode}</span>
        <h3 className={styles.focusTitle}>{FOCUS.title}</h3>
        <div className={styles.meta}>
          <span className="num">{FOCUS.estimate}</span>
          <span className={styles.dot} />
          <span>{FOCUS.due}</span>
        </div>
        <p className={styles.reason}>{FOCUS.reason}</p>
        <div className={styles.parent}>
          <div className={styles.parentLabel}>
            <span>{FOCUS.parentTitle}</span>
            <span className="num">{FOCUS.stepLabel}</span>
          </div>
          <div className={styles.steps}>
            {Array.from({ length: FOCUS.stepsTotal }, (_, i) => (
              <span key={i} className={i < FOCUS.stepsDone ? styles.on : undefined} />
            ))}
          </div>
        </div>
      </article>
      <p className={styles.notShipped}>{NOT_SHIPPED}</p>
    </>
  );
}
