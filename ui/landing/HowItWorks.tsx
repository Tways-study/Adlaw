import { parseHeuristic } from "@/core/heuristic";
import { formatEstimate, formatDue } from "@/ui/board/format";
import { DEMO_SENTENCES, FIXED_NOW } from "./copy";
import styles from "./landing.module.css";
import demos from "./demos/demos.module.css";
import own from "./HowItWorks.module.css";

// One continuous transformation read left to right — sentence, structure, card —
// not a numbered "how it works" grid.
//
// Parsed at module scope against FIXED_NOW rather than the wall clock: this is a
// server component, so a live timestamp would make the output differ between
// server and client render. copy.test.ts asserts these results still match what
// the page claims.
const BEATS = DEMO_SENTENCES.map((s) => ({
  raw: s.raw,
  parsed: parseHeuristic(s.raw, FIXED_NOW),
}));

export function HowItWorks() {
  return (
    <section className={`${styles.section} ${styles.reveal}`}>
      <div>
        <h2 className={styles.d2}>One sentence in, structure out.</h2>
        <p className={styles.lead} style={{ marginTop: 14 }}>
          No project picker, no priority dropdown, no estimate field. The course, the effort and
          the deadline are read out of the sentence you would have typed anyway.
        </p>
      </div>

      <ol className={own.beats}>
        {BEATS.map(({ raw, parsed }) => (
          <li key={raw} className={own.beat}>
            <p className={own.said}>{raw}</p>
            <div className={own.chips}>
              {parsed.courseCode && <span className={own.chip}>{parsed.courseCode}</span>}
              <span className={`${own.chip} num`}>{formatEstimate(parsed.estimateMin)}</span>
              {parsed.dueAt && (
                <span className={own.chip}>{formatDue(parsed.dueAt, FIXED_NOW)}</span>
              )}
            </div>
            <article className={demos.card}>
              {parsed.courseCode && <span className={demos.course}>{parsed.courseCode}</span>}
              <h3 className={own.cardTitle}>{parsed.title}</h3>
              <div className={demos.meta}>
                <span className="num">{formatEstimate(parsed.estimateMin)}</span>
                {parsed.dueAt && (
                  <>
                    <span className={demos.dot} />
                    <span>{formatDue(parsed.dueAt, FIXED_NOW)}</span>
                  </>
                )}
              </div>
              {parsed.shouldSplit && (
                <div className={demos.parent}>
                  <div className={demos.parentLabel}>
                    <span>Breaks into steps</span>
                    <span className="num">4</span>
                  </div>
                  <div className={demos.steps}>
                    {Array.from({ length: 4 }, (_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                </div>
              )}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
