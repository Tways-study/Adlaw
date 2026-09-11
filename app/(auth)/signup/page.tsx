"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithGoogle, signUpWithEmail } from "@/firebase/auth";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";
import { DayMark } from "@/ui/graphics/DayMark";
import { TaglineWord } from "@/ui/type/TaglineWord";
import "@/ui/landing/marketing-tokens.css";
import styles from "./signup.module.css";

const ERROR_ID = "signup-error";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"email" | "password" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrorField(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await signUpWithEmail(email, password);
      router.replace("/board");
    } catch (err) {
      // Firebase Auth throws a FirebaseError with a .code, not a message to
      // string-match. errorField drives which single input gets
      // aria-invalid: a network failure isn't any field's fault, and
      // lumping every rejection reason together would mislead screen
      // readers.
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/weak-password") {
        setError("Password must be at least 8 characters.");
        setErrorField("password");
      } else if (code === "auth/email-already-in-use") {
        setError("An account with that email already exists.");
        setErrorField("email");
      } else {
        setError("Could not reach the server. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
      router.replace("/board");
    } catch {
      setError("Could not reach the server. Try again.");
    }
  }

  return (
    <main className={styles.screen} data-surface="marketing">
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
          <button type="button" className={styles.google} onClick={handleGoogle}>
            Continue with Google
          </button>
          <div className={styles.divider} aria-hidden="true">
            <span>or</span>
          </div>
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
