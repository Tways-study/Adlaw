// Pure — no firebase imports, no I/O. Lives apart from client.ts so it can be
// unit-tested under the plain vitest config (no environment, no SDK side
// effects from importing the module under test).
//
// Why this exists: firebase/client.ts module-evaluates inside
// app/FirebaseProvider.tsx, which wraps the whole root layout. Handing
// getAuth() an undefined apiKey throws `auth/invalid-api-key` at module
// evaluation, which takes down EVERY route — including the public landing
// page and /login, the two places you'd go to work out what broke. The SDK's
// message names neither the variable nor the file, so the failure reads as
// "the app is dead" rather than "one env var didn't make it into the bundle".
//
// NEXT_PUBLIC_* values are inlined by the bundler at compile time, so a
// missing one is a *build-time* fact baked into the chunk — restarting the
// browser won't fix it, and a stale chunk compiled without them (e.g. a dev
// server whose .next/ was clobbered by a concurrent `next build`) fails
// exactly the same way. Naming the variables is what separates those cases.

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

/** Config key → the NEXT_PUBLIC_* variable it is inlined from. */
const ENV_KEYS = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
} as const satisfies Record<keyof FirebaseConfig, string>;

export const FIREBASE_ENV_KEYS: readonly string[] = Object.values(ENV_KEYS);

/**
 * Build the Firebase config from already-inlined env values.
 *
 * Throws naming every missing variable at once — one round trip instead of
 * six, since a fresh `.env.local` usually misses all of them together.
 */
export function readFirebaseConfig(env: Record<string, string | undefined>): FirebaseConfig {
  const entries = Object.entries(ENV_KEYS) as [keyof FirebaseConfig, string][];

  // Whitespace-only counts as missing: a trailing `KEY=` or a stray quote in
  // .env.local yields "" here, and "" reaches Firebase as an invalid key with
  // the same opaque error a truly absent value produces.
  const missing = entries.filter(([, envKey]) => (env[envKey] ?? "").trim() === "");

  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured: ${missing.map(([, k]) => k).join(", ")} ` +
        `${missing.length === 1 ? "is" : "are"} missing or empty.\n` +
        `Set ${missing.length === 1 ? "it" : "them"} in .env.local (Firebase console → ` +
        `Project settings → Your apps → Web app), then restart the dev server — ` +
        `NEXT_PUBLIC_* values are inlined at build time, so a reload alone won't pick them up.\n` +
        `If .env.local already has ${missing.length === 1 ? "it" : "them"}, the running ` +
        `bundle is stale: stop the dev server, delete .next/, and start it again.`,
    );
  }

  return Object.fromEntries(
    entries.map(([key, envKey]) => [key, (env[envKey] as string).trim()]),
  ) as FirebaseConfig;
}
