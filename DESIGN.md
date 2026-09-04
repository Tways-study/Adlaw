# Design

The visual system. Strategy lives in `PRODUCT.md`; this file is how it looks
and moves.

**2026-08-18 pivot:** the palette below is deliberately adapted from Notion's
live design system (profiled at
`styles.refero.design/style/2bf4c61f-de10-4614-ba1b-20c0453bd2a9`), replacing
the prior chroma-0 / exactly-two-color system. This is a considered decision,
not drift — see `PRODUCT.md`'s Anti-references for the boundary that still
holds (the palette is borrowed; the "generic container" information
architecture Notion actually ships is still the thing this product exists to
avoid). Light-theme values are adapted from the source with mechanical
sRGB→OKLCH conversion; dark-theme values are an original derivation — the
source only specifies a light palette — built by applying this system's own
previously-verified light→dark deltas (per-token ΔL/ΔC, hue held constant) to
the new hue family, then spot-checked for the same AA floor the old palette
held.

## Theme

**An object, not a document.** Surfaces have mass, edges catch light, and things
respond under the hand. Physicality comes from material, depth, and motion —
never from props. No paper textures, tape, stains, rotation jitter, or
skeuomorphic ornament of any kind. **"Paper Warmth" below is a flat canvas
color, not a paper texture** — the no-skeuomorphism rule is unaffected by the
palette pivot; a warm hex value is not a prop.

Calm at rest, expressive only under interaction. Reference sensibility: Things 3
and Apple — generous space, soft depth, opinionated about what you don't see.

Light and dark are both first-class. Neither is an inversion of the other.

## Color

**Strategy: near-monochrome, one commitment.** Warm-toned neutrals carry the
interface, with exactly one saturated brand color (blue) as "the single
chromatic commitment," plus one dedicated alert red used for exactly one
thing:

- **Primary (blue)** — committed, planned, complete, selected, focused.
- **Alert (red)** — past the edge of the day. Nothing else.

A reserved accent cast exists in the token set (below) for possible future
decorative use — empty-state illustration, feature moments — and is **not**
used in UI chrome, buttons, or any functional signal in v1. The interface
itself stays a two-color system in practice, even though the token palette is
now wider than that.

