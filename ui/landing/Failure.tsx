import type { ReactNode } from "react";
import styles from "./landing.module.css";

/**
 * One of the four failures the product exists to prevent: a statement on one
 * side, evidence on the other, alternating sides down the page.
 *
 * Deliberately not a 2x2 card grid — identical card grids are a banned pattern
 * here, and a grid would flatten a ranked list into four equal things. The
 * ranking matters: abandonment outranks the rest.
 *
 * Renders its own outer/shell/inner triple (.bleed > .shell > .band) so call
 * sites in app/page.tsx stay a plain list of four elements. `accent`, when
 * given, goes on the outer `.bleed` as `data-accent` — that's the element
 * that paints the full-bleed wash, one per band, chosen for maximum hue
 * distance from whatever functional color that band's own evidence already
 * renders (see landing.module.css's accent-pairing comment for the reasoning
 * per band).
 */
export function Failure({
  heading,
  children,
  evidence,
  flip = false,
  accent,
}: {
  heading: string;
  children: ReactNode;
  evidence: ReactNode;
  flip?: boolean;
  accent?: "marigold" | "coral" | "mocha" | "sky";
}) {
  return (
    <section className={styles.bleed} data-accent={accent}>
      <div className={styles.shell}>
        <div
          className={
            flip ? `${styles.band} ${styles.bandFlip} ${styles.reveal}` : `${styles.band} ${styles.reveal}`
          }
        >
          <div className={styles.bandText}>
            <h2 className={styles.d3}>{heading}</h2>
            <p className={styles.lead}>{children}</p>
          </div>
          <div className={styles.bandEvidence}>{evidence}</div>
        </div>
      </div>
    </section>
  );
}
