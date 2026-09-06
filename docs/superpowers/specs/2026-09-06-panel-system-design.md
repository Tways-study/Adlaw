# The panel system — porting the reference architecture

**Date:** 2026-09-06
**Status:** approved, not yet built
**Amends:** `DESIGN.md`, `CLAUDE.md`
**Source:** `styles.refero.design/style/2bf4c61f-de10-4614-ba1b-20c0453bd2a9`
(Notion — "warm paper notebook under afternoon sun")

## Why this exists

`DESIGN.md`'s 2026-08-18 pivot already cites this exact reference and took its
**palette**: warm neutrals, Notion Blue `#0075de`, Sky Tint, and a reserved
accent cast parked in the token set for "possible future decorative use."

What it did not take is the reference's **architecture** — the thing the palette
was extracted from. In the reference, color is not a set of tokens sitting
unused; it is the page's structural rhythm. Feature blocks are full-bleed
colored mats with white cards floating on them. A single verb in the hero
headline wears a colored pill. One section inverts to midnight. An editorial
serif carries section intros.

Adlaw today renders none of that. The live landing page is a uniform warm-gray
column, section after section, separated by hairlines. It is competent and
quiet, and it is monotone.

This spec ports the architecture. It keeps every measured accessibility
guarantee the current system holds, and it keeps the four things that make the
product itself: the day-mark, the rotating tagline, the two-color functional
discipline inside the board, and first-class dark.

### The in-flight work this builds on

The working tree already carries an unfinished first attempt:
`ui/landing/landing.module.css` has a `.bleed` full-bleed wrapper,
`ui/tokens.css` has four `--wash-*` tokens, and `Failure.tsx` / `HowItWorks.tsx`
were rewritten to render their own `.bleed > .shell > …` triple.

None of it is wired. `app/page.tsx` still wraps the whole document in one outer
`.shell`, so shells double-nest, and no `accent` prop is ever passed — which is
why the washes render on nothing. The `.bleed` element and its "never
`width: 100vw`" reasoning are correct and are kept. The `--wash-*` tokens are
superseded by `--panel-*` (same pinned-L reasoning, roughly double the chroma,
plus a light-theme treatment the washes never had).

## Scope

| Surface | Treatment |
|---|---|
| `/` | Full redesign — panels, centered hero, pill, midnight island, serif leads |
| `/login`, `/signup` | Serif lead, pill on the echo tagline; ambient sweep unchanged |
| `/board`, `/schedule`, `/settings` | **Material audit only.** No new color, no new layout |
| `DESIGN.md`, `CLAUDE.md` | Amended |

The board is excluded from the color work deliberately. `--primary` means
committed/planned and `--alert` means past the edge of the day; a marigold task
card would put a third signal into a surface whose entire job is making
overcommitment legible. `PRODUCT.md`'s ranked failures are the tiebreaker and
overcommitment is second only to abandonment.

## Tokens

### Panels — light

Panels are pinned to **OKLCH L = 0.80**. That value is not chosen by eye: it is
the lightness at which `--ink` (`oklch(0.22 0.004 68)`) clears 7:1 against the
panel, which leaves headroom above the 4.5:1 floor `PRODUCT.md` sets as
non-negotiable.

```css
--panel-marigold: oklch(0.80 0.16  75);   /* #f9ad26 */
--panel-coral:    oklch(0.80 0.10  34);   /* #f7a693 */
--panel-sky:      oklch(0.80 0.09 240);   /* #87c6f2 */
--panel-mocha:    oklch(0.80 0.045 55);   /* #d5b7a3 */
--panel-midnight: oklch(0.22 0.055 265);  /* #0e1934 */
```

Measured, `--ink` on each: marigold **9.06:1**, coral **8.94:1**, sky
**9.39:1**, mocha **9.17:1**. `--on-midnight` (near-white) on midnight:
**17.39:1**.

Chroma differs per hue because sRGB gamut at L=0.80 differs per hue — blue
cannot hold 0.16 there, marigold can.

**Coral departs from the reference swatch, and this is deliberate.** The
reference's `#f64932` sits at L 0.65, where black text measures **3.45:1** and
white text **3.55:1** — *both* fail body-size AA. The reference survives this by
only ever putting display type on coral. Adlaw's bands carry body copy, so
coral moves up to the panel L and keeps its hue. It reads as a warm salmon.
This is the one place where following the reference exactly would have shipped
an accessibility failure.

### Panels — dark

The reference specifies no dark theme. These are derived.

