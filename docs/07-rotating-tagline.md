> **Project:** Ledger · **Doc:** Rotating Tagline — Implementation Report · **Version:** 1.0 · **Date:** 2026-08-23
> **Status:** Shipped (`fce135f`, `30c869c`)
> **Upstream:** `DESIGN.md` §Motion allowance (c), §Components → rotating tagline

# The rotating tagline

The final word of *"A day that ___"* cycles through four readings —
**fits · adds up · balances · closes out** — in the landing hero's `<h1>` and
in `/login` and `/signup`'s echo line.

This report records why it exists, the two rules it had to be reconciled
with, and the one refactor that turned out to matter more than the feature.

## How it came about

It replaced something. `/login` and `/signup` had an empty right-hand field
plane carrying only the echo text, and the first attempt at filling it was
the ambient day-mark at 440px (`839830c`). That was wrong and was removed the
same day: at that size the ring had to be cropped by the screen edge to sit
beside the sign-in card, and **a cropped circle reads as off-centre rather
than as deliberate framing**. The author called it, correctly.

The rotating tagline went in instead (`fce135f`), then into the landing hero
(`30c869c`), where the component dropped in unchanged — it is markup plus
keyframes with no `"use client"`, so the landing page stays a server
component.

## The four readings

Not a thesaurus dump, and the distinction is the point. "fits" is the
product's actual capacity thesis. The other three — "adds up", "balances",
"closes out" — are accounting terms the name *Ledger* already invokes. They
are a set that means something together rather than four ways to say one
thing, which is what keeps the rotation from reading as motion for its own
sake.

## Two rules it had to be reconciled with

**1. The motion allowance permits exactly two kinds.** `DESIGN.md`'s
landing-surface addendum lists (a) one ambient background treatment per
screen and (b) one scroll-triggered entrance per section. A cycling word is
neither, so it was written in as **allowance (c)** rather than left to look
like drift.

**2. "typewriter effects" is on the ban list.** This is not that. A
typewriter effect reveals per character with a cursor and draws the eye
letter by letter; this is a whole-word crossfade at a period slower than most
ambient loops. Different technique, different attention cost — but close
enough that the distinction is stated explicitly in `DESIGN.md` so the next
reader doesn't have to re-derive it.

Removing the day-mark from the auth screens had a second benefit: it let the
**one-ambient-per-screen cap go back to having no exceptions**, reverting the
carve-out that had been added hours earlier to accommodate it.

## Mechanics, and why they satisfy the rules rather than bend them

- **All four readings share a single CSS grid cell.** The container is
  therefore sized by the widest reading and the line never reflows as words
  swap. This is what keeps the animation to `opacity` and a 6px
  `translateY` — a rotator that resized to each word would be animating
  `width`, which the addendum bans outright.
- **18s cycle, 4.5s per reading**, with each word's fade-out window being
  exactly the next one's fade-in, so there is no blank beat between them.
- **No JavaScript.** Keyframes plus a `--i` index per slot, consistent with a
  repo that hand-rolls all its motion.
- **`prefers-reduced-motion: reduce`** stops the cycle and holds "fits." —
  the same "render at mid-state and hold" treatment ambient layers get, not a
  removal.

## The refactor that mattered more than the feature

On the auth screens, having all four readings present as DOM text was a
cosmetic wart, patched with `user-select: none` so a selection didn't copy
all of them.

**On the landing page it was not cosmetic.** The `<h1>` is the most
index-relevant string on the public marketing surface, and with the readings
as DOM text it would have been crawled as:

> "A day that fits. fits. adds up. balances. closes out."

— directly contradicting the `metadata.title` set a few lines above it in the
same file.

The fix: **the readings live in the stylesheet as `::after` content.**
Generated content is not DOM text, so the heading's only real text is the
canonical sentence in the visually hidden span beside the rotator. That one
span now does triple duty — accessible name, indexable heading text, and what
a selection copies — which also made the `user-select` patch redundant.

The trade is that the words sit in CSS rather than TSX. They belong there:
the keyframe percentages already hard-encode a four-item cycle, so the word
list and the timing are one coupled thing, and splitting them across two
files is what would let them drift. A caller passing three or five words to a
generic `<RotatingWord words={…}>` would silently get a broken rhythm, which
is why the component deliberately owns its list instead of taking a prop.

## What was verified, and how

Inference was not sufficient here — an earlier check in this same work used
`innerText`, which reported all four readings and looked like an
accessibility bug. It was not: `aria-hidden` governs the accessibility tree,
not `innerText`. Each claim below was therefore checked against the thing it
actually asserts:

| Claim | How it was verified |
|---|---|
| Screen readers get one stable tagline | Real accessibility tree read via CDP `Accessibility.getFullAXTree` — contains exactly one heading string, `"A day that fits."` |
| Crawlers see the canonical sentence | `h1.textContent` is `"A day that fits."`; server-rendered HTML (`curl`) ships the rotator slots **empty** |
| Selection copies cleanly | Programmatic `Range` selection over the echo block → `"A day that fits. One sentence in, a finite day out."` |
| The cycle actually cycles | Sampled visible reading every 4.6s → `fits. → adds up. → balances. → closes out. → fits.` |
| The widest reading doesn't break the hero | `"A day that closes out."` holds one line at 56px; `h1` height unchanged at 57px, no overflow |
| Reduced motion genuinely freezes | Animation name `none` on all slots, and the visible reading is unchanged after a 2.6s wait — on `/`, `/login`, and `/signup` |

Both themes checked. `tsc` clean, 0 lint errors, 38/38 tests.

## Notes for whoever touches this next

- **Don't "simplify" the `::after` content back into DOM text.** It will look
  tidier and it will silently break the landing `<h1>`'s indexed text. The
  reasoning is duplicated in the stylesheet header for exactly this reason.
- **The four-item count is encoded in the keyframe percentages** (25% / 28%
  boundaries). Adding or removing a reading means recomputing them, not just
  editing the word list.
- The component lives at `ui/type/TaglineWord.tsx` — a new `ui/type/`
  directory for typographic components, distinct from `ui/graphics/`, which
  `CLAUDE.md`'s module map describes as the day-mark's home.
