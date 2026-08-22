import type { ReactNode } from "react";
import styles from "./landing.module.css";

/**
 * One of the four failures the product exists to prevent: a statement on one
 * side, evidence on the other, alternating sides down the page.
 *
 * Deliberately not a 2x2 card grid — identical card grids are a banned pattern
 * here, and a grid would flatten a ranked list into four equal things. The
 * ranking matters: abandonment outranks the rest.
 */
export function Failure({
  heading,
  children,
  evidence,
  flip = false,
}: {
  heading: string;
  children: ReactNode;
  evidence: ReactNode;
  flip?: boolean;
}) {
  return (
    <section
      className={
        flip ? `${styles.band} ${styles.bandFlip} ${styles.reveal}` : `${styles.band} ${styles.reveal}`
      }
    >
      <div className={styles.bandText}>
        <h2 className={styles.d3}>{heading}</h2>
        <p className={styles.lead}>{children}</p>
      </div>
      <div className={styles.bandEvidence}>{evidence}</div>
    </section>
  );
}
