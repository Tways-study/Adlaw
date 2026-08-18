import styles from "./EverythingRail.module.css";

// S2 rail. No Horizon list yet — it has no data source until courses/tasks
// exist (Slice 2+), and docs/02-app-flow.md doesn't specify an empty state
// for it, so it's omitted rather than invented.
export function EverythingRail() {
  return (
    <aside className={styles.rail}>
      <div className={styles.railHead}>
        <h1>Everything</h1>
      </div>
      <div className={styles.railScroll}>
        <p className={styles.emptyState}>Nothing on the shelf. Type a sentence below.</p>
      </div>
    </aside>
  );
}
