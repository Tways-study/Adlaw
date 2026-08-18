import styles from "./lane.module.css";

// S2 "Then" lane. No cutline yet — that needs core/capacity (Slice 4).
export function ThenQueue() {
  return (
    <div className={styles.lane}>
      <div className={styles.laneHead}>
        <h3>Then</h3>
      </div>
      <div className={styles.laneBody}>
        <p className={styles.emptyState}>Your day is clear.</p>
      </div>
    </div>
  );
}
