import styles from "./demos.module.css";
import { FOCUS, HORIZON, NOT_SHIPPED } from "../copy";

// Step progress plus the 14-day horizon, side by side: the two things that stop
// a large assignment from being one opaque block until the night before.
export function StepProgress() {
  return (
    <>
      <article className={styles.card}>
        <span className={styles.course}>{FOCUS.courseCode}</span>
        <div className={styles.parentLabel}>
          <span>{FOCUS.parentTitle}</span>
          <span className="num">{FOCUS.stepLabel}</span>
        </div>
        <div className={styles.steps}>
          {Array.from({ length: FOCUS.stepsTotal }, (_, i) => (
            <span key={i} className={i < FOCUS.stepsDone ? styles.on : undefined} />
          ))}
        </div>
      </article>

      <div className={styles.horizon}>
        {HORIZON.map((row) => (
          <div
            key={`${row.day}-${row.what}`}
            className={row.soon ? `${styles.hz} ${styles.soon}` : styles.hz}
          >
            <span className={styles.hzDay}>{row.day}</span>
            <span className={styles.hzWhat}>{row.what}</span>
            <span className={`${styles.hzIn} num`}>{row.in}</span>
          </div>
        ))}
      </div>

      <p className={styles.notShipped}>{NOT_SHIPPED}</p>
    </>
  );
}
