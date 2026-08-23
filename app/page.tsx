import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";
import { DayMark } from "@/ui/graphics/DayMark";
import { CaptureDemo } from "@/ui/landing/CaptureDemo";
import { SmoothScroll } from "@/ui/landing/SmoothScroll";
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
    "A daily planner built for students. Type your task in one sentence and Ledger works out the subject, the time it'll take, and the deadline — then shows you if it actually fits in today.",
  openGraph: {
    title: "Ledger — a day that fits",
    description:
      "A daily planner built for students. Type your task in one sentence and Ledger works out the subject, the time it'll take, and the deadline — then shows you if it actually fits in today.",
    type: "website",
  },
};

// A server component: only CaptureDemo, ThemeToggle, and SmoothScroll ship
// JavaScript.
//
// Nothing from ui/board/ is imported here. Those components are "use client" +
// useQuery against api.tasks, and convex/tasks.ts throws "Not signed in" for an
// unauthenticated caller — a signed-out visitor would get console errors and
// permanently-undefined queries. The miniatures under ui/landing/demos/ are
// static reproductions instead.
export default function LandingPage() {
  return (
    <div className={styles.landing}>
      <SmoothScroll />
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <span className={styles.wordmark}>
            <DayMark size={18} />
            Ledger
          </span>
          <div className={styles.topRight}>
            <ThemeToggle />
            <Link href="/login" className={styles.textLink}>
              Sign in
            </Link>
          </div>
        </header>

        <main>
          <section className={styles.hero}>
            <DayMark ambient size={420} className={styles.heroMark} />
            <p className={styles.audience}>
              Built for students juggling requirements, org work, and a class schedule that never
              has room for anything else.
            </p>
            <h1 className={styles.d1}>A day that fits.</h1>
            <p className={styles.lead}>
              Type what you need to do, the way you&rsquo;d actually say it — &ldquo;finish bio lab
              report by Thursday.&rdquo; Ledger works out the subject, how long it&rsquo;ll really
              take, and the deadline. Then it tells you, honestly, whether today can fit it.
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
          <Failure heading="You plan ten things. Today only has room for four." evidence={<CapacitySlot />}>
            Every task gets a realistic time estimate, and so does your day — based on your actual
            class schedule. The moment your plan runs past what&rsquo;s left, you&rsquo;ll see it,
            before you&rsquo;re the one finding out at 11pm that today was never going to work.
          </Failure>

          <Failure
            heading="Staring at your to-do list is its own kind of tired."
            evidence={<FocusCard />}
            flip
          >
            Instead of a wall of tasks to sort through, Ledger hands you one: the thing to do right
            now, with a plain reason why. No re-sorting your list at midnight trying to figure out
            what actually matters.
          </Failure>

          <Failure
            heading="A 12-hour requirement shouldn't sneak up like a 20-minute one."
            evidence={<StepProgress />}
          >
            Big requirements — a thesis chapter, a major project — get split into steps the moment
            you add them, and stay visible for the two weeks leading up to the deadline.
            &ldquo;Due in two weeks&rdquo; stops quietly turning into &ldquo;due tomorrow.&rdquo;
          </Failure>

          <Failure heading="Most planners get used for four days, then abandoned." evidence={<BareCapture />} flip>
            No tags to set up, no priority levels to assign, no board to maintain. You type one
            line and you&rsquo;re done — because the planners that fail are the ones that feel like
            homework.
          </Failure>

          <HowItWorks />

          <section className={`${styles.section} ${styles.reveal}`}>
            <h2 className={styles.d2}>
              A day has a finite number of hours, and this one already has classes in it.
            </h2>
            <p className={styles.lead}>
              Your free time comes straight from your actual class schedule, not a guess. If what
              you&rsquo;ve planned runs past the hours you actually have, you&rsquo;ll see it drawn
              past the edge — not buried in a warning you&rsquo;d ignore anyway.
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
