import { parseHeuristic } from "@/core/heuristic";
import { computeBreakdown } from "@/core/breakdown";
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
//
// stepCount comes from core/breakdown.ts's computeBreakdown — the same
// function firebase/ai.ts's requestBreakdown calls — rather than a literal,
// so this card can never claim a step count the app wouldn't actually
// produce. Before Slice 7 this was a hardcoded "4" that happened to agree
// with the one fixture on the page; it would have silently gone wrong the
// moment that fixture's estimate changed.
const BEATS = DEMO_SENTENCES.map((s) => {
  const parsed = parseHeuristic(s.raw, FIXED_NOW);
  return {
    raw: s.raw,
    parsed,
    stepCount: parsed.shouldSplit
      ? computeBreakdown(parsed.title, parsed.estimateMin, parsed.dueAt, FIXED_NOW).length
      : 0,
  };
});

export function HowItWorks() {
  return (
    <section className={`${styles.section} ${styles.reveal}`}>
      <div>
        <h2 className={styles.d2}>One sentence in, structure out.</h2>
        <p className={styles.lead} style={{ marginTop: 14 }}>
          No project picker, no priority dropdown, no estimate field to fill in. Just type the
          task the way you&rsquo;d normally describe it — the subject, how long it&rsquo;ll take,
          and the deadline all come from that one sentence.
        </p>
      </div>

      <ol className={own.beats}>
        {BEATS.map(({ raw, parsed, stepCount }) => (
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
                    <span className="num">{stepCount}</span>
                  </div>
                  <div className={demos.steps}>
                    {Array.from({ length: stepCount }, (_, i) => (
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
