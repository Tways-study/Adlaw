import styles from "./Skeleton.module.css";

// Varied per repeated row so a stack of skeletons doesn't read as a uniform
// grid — cycles rather than randomizes, so server and client render the
// same markup.
const TITLE_WIDTHS = ["62%", "48%", "70%", "55%"];

export function SkeletonCard({ compact = false, index = 0 }: { compact?: boolean; index?: number }) {
  const titleWidth = TITLE_WIDTHS[index % TITLE_WIDTHS.length];

  if (compact) {
    return (
      <div className={styles.compactRow} aria-hidden="true">
        <span className={styles.bar} style={{ width: titleWidth }} />
        <span className={styles.bar} />
      </div>
    );
  }

  return (
    <div className={styles.card} aria-hidden="true">
      <span className={styles.bar} style={{ width: titleWidth }} />
      <span className={`${styles.bar} ${styles.barSm}`} style={{ width: "30%" }} />
    </div>
  );
}
