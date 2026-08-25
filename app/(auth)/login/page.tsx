"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";
import { DayMark } from "@/ui/graphics/DayMark";
import { TaglineWord } from "@/ui/type/TaglineWord";
import styles from "./login.module.css";

const ERROR_ID = "login-error";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("flow", "signIn");
    try {
      await signIn("password", formData);
      // Explicit navigation: previously this "worked" only because
      // AuthProvider's onChange:invalidateCache fires a server action whose
      // POST happens to trip the middleware — emergent behavior across three
      // layers. Navigate on purpose instead. replace, not push: Back must
      // not return to the login form.
      router.replace("/board");
    } catch (err) {
      // Convex Auth surfaces a credential rejection as InvalidAccountId /
      // InvalidSecret in the thrown error's message. Anything else — a
      // network failure, a cold Convex deployment, a 500 — is not the
      // user's password being wrong, and saying so would violate "Name the
      // real thing" (docs/05-design-brief.md).
      const message = err instanceof Error ? err.message : String(err);
      const isCredentialRejection =
        message.includes("InvalidAccountId") || message.includes("InvalidSecret");
      setError(
        isCredentialRejection
          ? "Wrong email or password."
          : "Could not reach the server. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.rail} aria-hidden="true" />
      <div className={styles.field} aria-hidden="true" />
      <div className={styles.sweep} aria-hidden="true" />
      <p className={styles.echo}>
        <span className={styles.echoLine}>
          A day that <TaglineWord />
        </span>
        <span className={styles.echoSub}>One sentence in, a finite day out.</span>
      </p>
      <div className={styles.content}>
        <Link href="/" className={styles.wordmark}>
          <DayMark size={26} />
          Adlaw
        </Link>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h1 className={styles.title}>Sign in</h1>
          <label className={styles.fieldRow}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ERROR_ID : undefined}
            />
          </label>
          <label className={styles.fieldRow}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ERROR_ID : undefined}
            />
          </label>
          {error && (
            <p className={styles.error} role="alert" id={ERROR_ID}>
              {error}
            </p>
          )}
          <button className={styles.submit} type="submit" disabled={submitting}>
            <span key={submitting ? "pending" : "idle"} className={styles.submitLabel}>
              {submitting ? "Signing in…" : "Sign in"}
            </span>
          </button>
          <p className={styles.switch}>
            Don&rsquo;t have an account?{" "}
            <Link href="/signup" className={styles.switchLink}>
              Sign up
            </Link>
          </p>
        </form>
      </div>
      <div className={styles.toggle}>
        <ThemeToggle />
      </div>
    </main>
  );
}
