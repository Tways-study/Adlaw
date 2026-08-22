import styles from "./demos.module.css";
import { TIMELINE, NOT_SHIPPED } from "../copy";

const { startHour, endHour, hourPx, edgeHour, edgeLabel, gutterHours, committed, planned } =
  TIMELINE;

/** Hours-from-start → px, at the prototype's 31px-per-hour pitch. */
const y = (hour: number) => (hour - startHour) * hourPx;

// Meridiem, not bare hours: this window spans 08:00–20:00, so "8:00" would
// appear at both ends of the gutter.
function label(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

// Today's shape: committed time on the left, planned work on the right, and a
// dashed line where the day actually runs out. The third planned block sits
// entirely past it — which is the whole argument, made without a sentence.
export function Timeline() {
  const height = (endHour - startHour) * hourPx;

  return (
    <>
      <div className={styles.tl} style={{ height }}>
        <div className={styles.gut}>
          {gutterHours.map((h) => (
            <b key={h} style={{ top: y(h) }}>
              {label(h)}
            </b>
          ))}
        </div>

        <div className={styles.col} data-t="Committed">
          {committed.map((b) => (
            <div
              key={`${b.from}-${b.label}`}
              className={`${styles.blk} ${styles.fixed}`}
              style={{ top: y(b.from), height: (b.to - b.from) * hourPx - 2 }}
            >
              {b.label}
              {b.detail && <small>{b.detail}</small>}
            </div>
          ))}
        </div>

        <div className={styles.col} data-t="Planned">
          {planned.map((b) => (
            <div
              key={`${b.from}-${b.label}`}
              className={
                b.spill
                  ? `${styles.blk} ${styles.plan} ${styles.blkSpill}`
                  : `${styles.blk} ${styles.plan}`
              }
              style={{ top: y(b.from), height: (b.to - b.from) * hourPx - 2 }}
            >
              {b.label}
              {b.detail && <small className="num">{b.detail}</small>}
            </div>
          ))}
        </div>

        <div className={styles.endline} style={{ top: y(edgeHour) }} />
      </div>

      <span className={styles.edgeLabel}>{edgeLabel}</span>
      <p className={styles.notShipped}>{NOT_SHIPPED}</p>
    </>
  );
}
