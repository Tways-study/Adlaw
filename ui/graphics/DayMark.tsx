import styles from "./DayMark.module.css";

// The day, as a mark: a hairline ring (a full circle standing for the day),
// one solid arc for what's already committed, one short radial notch where
// that commitment ends. The same shape as the capacity slot's .notch
// (ui/landing/demos/demos.module.css) and the timeline's dashed --alert
// endline — just wrapped into a circle instead of a bar. Not a clock: no
// numerals, no hands, nothing claiming to tell time.
//
// The fill fraction is fixed and deliberately not wired to any live number —
// a mark, not a stat — so it can never be misread as a percentage.

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
const RADIUS = 42;
const START_DEG = -90; // 12 o'clock
const FILL_FRACTION = 0.58;

function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number, r: number) {
  const start = polar(startDeg, r);
  const end = polar(endDeg, r);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const END_DEG = START_DEG + FILL_FRACTION * 360;
const NOTCH_INNER = polar(END_DEG, RADIUS - 7);
const NOTCH_OUTER = polar(END_DEG, RADIUS + 7);
const ARC_D = arcPath(START_DEG, END_DEG, RADIUS);

export function DayMark({
  size = 22,
  ambient = false,
  className,
}: {
  size?: number;
  ambient?: boolean;
  className?: string;
}) {
  const cls = [styles.mark, ambient ? styles.ambient : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      width={size}
      height={size}
      aria-hidden="true"
      className={cls}
    >
      {/* vector-effect="non-scaling-stroke": stroke-width is otherwise in
          viewBox units, so it scales with the rendered size — at size=22 a
          3-unit stroke becomes an invisible 0.66px, and at size=420 the same
          number becomes a bold 4px. This keeps stroke thickness a real,
          fixed pixel value regardless of which scale a given usage renders
          at, so the mark and ambient variants can each set their own
          physical thickness in DayMark.module.css. */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        vectorEffect="non-scaling-stroke"
        className={styles.track}
      />
      <path d={ARC_D} vectorEffect="non-scaling-stroke" className={styles.arc} />
      <line
        x1={NOTCH_INNER.x}
        y1={NOTCH_INNER.y}
        x2={NOTCH_OUTER.x}
        y2={NOTCH_OUTER.y}
        vectorEffect="non-scaling-stroke"
        className={styles.notch}
      />
    </svg>
  );
}
