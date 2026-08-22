import styles from "./demos.module.css";
import { CAPACITY_OVER, CAPACITY_FITS, NOT_SHIPPED, type CapacityFixture } from "../copy";

// The slot is a recessed track with a notch marking the edge of the day.
//
// Geometry: the track is scaled to whichever is larger, the free time or the
// planned time. The notch then sits at free/total, the blue fill runs up to it,
// and any overage is a red segment continuing past it — inside the track, not
// spilling out of the element. (The prototype anchors both notch and overage at
// `left: 100%`, which works in a narrow board header but escapes its container
// at landing-page width.)
function Slot({ fixture }: { fixture: CapacityFixture }) {
  const total = Math.max(fixture.freeMin, fixture.plannedMin);
  const pct = (min: number) => (min / total) * 100;

  const notchPct = pct(fixture.freeMin);
  const fillPct = pct(Math.min(fixture.plannedMin, fixture.freeMin));
  const spillPct = fixture.over ? pct(fixture.plannedMin - fixture.freeMin) : 0;

  return (
    <div className={styles.capBlock}>
      <div className={styles.capTop}>
        <span>
          <span className="num">{fixture.free}</span> free ·{" "}
          <span className="num">{fixture.planned}</span> planned
        </span>
        <span className={fixture.over ? styles.over : styles.fits}>
          {fixture.over ? (
            <>
              <span className="num">{fixture.delta}</span> over
            </>
          ) : (
            "fits"
          )}
        </span>
      </div>
      <div className={styles.slot}>
        <span className={styles.fill} style={{ width: `${fillPct}%` }} />
        {spillPct > 0 && (
          <span className={styles.spill} style={{ left: `${notchPct}%`, width: `${spillPct}%` }} />
        )}
        <span className={styles.notch} style={{ left: `${notchPct}%` }} />
      </div>
    </div>
  );
}

export function CapacitySlot() {
  return (
    <>
      <Slot fixture={CAPACITY_OVER} />
      <Slot fixture={CAPACITY_FITS} />
      <p className={styles.notShipped}>{NOT_SHIPPED}</p>
    </>
  );
}
