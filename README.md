# Ledger

Single-user daily planner: type a sentence, it infers course, effort,
deadline, and steps — capacity from your schedule + a read-only Calendar
overlay, overcommitment visible in the layout, not announced.

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
