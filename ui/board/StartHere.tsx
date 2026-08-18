import styles from "./lane.module.css";

// S2 "Start here" lane. No focus card and no Today's shape yet — both need
// core/capacity + real data from later slices.
export function StartHere() {
  return (
    <div className={styles.lane}>
      <div className={styles.laneHead}>
        <h3>Start here</h3>
        <span className={styles.laneHeadMeta}>picked for right now</span>
      </div>
      <div className={styles.laneBody}>
        <p className={styles.emptyState}>Nothing queued. Add something, or pull a card from the shelf.</p>
      </div>
    </div>
  );
}
