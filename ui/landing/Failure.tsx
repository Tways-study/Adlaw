import type { ReactNode } from "react";
import styles from "./landing.module.css";

/**
 * One of the four failures the product exists to prevent: the statement on
 * the left, the evidence on the right — the Linear reference's text-left /
 * image-right composition, the same way round every time.
 *
 * Deliberately not a 2x2 card grid — identical card grids are a banned
 * pattern here, and a grid would flatten a ranked list into four equal
 * things. The ranking matters: abandonment outranks the rest.
 */
export function Failure({
  heading,
  children,
  evidence,
}: {
  heading: string;
  children: ReactNode;
  evidence: ReactNode;
}) {
  return (
    <section className={styles.shell}>
      <div className={`${styles.band} ${styles.reveal}`}>
        <div className={styles.bandText}>
          <h2 className={styles.d3}>{heading}</h2>
          <p className={styles.lead}>{children}</p>
        </div>
        <div className={styles.bandEvidence}>{evidence}</div>
      </div>
    </section>
  );
}
