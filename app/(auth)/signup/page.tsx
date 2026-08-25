"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";
import { DayMark } from "@/ui/graphics/DayMark";
import { TaglineWord } from "@/ui/type/TaglineWord";
import styles from "./signup.module.css";

const ERROR_ID = "signup-error";

export default function SignupPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<
    "email" | "password" | "inviteCode" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrorField(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("flow", "signUp");
    try {
      await signIn("password", formData);
      router.replace("/board");
    } catch (err) {
      // Convex Auth throws distinct messages per rejection reason (verified
      // against the installed @convex-dev/auth package, the same way
      // ../login/page.tsx verified its own InvalidAccountId/InvalidSecret
      // check): "Invalid invite code." is thrown by this app's own profile
      // callback in convex/auth.ts; "Invalid password" is the provider's
      // default 8-character minimum; "already exists" is an email already
      // in use. Anything else is a network/server failure, not the user's
      // input being wrong — see login's own comment for why that
      // distinction matters here. errorField drives which single input gets
      // aria-invalid: a network failure isn't any field's fault, and lumping
      // all three together under one rejection reason misleads screen readers.
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Invalid invite code")) {
        setError("That invite code isn't valid.");
        setErrorField("inviteCode");
      } else if (message.includes("Invalid password")) {
        setError("Password must be at least 8 characters.");
        setErrorField("password");
      } else if (message.includes("already exists")) {
        setError("An account with that email already exists.");
        setErrorField("email");
      } else {
        setError("Could not reach the server. Try again.");
      }
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
          <h1 className={styles.title}>Create an account</h1>
          <label className={styles.fieldRow}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              aria-invalid={errorField === "email" ? true : undefined}
              aria-describedby={errorField === "email" ? ERROR_ID : undefined}
            />
          </label>
          <label className={styles.fieldRow}>
            <span className={styles.label}>Password</span>
            <input
              className={styles.input}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={errorField === "password" ? true : undefined}
              aria-describedby={errorField === "password" ? ERROR_ID : undefined}
            />
            <span className={styles.hint}>At least 8 characters.</span>
          </label>
          <label className={styles.fieldRow}>
            <span className={styles.label}>Invite code</span>
            <input
              className={styles.input}
              name="inviteCode"
              type="text"
              autoComplete="off"
              required
              aria-invalid={errorField === "inviteCode" ? true : undefined}
              aria-describedby={errorField === "inviteCode" ? ERROR_ID : undefined}
            />
            <span className={styles.hint}>Ask whoever invited you for this.</span>
          </label>
          {error && (
            <p className={styles.error} role="alert" id={ERROR_ID}>
              {error}
            </p>
          )}
          <button className={styles.submit} type="submit" disabled={submitting}>
            <span key={submitting ? "pending" : "idle"} className={styles.submitLabel}>
              {submitting ? "Creating account…" : "Create account"}
            </span>
          </button>
          <p className={styles.switch}>
            Already have an account?{" "}
            <Link href="/login" className={styles.switchLink}>
              Sign in
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