A full-bleed L=0.80 marigold band on a dark page is punishing at night and
breaks `PRODUCT.md`'s "quiet at rest." So dark panels pin **L to `--desk`
(0.145)** and carry the hue in chroma alone:

```css
--panel-marigold: oklch(0.145 0.042  75);   /* #140700 */
--panel-coral:    oklch(0.145 0.045  34);   /* #190301 */
--panel-sky:      oklch(0.145 0.040 240);   /* #000c19 */
--panel-mocha:    oklch(0.145 0.028  55);   /* #130702 */
--panel-midnight: oklch(0.25  0.05  265);   /* #16213a */
```

**Why pin L to `--desk`.** Dark `--card` (0.205) against dark `--desk` (0.145)
measures **1.10:1** — that is the separation every card in the product already
relies on, carried the rest of the way by `--edge`. Pinning a panel to desk's L
makes card-vs-panel measure **1.10–1.11:1**: numerically the same separation.
The canvas/card hierarchy therefore cannot invert on a panel, which is the ban
`DESIGN.md` calls out as reading "as a mistake, not a variation."

This is the pinned-L reasoning the in-flight `--wash-*` comment already worked
out. The chroma is roughly doubled (0.028–0.045 vs 0.014–0.022) because the
original values were not actually visible.

**Midnight in dark cannot invert** — there is nothing to invert against. It
becomes a *raised slab* at L 0.25, above `--card` (1.12:1) and above `--desk`
(1.23:1), with `--edge`. It reads as a distinct object rather than a hole.

### The asymmetry, stated plainly

Light panels are a **colored mat** the page sits on. Dark panels are a **tinted
region of the ground**. This is not an oversight and not an inversion — it is
`DESIGN.md`'s own "light and dark are both first-class; neither is an inversion
of the other," applied.

### Pills

```css
--pill-marigold: oklch(0.80 0.16  75);
--pill-coral:    oklch(0.80 0.10  34);
--pill-sky:      oklch(0.80 0.09 240);
--pill-mocha:    oklch(0.80 0.045 55);
--on-pill:       oklch(0.22 0.004 68);
```

**These four hold their light-theme value in both themes, and `--on-pill` is
always the dark ink.** `--on-pill` on each pill measures 8.94–9.39:1 in either
theme; against dark `--desk` a pill carries a 10.2–10.7:1 halo, which is exactly
the bright-chip-on-dark-ground read the reference gets from a sticky note.

### Panel text rule

`--ink-2` measures **4.43:1** on marigold and **4.37:1** on coral — under the
floor. `--ink-3` fails on all four (3.04–3.19:1).

> **Text directly on a light panel is `--ink` and nothing else.** Anything
> needing a secondary or meta tone sits on a `--card` surface, where the full
> ink ladder is available.

Dark panels do carry the full ladder (`--ink-2` 9.68–9.77:1, `--ink-3`
6.46–6.52:1), but the rule is written for the stricter theme so one rule serves
both. This also matches the reference, whose panel text is a single tone.

### Area rule

> **Large fills track the theme; chips hold their light value.** A saturated
> full-bleed band is fatiguing at night and is dimmed in dark. A chip of one
> word or one line is punctuation, stays bright in both themes, and must read as
> the same object either way.

This is the general principle behind the panel/pill split above. It is new to
the system and is the reason two token families exist for four hues.

## Surfaces

### `/` — hero

Centered stack, `.shell` unchanged at 1080px.

Order: audience line → `<h1>` with pill → serif lead → the single
`--primary-fill` CTA → capture demo.

**Display 1 gains one rung.** The existing ladder is 20 → 28 → 40 → 56 at a
constant 1.4 ratio; 56 × 1.4 = 78.

```
D1  clamp(2.5rem, 1.65rem + 3.63vw, 4.875rem)     40 → 78px
```

Every fixed term stays in `rem`. A pure-`vw` clamp violates WCAG 2.2 SC 1.4.4;
the rem intercept is what preserves the reader's browser font-size setting.
Verify: at 375px → 40px; the clamp reaches 78px at ~1421px viewport.

**Tracking stays −0.024em.** The reference specifies −0.048em at 96px, but that
is NotionInter. `DESIGN.md`'s note that Inter's dynamic-metrics curve asymptotes
near −0.022em is correct and is not overturned; extrapolating produces exactly
the squashed logotype it warns about. D2 and D3 are unchanged.

