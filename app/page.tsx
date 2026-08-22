import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";
import { CaptureDemo } from "@/ui/landing/CaptureDemo";
import { Failure } from "@/ui/landing/Failure";
import { HowItWorks } from "@/ui/landing/HowItWorks";
import { CapacitySlot } from "@/ui/landing/demos/CapacitySlot";
import { FocusCard } from "@/ui/landing/demos/FocusCard";
import { StepProgress } from "@/ui/landing/demos/StepProgress";
import { Timeline } from "@/ui/landing/demos/Timeline";
import { BareCapture } from "@/ui/landing/demos/BareCapture";
import styles from "@/ui/landing/landing.module.css";

export const metadata: Metadata = {
  title: "A day that fits",
  description:
    "A daily planner that takes one sentence per task and works out the course, the effort and the deadline — then shows you where today runs out.",
  openGraph: {
    title: "Ledger — a day that fits",
    description:
      "One sentence in, a finite day out. A daily planner where overcommitment is visible in the layout rather than announced.",
    type: "website",
  },
};

// A server component: only CaptureDemo and ThemeToggle ship JavaScript.
//
// Nothing from ui/board/ is imported here. Those components are "use client" +
// useQuery against api.tasks, and convex/tasks.ts throws "Not signed in" for an
// unauthenticated caller — a signed-out visitor would get console errors and
// permanently-undefined queries. The miniatures under ui/landing/demos/ are
// static reproductions instead.
export default function LandingPage() {
  return (
    <div className={styles.landing}>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <span className={styles.wordmark}>Ledger</span>
          <div className={styles.topRight}>
            <ThemeToggle />
            <Link href="/login" className={styles.textLink}>
              Sign in
            </Link>
          </div>
        </header>

        <main>
          <section className={styles.hero}>
            <h1 className={styles.d1}>A day that fits.</h1>
            <p className={styles.lead}>
              Type one sentence. Ledger works out the course, the effort and the deadline — then
              shows you where today runs out.
            </p>
            {/* The only --primary-fill call-to-action on the entire document. */}
            <Link href="/login" className={styles.cta}>
              Sign in
            </Link>
            <div className={styles.heroDemo}>
              <CaptureDemo />
            </div>
          </section>

          {/* The four failures, in the order they are ranked in PRODUCT.md. */}
          <Failure heading="Ten things into a day that fits four." evidence={<CapacitySlot />}>
            Every task carries an estimate. The day carries a capacity, derived from your class
            schedule. When the plan runs past the day, the layout shows it before you commit.
          </Failure>

          <Failure
            heading="Deciding what to do next costs more than the task."
            evidence={<FocusCard />}
            flip
          >
            One card, one answer, with a line saying why it is that one. Not a board to re-triage
            at 11pm.
          </Failure>

          <Failure
            heading="A 12-hour assignment looks exactly like a 20-minute one."
            evidence={<StepProgress />}
          >
            Big work arrives already broken into steps, and the next two weeks stay in view — so a
            deadline stops being a thing you discover.
          </Failure>

          <Failure heading="Beautiful setup. Four days of use. Silence." evidence={<BareCapture />} flip>
            Every field is a reason to stop opening it. Capture is one line of text and nothing
            else. Success here is narrow and behavioral: it is still open in week six.
          </Failure>

          <HowItWorks />

          <section className={`${styles.section} ${styles.reveal}`}>
            <h2 className={styles.d2}>
              A day has a finite number of hours, and this one already has classes in it.
            </h2>
            <p className={styles.lead}>
              Free time is derived from your schedule, not guessed at. Work that runs past the
              edge of the day is drawn past the edge of the day.
            </p>
            <Timeline />
          </section>
        </main>

        <footer className={styles.close}>
          <p className={styles.closeLine}>One sentence in, a finite day out.</p>
          <Link href="/login" className={styles.textLink}>
            Sign in
          </Link>
        </footer>
      </div>
    </div>
  );
}
