"use client";

import Link from "next/link";
import { AiLogSection } from "@/ui/settings/AiLogSection";
import { AiProviderSection } from "@/ui/settings/AiProviderSection";
import { CourseSection } from "@/ui/settings/CourseSection";
import { ExportSection } from "@/ui/settings/ExportSection";
import { SignOutSection } from "@/ui/settings/SignOutSection";
import { ThemeSection } from "@/ui/settings/ThemeSection";
import styles from "./page.module.css";

// Mirrors app/schedule/page.tsx's exact shape (plan's "/settings is a route,
// not a slide-over panel" decision): header with a "Back to board" link, a
// body split into sections. Every section owns its own Firestore reads/
// writes — this page is pure layout and wiring, same as every other route
// component in app/.
export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Settings</h1>
          <Link href="/board" className={styles.backLink}>
            Back to board
          </Link>
        </div>
      </header>

      <div className={styles.body}>
        <ThemeSection />
        <AiProviderSection />
        <AiLogSection />
        <CourseSection />
        <ExportSection />
        <SignOutSection />
      </div>
    </div>
  );
}
