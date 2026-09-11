"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/client";
import { signInWithEmail, signInWithGoogle, syncSessionCookie } from "@/firebase/auth";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";
import { DayMark } from "@/ui/graphics/DayMark";
import { TaglineWord } from "@/ui/type/TaglineWord";
import "@/ui/landing/marketing-tokens.css";
import styles from "./login.module.css";

const ERROR_ID = "login-error";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edge case: the session cookie expires (max-age 3600s) while no tab is
  // open to refresh it, so proxy.ts bounces a still-signed-in user to
  // /login. The SDK's own refresh token is still good — resolve it here and
  // send them straight back rather than showing a form to someone already
  // signed in.
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        await syncSessionCookie(u);
        router.replace("/board");
      }
    });
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await signInWithEmail(email, password);
      // Explicit navigation: previously this "worked" only because
      // AuthProvider's onChange:invalidateCache fires a server action whose
      // POST happens to trip the middleware — emergent behavior across three
      // layers. Navigate on purpose instead. replace, not push: Back must
      // not return to the login form.
      router.replace("/board");
    } catch (err) {
      // Firebase Auth throws a FirebaseError with a .code, not a message to
      // string-match. All three codes are checked because the project's
      // email-enumeration-protection setting changes which one a rejected
      // sign-in actually throws. Anything else — a network failure, a cold
      // start — is not the user's password being wrong, and saying so would
      // violate "Name the real thing" (docs/05-design-brief.md).
      const code = (err as { code?: string }).code ?? "";
      const isCredentialRejection =
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found";
      setError(
        isCredentialRejection
          ? "Wrong email or password."
          : "Could not reach the server. Try again.",
      );
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
          <h1 className={styles.title}>Sign in</h1>
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