**The ambient day-mark moves to centered behind the stack**, ~560px,
`z-index: -1`, otherwise unchanged (stroke, opacity, 140s rotation,
`prefers-contrast: more` and `prefers-reduced-motion` behavior all as-is).
`DESIGN.md` already records that a ring cropped by the screen edge "reads as
off-centre rather than as deliberate framing" — that is why it was pulled from
`/login` on 2026-08-23. Centering removes the crop, so the objection does not
apply here. It remains one ambient layer, within the one-per-screen cap.

### `/` — the pill, and the reading↔band mapping

The four tagline readings map to the four failure bands, in `PRODUCT.md`'s rank
order:

| Reading | Pill | Band | Failure | Functional color already in that band |
|---|---|---|---|---|
| fits | marigold (75) | 1 | Overcommitment | `--primary-fill` (254) + `--alert` (31) |
| adds up | coral (34) | 2 | Cold start | `--primary` (254) |
| balances | mocha (55) | 3 | Deadline ambush | `--primary-fill` (254) + `--alert-ink` (31) |
| closes out | sky (240) | 4 | Abandonment | none |

The hue assignment is **not** free: it is the maximum-hue-distance reasoning
already written into `landing.module.css`'s band comment, and it is load-bearing.
Band 2's `FocusCard` renders `--primary`, so sky (hue 240) behind it would be a
blue panel under blue content — coral sits opposite. Band 3 competes with two
functional colors at once, so it gets mocha, the lowest-chroma panel, rather
than trying to out-hue both. Band 4 renders no functional color at all, which is
precisely what makes sky safe there. The readings map onto that fixed order;
the order is not derived from the readings.

The hero rotator therefore cycles the page's own color order: the pill on
"fits" is marigold and the first band you scroll into is marigold. The rotation
stops being decoration and becomes the document's table of contents. This is the
invented part of this spec rather than the ported part, and it is the reason
the result reads as Adlaw rather than as a Notion tribute.

**Mechanics.** `ui/type/TaglineWord.tsx` already stacks four readings as
`::after` content in a single CSS grid cell. Each reading gets its **own** pill
background on its own `::after` box — four pills, not one pill that resizes. The
grid cell auto-sizes to the widest reading including its padding, so nothing
animates layout and the `width`/`height` ban holds. Padding `0.10em` block /
`0.30em` inline, `border-radius: var(--r-pill)`.

**The `::after`-content mechanism is load-bearing and must survive.** Readings
stay out of the DOM so `h1.textContent` remains `"A day that fits."` — the
visually hidden span beside the rotator carries the accessible name and the
indexable heading text. Under `prefers-reduced-motion: reduce` the cycle stops
and "fits." holds, wearing its marigold pill.

The same pill applies to the echo tagline on `/login` and `/signup`.

### `/` — the four bands

Each `Failure` gets `accent` wired from `app/page.tsx`, painting `data-accent`
on its `.bleed`. White `--card` miniatures float on the panel. Text directly on
the panel is `--ink` only, per the panel text rule.

Card-vs-panel luminance in light is 1.84–1.94:1. That is a decorative boundary,
not a UI component conveying information, so WCAG 1.4.11's 3:1 does not apply —
and each card carries `--edge` regardless.

The existing `.bleed[data-accent] .band { border-top: 0 }` rule is kept: a
panel's own color edge already divides it from its neighbor, and a hairline on
top of that reads as a seam.

### `/` — the midnight island

The closing "A day has a finite number of hours" section becomes
`--panel-midnight` with `--on-midnight` text.

**The timeline inside keeps its own `--card` surface**, floating on the midnight
mat with `--edge` (not a shadow — the reference uses a drop-shadow here; our
system uses hairlines and there is no reason to make an exception). This is the
reference's "product mockup on a colored panel" move, and it means the capacity
colors — `--primary`, `--alert`, `--busy` — never touch the midnight ground and
need **zero re-tuning**.

### Serif

`Source Serif 4` (already loaded as `--font-accent` in `app/layout.tsx`) takes
the **lead paragraph** under section headings on `/`, `/login`, `/signup`.
17px / 1.55 / weight 400. Roughly five instances. `--ink-2` on `--desk`;
`--ink` on a panel.

This is the reference's Lyon Text role: "a system accent, not a parallel
hierarchy." The focus card's reason line inside the board is unaffected.

## Board material pass

Not a redesign. Six items, four code and two documentation.

1. `ui/board/TaskCard.module.css:174` — `.retryBtn` uses `color: var(--primary)`
   on `--card`. Measures **4.56:1** at 11px: it passes by 0.06. `--primary-ink`
   measures 6.85:1. Switch it.
2. `ui/board/TaskCard.module.css:404` — `.undo`, same token. Measure against its
   actual ground, then switch.
