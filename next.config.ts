import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

// Firebase's auth domain serves the sign-in handler that signInWithPopup
// opens, so it has to be reachable in both connect-src and frame-src or
// Google sign-in breaks. Read from env rather than hardcoded — it differs
// per project, and a wrong value here fails as a blocked popup, which looks
// nothing like a CSP problem when you're debugging it.
const AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";

// The load-bearing directive here is connect-src.
//
// The session cookie cannot be HttpOnly (see CLAUDE.md — proxy.ts must read
// the ID token, and with no Admin SDK there is nothing to mint a server-side
// session cookie), so script running on this origin can read a live Firebase
// token. connect-src is what stops that token from *leaving*: an injected
// script can read it but has nowhere to send it. That is the compensating
// control, and it is why this list stays tight.
//
// script-src carries 'unsafe-inline' because Next's App Router emits inline
// bootstrap and flight-payload scripts; locking it down properly needs
// per-request nonces threaded through proxy.ts, which is a larger change than
// this pass. Noted honestly rather than implied: script-src is not the
// protection here, connect-src is.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    AUTH_DOMAIN && `https://${AUTH_DOMAIN}`,
  ]
    .filter(Boolean)
    .join(" "),
  ["frame-src 'self'", "https://accounts.google.com", AUTH_DOMAIN && `https://${AUTH_DOMAIN}`]
    .filter(Boolean)
    .join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Clickjacking: this app has no reason to be framed by anyone.
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Turbopack's root auto-detection walks up parent directories looking for
  // a lockfile and can land on an unrelated one outside this repo (e.g. a
  // stray package-lock.json in the home directory) — pin it explicitly so
  // it never picks the wrong project root.
  turbopack: {
    root: path.join(__dirname),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Only meaningful over HTTPS; browsers ignore it on plain http,
          // so it is safe to send in dev too.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
