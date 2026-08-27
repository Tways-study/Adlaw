<div align="center">

# Adlaw

---

*"One sentence in, a finite day out."*

Type a task in plain language — Adlaw infers the course, effort, and deadline
for you. Your day has a fixed capacity, and when you've taken on too much, the
board shows it in the layout instead of an alert.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Backend-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/Vitest-4-00FF74?style=flat-square&logo=vitest&logoColor=black)](https://vitest.dev)
![License](https://img.shields.io/badge/License-None-lightgrey?style=flat-square)

<img src="https://skillicons.dev/icons?i=nextjs,react,typescript,vitest" alt="Next.js, React, TypeScript, Vitest" />

---

</div>

## Overview

Adlaw infers course, effort, deadline, and steps from one typed sentence —
capacity from your schedule + a read-only Calendar overlay, overcommitment
visible in the layout, not announced.

See `CLAUDE.md` for the full architecture and build order, `PRODUCT.md` and
`DESIGN.md` for the product and visual system, and `CONTEXT.md` for the
domain glossary.

## Getting started

Create a Firebase project (Spark plan), enable Google + Email/Password sign-in,
and copy its Web app config into `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Then:

```bash
npm run dev      # Next.js — no separate backend dev process
```

Open [http://localhost:3000](http://localhost:3000). Sign up at `/signup` or
with the "Continue with Google" button — signup is open, no invite code.

## Stack

Next.js (App Router) · Firebase (Firestore, Firebase Auth) · Google +
email/password sign-in, open signup · hand-written CSS from `DESIGN.md`
tokens.