3. `ui/board/DeleteUndoContext.module.css:20` — **the real one.** `.toast` sets
   `background: var(--ink)`: an inverted surface, near-black in light and
   near-white in dark. Its `.undo` link measures **3.80:1 in light and 2.09:1
   in dark**, and `--primary-ink` is *worse* at 2.53:1 — both blues were tuned
   against normal-polarity grounds, so neither can serve here. This is the
   control that reverses a destructive delete, and at 2.09:1 it is a genuine
   AA failure, not a margin case.

   It gets a new token, `--primary-on-ink`, whose derivation is just the
   polarity flip: **an inverted surface takes the other theme's blue.** Light
   (near-black ground) takes dark's `--primary`, `oklch(0.75 0.16 254)` →
   7.58:1. Dark (near-white ground) takes light's `--primary-ink`,
   `oklch(0.47 0.17 254)` → 6.27:1. The toast's own `--desk`-on-`--ink` body
   text is fine at 15.87:1 / 18.14:1 and is not touched.
4. `border-radius: 11px` in `ui/capture/CaptureBar.module.css:80`,
   `ui/landing/CaptureDemo.module.css:14`, `ui/landing/demos/demos.module.css:334`
   — off-scale literals against 70 tokenized uses elsewhere. **Keep the value,
   add the comment.** All three are an inner surface sitting inside a 12px
   container behind a 1px inset edge, and 12 − 1 = 11 is the correct nested
   radius: concentric corners need the inner radius reduced by the offset or
   the curves visibly diverge. It reads as drift only because it is
   undocumented. Do not tokenize it — a `--r-l-inner` token for three call
   sites is worse than three comments.
5. **`DESIGN.md` is stale.** It states `ui/capture/CaptureBar.module.css` "still
   ships the failing pairing." It does not — line 70 already uses
   `--primary-ink` with the reasoning in a comment. Correct the claim.
6. **`CLAUDE.md` contradicts `DESIGN.md`.** It still bans "warm-neutral
   surfaces" and the token names that come with them, but the 2026-08-18 pivot
   made `--desk` warm on purpose and `DESIGN.md` says so explicitly. Reconcile:
   the ban is on *textures and props*, not on a warm flat canvas color.

## Documentation amendments

`DESIGN.md`:

- §Color → Tokens: add `--panel-*`, `--pill-*`, `--on-pill`, `--on-midnight`
  for both themes, with the measured ratios.
- §Color → Rules: add the **panel text rule** and the **area rule**. Amend "the
  reserved accent tokens are not wired into any component in v1" — they are now
  wired, on public surfaces only, as panels and pills. The prohibition that
  survives: no accent in board UI chrome and no per-course color.
- §Typography: D1 gains the 78px rung; restate that tracking stays flat.
- §Landing surface: centered hero, day-mark centered ambient, serif lead role.
- §Components → day-mark: record that centering removes the crop objection.
- §Components → rotating tagline: record the pill and the reading↔band mapping.
- §Bans: the Source Serif 4 line becomes "never a button, label, or data
  value." Correct the stale CaptureBar claim.

`CLAUDE.md`: fix the warm-neutral-surfaces contradiction.

## Verification

- Both themes, real browser, at 375 / 768 / 1440.
- `prefers-reduced-motion: reduce` — rotator holds "fits." with its pill;
  day-mark still; entrances at end state.
- `prefers-contrast: more` — ambient day-mark hidden, as now.
- `h1.textContent === "A day that fits."`
- Server-rendered HTML ships rotator slots empty.
- Every new pairing measured with a real contrast checker, not by inspection.
- `npx tsc --noEmit`, `npm run lint`, `npm test`.

**Do not run `npm run build`.** A dev server is live on port 3001 and building
clobbers its shared `.next/`, producing a bogus `auth/invalid-api-key`.

Note: `localhost:3000` is a different project. Adlaw's dev server is **3001**.

## Out of scope

Deliberately not taken from the reference:

- **Character marks** — flat illustrated faces, squiggles, sparkles, arrows.
  `PRODUCT.md` bans decorative illustration; the day-mark is the sanctioned
  equivalent, and it earns its place by being the capacity slot's own geometry.
- **1440px max-width, 80px section gaps** — 1080px and 96px are documented
  decisions with a stated reason (prose measure at 17px).
- **−0.048em display tracking** — wrong typeface.
- **Alpha-based ink hierarchy** — the discrete `--ink` ladder is measured against
  a known ground; alpha over a varying panel would make every ratio a function
  of what sits underneath.
- **Accent color anywhere in the board**, and any per-course color system.