There is still no per-course color system. Courses are text labels. This rule
is accessibility-motivated (color-blind-safe distinction across many courses
isn't achievable with color alone), not aesthetic purism, and holds regardless
of how many colors the palette makes available.

### Tokens

Color is OKLCH. Neutrals now carry a small warm chroma (not `0`) — this is the
one deliberate exception to the prior "chroma-0 neutrals" rule, adopted
because "Paper Warmth" is the signature of the palette being ported in.

```css
:root{                                      /* light */
  --desk:oklch(0.970 0.003 68);             /* "Paper Warmth" — the ground */
  --rail:oklch(0.950 0.004 68);             /* second neutral layer: sidebar */
  --card:oklch(1 0 0);                      /* Pure White — cards only, never the page bg */
  --card-hi:oklch(0.995 0.001 68);          /* hover */
  --ink:oklch(0.22 0.004 68);
  --ink-2:oklch(0.42 0.005 68);             /* secondary */
  --ink-3:oklch(0.505 0.005 68);            /* meta — the AA floor, do not lighten */
  --line:oklch(0.875 0.005 68);
  --line-soft:oklch(0.925 0.004 68);
  --primary:oklch(0.568 0.182 254);         /* Notion Blue #0075de — text + indicators */
  --primary-fill:oklch(0.53 0.18 254);      /* filled surfaces, white text */
  --primary-soft:oklch(0.958 0.020 243);    /* Sky Tint #e6f3fe — ghost buttons */
  --alert:oklch(0.59 0.22 31);              /* Vermillion #e32d14 */
  --alert-soft:oklch(0.95 0.035 31);
  --on-fill:oklch(1 0 0);
  --busy:oklch(0.885 0.004 68);             /* committed time blocks */

  /* Reserved accent cast — decorative use only, never UI chrome or a functional signal */
  --accent-marigold:oklch(0.80 0.16 75);    /* #ffb110 */
  --accent-coral:oklch(0.651 0.213 31);     /* #f64932 */
  --accent-mocha:oklch(0.60 0.06 45);       /* #b18164 */
  --accent-sky:oklch(0.78 0.09 240);        /* #62aef0 */
}
:root[data-theme="dark"]{
  --desk:oklch(0.145 0.004 68); --rail:oklch(0.115 0.004 68);
  --card:oklch(0.205 0.005 68); --card-hi:oklch(0.235 0.005 68);
  --ink:oklch(0.97 0.004 68); --ink-2:oklch(0.775 0.005 68); --ink-3:oklch(0.665 0.005 68);
  --line:oklch(0.30 0.006 68); --line-soft:oklch(0.245 0.005 68);
  --primary:oklch(0.75 0.16 254); --primary-fill:oklch(0.50 0.17 254);
  --primary-soft:oklch(0.275 0.05 254);
  --alert:oklch(0.74 0.19 31); --alert-soft:oklch(0.29 0.06 31);
  --on-fill:oklch(1 0 0); --busy:oklch(0.26 0.005 68);
}
```

Dark tokens are duplicated under `@media (prefers-color-scheme:dark)` guarded by
`:root:not([data-theme="light"])`, so the explicit toggle wins in both directions.

### Rules

- `--primary` is for text and indicators; `--primary-fill` is for filled surfaces
  and always carries white text. They are separate tokens because a fill bright
  enough to read as brand in dark mode cannot hold white text.
- **`--primary-ink` / `--alert-ink` are for text on a tint or on the canvas.**
  Measured in light theme, the obvious pairings miss the AA floor that
  `PRODUCT.md` sets as non-negotiable: `--primary` on `--primary-soft` is
  **4.05:1**, `--alert` on `--alert-soft` is **3.88:1**, and `--alert` on
  `--desk` is **4.21:1** — all below 4.5:1 for body-size text. The `-ink`
  variants are darker in light (6.06:1 and 5.63:1) and simply track `--primary`
  / `--alert` in dark, where those already clear the floor. Keep `--primary` and
  `--alert` for fills, bars, and rules, where the text floor doesn't apply.
  *This was found while building the landing surface;
  `ui/capture/CaptureBar.module.css` still ships the failing pairing, so the
  board should adopt `--primary-ink` for its chips.*
- `--ink-3` is at the 4.5:1 floor in both themes — the same floor the prior
  palette held; adding warm chroma at this low a level doesn't move OKLCH `L`
  enough to matter, but **verify with a real contrast checker before shipping,
  not by inspection.** Lightening it for elegance is the single most common way
  this system breaks.
- Dimming (`.past`, opacity) must be gentler in dark than in light — `0.45` light,
  `0.6` dark. Dark grounds destroy legibility far faster.
- Only one `--primary-fill` call-to-action per screen. A second one competes
  with the first and both lose their weight.
- Don't invert the canvas/card hierarchy — `--desk` (warm, dim) stays under
  `--card` (white, brighter). A white page with warm cards reads as a mistake,
  not a variation.
- The reserved accent tokens are not wired into any component in v1. Using one
  in UI chrome is the palette equivalent of the per-course-color failure mode:
  it reads as decoration competing with the two signals that actually mean
  something.

## Typography

Two families. **Inter** (400/500/600/700) as the primary UI face — an open,
self-hostable stand-in for the source system's proprietary font, not a
compromise; it was already this doc's fallback. **Source Serif 4** as a
secondary accent, used in exactly one place: the AI's one-line reason on the
focus card (the interface's one moment of written, human-register voice, per
`05-design-brief.md`'s "Voice" section). It is a system accent, not a parallel
hierarchy — never buttons, labels, or data.

Fixed rem/px scale, not fluid — users view at consistent DPI and a clamped heading
that shrinks in a column looks worse, not better.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Day title | 20px | 600 | −0.02em |
| Focus card title | 17px | 550 | −0.018em |
| Focus card reason (serif accent) | 14px | 400 | 0 |
| Card title | 13.5px | 500 | −0.006em |
| Body / UI | 14px | 400 | 0 |
| Lane heading | 12.5px | 600 | −0.005em |
| Meta, labels | 11.5px | 400–600 | 0 to +0.02em |

Tracking is size-specific: tighten as size grows, near zero at body, slightly
positive on small caps-ish labels. Never one letter-spacing value across the scale.

All durations, counts, clock times, and dates use `font-variant-numeric:
tabular-nums` so columns of numbers don't shimmer as they update.

## Spacing

Base unit `4px`, comfortable density. Card padding `24px`, element gap `8px`.
(The source system's marketing-page values — `1440px` max-width, `80px`
section gaps — don't apply here; this is an app board, not a landing page,
and those are not adopted.)

## Depth and material

Elevation now separates *resting* surfaces from *interactive/transient* ones,
per the adopted system's "no shadows on content cards" rule:

- **Resting cards and panels use `--edge` only** (a hairline border, below) —
  no shadow. This replaces the prior `--lift-2` role.
- `--lift-1` — pressed/inline chrome (buttons, segmented control). Still a
  shadow — this is interactive chrome, not a resting card, matching the
  source system's own treatment of its nav and product-UI chrome.
- `--lift-3` — lifted while dragging. Only ever transient, and still a real
  shadow — a card mid-drag is not "resting," and losing that cue would make
  drag read as static.
- `--edge` — a 1px inset hairline. In dark it becomes a **top highlight**
  (`inset 0 1px 0 oklch(1 0 0/.06)`), which is the light-catching edge that makes
  the surface read as machined rather than flat.
- `--groove` — an inset shadow where the rail meets the day. A seam, not a border.

The capture bar is a translucent layer with content running underneath it, not an
opaque strip that eats a fixed band of screen.

Radii: `4px` small, `8px` buttons and small cards, `12px` cards and panels
(including the focus card — no larger). `9999px` is reserved for pills only,
never a general-purpose "rounder" card radius.

## Motion

Springs for anything the user touches; short eased transitions for everything else.

| Interaction | Parameters |
|---|---|
| Card settle after drop | Critically damped, `bounce 0.12`, `response 0.4`, carrying release velocity |
| Capacity meter | Critically damped, `response 0.45` |
| Hover, color, chrome | 120–200ms, `cubic-bezier(.22,1,.36,1)` |
| Button press | `scale(0.975)`, 110ms, on pointer-**down** |

These are unchanged by the palette pivot — they're interaction physics, not
color. The adopted source system (a marketing site) only specifies generic
"200ms ease" hover transitions, which this table's 120–200ms range already
covers; it says nothing about drag/spring physics, so that craft stays as
previously tuned.

Rules that are not negotiable:

- Feedback fires on pointer-down, never on release.
- Drag tracks 1:1 and respects the grab offset. Never snap to the card's center.
- Animate from the current on-screen value, never the target. Every animation is
  interruptible.
- Only `transform` and `opacity`. No animated layout properties.
- No orchestrated page-load sequence. The board loads into a task.
- `prefers-reduced-motion: reduce` replaces springs with instant settles and
  cross-fades. Content is never gated behind a reveal transition.

**Implementation note (2026-09-04):** the card-settle and capacity-meter rows
above are now real springs, built with Framer Motion rather than hand-rolled —
a deliberate, one-time exception to `CLAUDE.md`'s "hand-written CSS… no
component library" and to this doc's own `animation-timeline: view()` landing
entrances being "no JS, no library, consistent with a repo that hand-rolls all
motion." The exception is narrow on purpose: it covers only the two rows a
plain CSS transition provably cannot satisfy — carrying release velocity into
the animation, and staying interruptible mid-flight (grabbing a settling card
must redirect it, not wait for it to finish). Every other row in this table —
hover/color/chrome, button press — is still plain CSS, and the landing
surface's entrances, sweep, and tagline rotator are untouched. `ui/drag/
springs.ts` is the one place the two spring configs are defined; nothing
imports Framer Motion outside `ui/drag/useDraggableCard.ts` and
`ui/board/BoardHeader.tsx`. Writing this down so a later reader finds a
decision, not drift — the same failure mode that produced the stale
`--lift-2` and prototype-color confusions this doc already warns about.

## Landing surface (addendum, 2026-08-22)

**Scope: `/` and `/login` only. Inside the board every rule above holds
unchanged.** These two surfaces have an audience the rest of this document was
never written for — a first-time reader on an unknown device, including a phone.
Where a rule's stated justification doesn't reach that reader, it is relaxed
here and nowhere else.

### Display type

Not a second scale — three more rungs on the existing ladder, seeded at the 20px
day title at a constant 1.4 ratio: 20 → 28 → 40 → 56.

| Role | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Display 1 — hero | 56px | 600 | −0.024em | 1.02 |
| Display 2 — section | 40px | 600 | −0.023em | 1.10 |
| Display 3 — band heading | 28px | 600 | −0.021em | 1.22 |
| Lead prose | 17px | 400 | −0.011em | 1.55 |

**Tracking flattens; it does not keep tightening.** The instinct is to
extrapolate the app curve (−0.006em at 13.5px → −0.02em at 20px) out to −0.04em
at 56px. That is wrong for Inter, whose dynamic-metrics curve asymptotes near
−0.022em — 20px/−0.02em is already essentially there. Display sizes converge to
−0.021…−0.024em and never go past it. This is the single most likely thing to
get wrong later, and it looks like a squashed logotype.

Weight is **600, never 700**: 700 at 56px is shouty and contradicts "quiet at
rest". No new body size — landing prose reuses the existing 17px rung at weight
400.

### `clamp()` — a documented exception

§Typography says the scale is fixed rem/px, not fluid, because "users view at
consistent DPI". That justification is a claim about one student on one laptop
looking at a board. It does not reach a public page, where a fixed 56px headline
at 375px produces roughly six characters per line and horizontal overflow — a
worse outcome than anything the fixed-scale rule was written to prevent. The
rule is not overturned; its premise simply doesn't extend here.

**Permitted for the three display sizes, on the landing surface, and nowhere
else.** Not the lead, not body, not any app text, not spacing.

```
D1  clamp(2.125rem, 1.5rem  + 2.67vw, 3.5rem)     34 → 56px
D2  clamp(1.625rem, 1.23rem + 1.70vw, 2.5rem)     26 → 40px
D3  clamp(1.375rem, 1.20rem + 0.73vw, 1.75rem)    22 → 28px
```

**Every fixed term is in `rem`, never `px` — this is load-bearing.** A pure-`vw`
clamp violates WCAG 2.2 SC 1.4.4 (Resize Text): the text stops responding to the
reader's browser font-size setting. The rem intercept is what preserves scaling,
and it is why these numbers look arbitrary. Do not "simplify" them.

These live as custom properties scoped to the landing root in
`ui/landing/landing.module.css`, not as global tokens — the system has no type
tokens at all, and growing a global scale for one surface would break that
convention for no gain.

### Motion allowance

Still binding, unchanged: `transform` and `opacity` only, no animated layout
properties, hover/chrome at 120–200ms `cubic-bezier(.22,1,.36,1)`, press
feedback at `scale(0.975)` / 110ms on pointer-**down**, focus ring untouched.

Newly permitted, exactly two kinds:

**(a) One ambient background treatment per screen.** Period ≥ 20s, neutral
only — no hue shift, no chromatic token. Non-interactive, `aria-hidden`,
`pointer-events: none`, maximum one element. `/login`'s sweep is the shipped
reference: opacity 0.35 → 0.80 → 0.35 (a 0.45 delta) over 40s, tuned and
contrast-verified — any real content sitting near an ambient layer needs its
own stacking order above it (`z-index: 1`, matching `.content`), so its
contrast against the canvas can't fluctuate as the animation runs.
The "every animation is interruptible" rule targets gesture-driven motion and
does not apply to a non-interactive ambient layer. `/login`'s light sweep is the
one instance; it uses `--sheen`.

**(b) One scroll-triggered entrance per section.** ≤ 200ms, ≤ 8px translate, via
native CSS `animation-timeline: view()` — no JS, no library, consistent with a
repo that hand-rolls all motion.

**The entrance must animate `transform` only — never `opacity`.** This is the
hard part and it was got wrong first. An opacity-gated reveal leaves every
below-the-fold section at `opacity: 0` until scrolled into view, so a full-page
screenshot, a print, a headless renderer, or a background tab captures a blank
page. That is exactly what §Motion's "content is never gated behind a reveal
transition" forbids. Author the resting state as the final visible state, let
the keyframes supply only the from-state, use `animation-duration: auto`, and
wrap the whole thing in `@supports (animation-timeline: view())`. Unsupporting
browsers then land on the end state immediately: the failure mode is "no
animation", never "invisible content".

Banned on this surface: parallax · scroll pinning or hijacking · animated
counters · typewriter effects · staggered list cascades · more than one ambient
layer per screen · any animation of `background-position`, `width`, `height`,
`top`, or `left`.

**(c) One rotating word, in the tagline only.** Added 2026-08-23. The final
word of "A day that ___" cycles through four readings of how a day resolves — in the
landing hero's `<h1>` and in `/login` and `/signup`'s echo line. Strictly
scoped: one instance per screen, one word, `transform` and `opacity` only,
≥ 4s per word (an 18s cycle), and the readings are stacked in a single CSS
grid cell so the container is sized by the widest and *nothing* animates
layout — the `width`/`height` ban is not bent.

This is **not** the banned typewriter effect, which reveals per character
with a cursor and draws the eye letter by letter; this is a whole-word
crossfade at a period slower than most ambient loops. It is nonetheless a
third motion kind on this surface, so it is written down rather than left to
look like drift. Under `prefers-reduced-motion: reduce` the cycle stops and
the canonical first word holds — the same "render at mid-state and hold"
treatment ambient layers get. The rotator is `aria-hidden`; a visually
hidden static copy of the full sentence carries the accessible name, so
assistive tech reads one stable tagline and never a word churning on a
timer.

`prefers-reduced-motion: reduce` gets a genuine alternative, not a removal:
ambient treatments render at their mid-state and hold, permanently still;
entrances resolve instantly to their end state. Nothing disappears, nothing is
dimmer, nothing is missing.

### Spacing

§Spacing rejects the source system's marketing values because "this is an app
board, not a landing page". That reason has now expired for exactly one surface.
Adopt, for the landing only: content max-width **1080px** (not 1440 — too wide
for 17px prose in this register), section rhythm **96px** desktop / **64px**
below 720px, prose measure **34em**. All multiples of the 4px base.

**Never `width: 100vw`** — it includes the scrollbar width and produces
horizontal overflow. Full-bleed bands set a background on the section element
itself and let the shell hold the content.

### The ban list still applies in full

Nothing in §Bans is relaxed here. In particular: at most **one**
`--primary-fill` call-to-action on the whole document (a scrolling page is
arguable, so don't argue it), no gradient text, no decorative glassmorphism, no
hero-metric tiles, no uppercase tracked eyebrows, no grain or texture, no
identical card grids, no radii above 12px, and the Source Serif 4 accent stays
on the focus card's reason line alone.

## Components

**Card.** The base unit. Cards differ by lane rather than repeating one rectangle:

- *Focus card* (Start here) — larger padding, `12px` radius, 17px title, the parent
  breakdown bar, and actions. Exactly one exists. Its one-line reason is the
  interface's sole use of the Source Serif 4 accent.
- *Queue card* (Then) — compact. Course label, title, duration, due hint.
- *Done card* — no shadow, no background, hairline separator, struck through at
  `--ink-3`. Deliberately minimal presence.

**Cutline.** A hairline in `--alert` with a soft-background label naming the real
boundary (`4:00 — work starts`). Cards below it dim. It moves as the queue changes.

**Capacity slot.** A recessed track with an inset shadow, a `--primary-fill`
segment, an `--alert` overflow segment past the notch, and a notch marking 100%.
Reads as a machined slot, not a progress bar.

**Timeline (Today's shape).** Time gutter plus two tracks: committed and planned.
Solid line for now, dashed alert line for the day's edge. Blocks crossing the edge
render in alert.

**Segmented control, capture bar, shelf item** — standard affordances, standard
behavior. Product UI earns trust through familiarity, not invention.

**The rotating tagline** (`ui/type/TaglineWord.tsx`) — the final word of
*A day that ___* cycles through **fits · adds up · balances · closes out**,
in the landing hero's `<h1>` and in `/login` and `/signup`'s echo line. The
four readings are a set, not a thesaurus dump — "fits" is the product's
capacity thesis, and the other three describe a day the same way a ledger
describes a set of entries (things that sum, settle, and get closed out at
day's end), so the rotation says something rather than just moving. On
the auth screens it replaced the ambient day-mark on 2026-08-23 (see the
day-mark entry below for why that came out).

Mechanics, and why they satisfy §Motion rather than bend it: the four
readings are stacked in a **single CSS grid cell**, so the container is sized
by the widest and the line never reflows — the animation is `opacity` and
`translateY(6px)` only, and the `width`/`height` ban stays intact. 18s cycle,
4.5s per reading, ~0.5s crossfade where each word's fade-out window is
exactly the next one's fade-in, so there is no blank beat. No JavaScript: it
is keyframes plus a `--i` index per slot, so it renders inside the landing
page's server component unchanged.

**The readings live in the stylesheet as `::after` content, not as DOM
text** — this is load-bearing, and the landing hero is why. Text inside the
rotator would make the page's `<h1>` read *"A day that fits. fits. adds up.
balances. closes out."* to a crawler, contradicting the `metadata.title` set
a few lines above it in `app/page.tsx`. Generated content is not DOM text, so
the heading's only real text is the canonical sentence in the visually hidden
span beside it — which does triple duty as the accessible name, the
indexable heading text, and what a selection copies. Verified three ways:
`h1.textContent` is `"A day that fits."`, the server-rendered HTML ships the
rotator slots empty, and the real accessibility tree (read via CDP, not
inferred) contains only that one heading string. Under
`prefers-reduced-motion: reduce` the cycle stops and "fits." holds.

**The day-mark** (`ui/graphics/DayMark.tsx`) — the one graphic in the product,
and the reason it's allowed: it isn't illustration, it's the capacity slot's own
shape read a different way. A hairline ring stands for the day; one solid arc in
`--primary-fill` is what's committed; one short notch in `--alert` marks where
that commitment ends — the same relationship as the slot's fill/spill/notch, and
the timeline's dashed edge line, just wrapped into a circle instead of a bar. No
clock face, no numerals, no percentage label anywhere near it — a mark, not a
stat, so it can never be misread as one. Two scales, one motif:

- *Mark* (~20–26px) — paired with the "Adlaw" wordmark wherever it appears.
  `stroke-width: 1.6`, real pixels via `vector-effect="non-scaling-stroke"`
  (SVG stroke-width is otherwise in viewBox units and inflates or vanishes with
  the rendered size — get this wrong and the two scales come out backwards).
  No motion — a logo mark shouldn't animate every render.
- *Ambient* (~420px) — sits large and quiet behind the landing hero's empty
  side, `z-index: -1` so it never competes with the headline or the capture
  demo. Thinner and fainter than the mark scale (`stroke-width: 1`, arc at
  `opacity: 0.4`) — texture for the section, not a second thing to read.
  Hidden under `prefers-contrast: more`, same reasoning as the login sweep: a
  diffuse hairline is what that mode can't rely on rendering. This scale
  carries the hero's one orchestrated moment: the mark fades and scales in
  once on load (`scale(0.92) → 1`, 900ms, `ease-out-expo`-family curve), then
  the whole dial turns as a single rigid body — track, arc, and notch
  together, orientation only — at 140s per rotation, slow enough to be
  imperceptible moment-to-moment. The fill fraction between the three shapes
  never changes, only where the assembly points; a filling arc would read as
  a live stat loading, which is exactly what the fixed-fraction rule above
  exists to prevent. Both stop under `prefers-reduced-motion: reduce`.

**The ambient scale is the landing hero's alone.** It was briefly also placed
in `/login` and `/signup`'s field plane on 2026-08-23 and removed the same
day: at that size the ring had to be cropped by the screen edge to fit
beside the sign-in card, and a cropped circle reads as off-centre rather
than as deliberate framing. The auth screens keep the light sweep as their
single ambient layer, and the field plane's presence now comes from the
rotating tagline instead (§Components → rotating tagline). The one-ambient
cap holds everywhere, with no exceptions.

The *mark* scale (~26px, beside the wordmark) does appear on all three
public surfaces — that is unaffected by the above.

Public surfaces only (`/`, `/login`, `/signup`) — there's no wordmark inside
the board to attach it to, and it isn't proposed for one.

**Third scale: the favicon** (`app/icon.tsx`, 32px; `app/apple-icon.tsx`, 180px,
the iOS home-screen icon). Same geometry, but these routes can't reach
`ui/tokens.css` — `next/og`'s `ImageResponse` renders server-side via Satori,
independent of the app's CSS, and Satori's color parser doesn't reliably
handle `oklch()` — so the three colors are the light-theme values converted to
sRGB hex once and hardcoded in each file (`--line` `#d8d5d2`, `--primary-fill`
`#0069d0`, `--alert` `#e22a12`). `app/icon.tsx` stays transparent, since a
favicon sits on the browser's own tab-strip color; `app/apple-icon.tsx` is
opaque `--card` white, since a transparent apple-touch-icon renders as solid
black under Apple's HIG, and it isn't pre-rounded — iOS applies its own corner
mask. `app/favicon.ico` (Next's stock placeholder) stays in place as a legacy
fallback; browsers prefer the generated PNG.

Both routes are dot-less URLs (`/icon`, `/apple-icon`), so `proxy.ts`'s
catch-all matcher doesn't exclude them the way it excludes `/favicon.ico` —
they have to be listed in `isPublicRoute` explicitly, or a signed-out request
for either 307s to `/login` instead of returning image bytes, and the favicon
silently breaks on the one page that most needs it working.

Every interactive component needs default, hover, focus-visible, active, disabled,
and where relevant loading and error. Focus ring is `2px solid var(--primary)` at
`2px` offset, everywhere, no exceptions.

## Bans

Rewrite the element if you are about to ship any of these:

- Colored side-stripe borders (`border-left` > 1px as an accent). This was in the
  first draft and it is the clearest tell.
- Shadows on resting content cards — hairline (`--edge`) only. Shadows are
  reserved for interactive chrome (`--lift-1`) and the transient drag state
  (`--lift-3`).
- Inverting the canvas/card hierarchy — the page (`--desk`) is never brighter
  than the cards on it.
- More than one `--primary-fill` call-to-action per screen.
- Skeuomorphic props: tape, stains, torn edges, pins, rotation jitter. (A warm
  flat canvas color is not this — texture and grain still are.)
- Gradient text, glassmorphism as decoration, hero-metric tiles.
- Tiny uppercase tracked eyebrows above every section.
- A per-course rainbow of tag colors, or any use of the reserved accent cast
  as a functional/UI-chrome signal.
- Gamification surfaces: XP bars, level badges, streak flames, confetti.
- Nested cards.
- The Source Serif 4 accent anywhere but the focus card's reason line —
  never a button, label, or data value. Display/serif faces stay out of UI
  labels, buttons, and data generally.
- Radii above `12px` on cards/panels; `9999px` is for pills only.
