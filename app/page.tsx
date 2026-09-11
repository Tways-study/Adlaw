import type { Metadata } from "next";
import Link from "next/link";
import { DayMark } from "@/ui/graphics/DayMark";
import { CaptureDemo } from "@/ui/landing/CaptureDemo";
import { SmoothScroll } from "@/ui/landing/SmoothScroll";
import { TaglineWord } from "@/ui/type/TaglineWord";
import { Failure } from "@/ui/landing/Failure";
import { HowItWorks } from "@/ui/landing/HowItWorks";
import { BoardPreview } from "@/ui/landing/demos/BoardPreview";
import { CapacitySlot } from "@/ui/landing/demos/CapacitySlot";
import { FocusCard } from "@/ui/landing/demos/FocusCard";
import { StepProgress } from "@/ui/landing/demos/StepProgress";
import { Timeline } from "@/ui/landing/demos/Timeline";
import { BareCapture } from "@/ui/landing/demos/BareCapture";
import styles from "@/ui/landing/landing.module.css";

export const metadata: Metadata = {
  title: "A day that fits",
  description:
    "A daily planner built for students. Type your task in one sentence and Adlaw works out the subject, the time it'll take, and the deadline — then shows you if it actually fits in today.",
  openGraph: {
    title: "Adlaw — a day that fits",
    description:
      "A daily planner built for students. Type your task in one sentence and Adlaw works out the subject, the time it'll take, and the deadline — then shows you if it actually fits in today.",
    type: "website",
  },
};

// A server component: only CaptureDemo and SmoothScroll ship JavaScript.
//
// Nothing from ui/board/ is imported here except the pure format helpers.
// Board components are "use client" + firebase/hooks' onSnapshot listeners,
// which resolve to undefined forever for a signed-out visitor with no uid to
// query — the miniatures under ui/landing/demos/ are static reproductions.
export default function LandingPage() {
  return (
    <div className={styles.landing}>
      <SmoothScroll />
      <header className={styles.shell}>
        <nav className={styles.topBar} aria-label="Main">
          <span className={styles.wordmark}>
            <DayMark size={18} />
            Adlaw
          </span>
          <div className={styles.topRight}>
            <Link href="/login" className={styles.navLink}>
              Sign in
            </Link>
            <Link href="/signup" className={styles.signupPill}>
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className={styles.shell}>
          <div className={styles.hero}>
            <p className={styles.audience}>
              Built for students juggling requirements, org work, and a class schedule that never
              has room for anything else.
            </p>
            <h1 className={styles.d1}>
              A day that <TaglineWord />
            </h1>
            <div className={styles.heroFoot}>
              <p className={styles.lead}>
                Type what you need to do, the way you&rsquo;d actually say it — &ldquo;finish bio
                lab report by Thursday.&rdquo; Adlaw works out the subject, how long it&rsquo;ll
                really take, and the deadline. Then it tells you, honestly, whether today can fit
                it.
              </p>
              {/* The page's one lime action (DESIGN.md: one --action per view). */}
              <Link href="/signup" className={styles.cta}>
                Get started
              </Link>
            </div>
          </div>
        </section>

        {/* The product frame on the hero's gradient floor: the live parser as
            the capture bar, over a still of the board it feeds. */}
        <section className={styles.floor}>
          <div className={styles.shell}>
            <div className={styles.frame}>
              <CaptureDemo />
              <BoardPreview />
            </div>
          </div>
        </section>

        {/* The four failures, in the order they are ranked in PRODUCT.md. */}
        <Failure
          heading="You plan ten things. Today only has room for four."
          evidence={<CapacitySlot />}
        >
          Every task gets a realistic time estimate, and so does your day — based on your actual
          class schedule. The moment your plan runs past what&rsquo;s left, you&rsquo;ll see it,
          before you&rsquo;re the one finding out at 11pm that today was never going to work.
        </Failure>

        <Failure
          heading="Staring at your to-do list is its own kind of tired."
          evidence={<FocusCard />}
        >
          Instead of a wall of tasks to sort through, Adlaw hands you one: the thing to do right
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

        <Failure
          heading="Most planners get used for four days, then abandoned."
          evidence={<BareCapture />}
        >
          No tags to set up, no priority levels to assign, no board to maintain. You type one
          line and you&rsquo;re done — because the planners that fail are the ones that feel like
          homework.
        </Failure>

        <HowItWorks />

        {/* A full-width product showcase band: the day's shape, drawn past
            its own edge. */}
        <section className={styles.shell}>
          <div className={`${styles.section} ${styles.reveal}`}>
            <div className={styles.sectionHead}>
              <h2 className={styles.d2}>
                A day has a finite number of hours, and this one already has classes in it.
              </h2>
              <p className={styles.lead}>
                Your free time comes straight from your actual class schedule, not a guess. If what
                you&rsquo;ve planned runs past the hours you actually have, you&rsquo;ll see it
                drawn past the edge — not buried in a warning you&rsquo;d ignore anyway.
              </p>
            </div>
            <Timeline />
          </div>
        </section>
      </main>

      <footer className={styles.shell}>
        <div className={styles.close}>
          <p className={styles.closeLine}>One sentence in, a finite day out.</p>
          <Link href="/login" className={styles.navLink}>
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
