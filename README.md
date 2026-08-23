<div align="center">

# Ledger

---

*"One sentence in, a finite day out."*
A single-user daily planner that infers course, effort, and deadline from
one typed sentence — overcommitment is visible in the layout, not announced.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Convex](https://img.shields.io/badge/Convex-Backend-EE342F?style=flat-square&logo=convex&logoColor=white)](https://www.convex.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/Vitest-4-00FF74?style=flat-square&logo=vitest&logoColor=black)](https://vitest.dev)
![License](https://img.shields.io/badge/License-None-lightgrey?style=flat-square)

<img src="https://skillicons.dev/icons?i=nextjs,react,typescript,vitest" alt="Next.js, React, TypeScript, Vitest" />

---

</div>

## Overview

Ledger infers course, effort, deadline, and steps from one typed sentence —
capacity from your schedule + a read-only Calendar overlay, overcommitment
visible in the layout, not announced.

See `CLAUDE.md` for the full architecture and build order, `PRODUCT.md` and
`DESIGN.md` for the product and visual system, and `CONTEXT.md` for the
domain glossary.

## Getting started

Run both of these in separate terminals:

```bash
npx convex dev   # Convex functions + local dev deployment
npm run dev      # Next.js
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) · Convex (data, functions, auth) · Convex Auth
(password provider, one seeded account) · hand-written CSS from `DESIGN.md`
tokens.
