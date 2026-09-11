# Design

The visual system. Strategy lives in `PRODUCT.md`; this file is how it looks
and moves.

**2026-09-11: the Linear reference.** The system strictly follows Linear's
design language, profiled at
`styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1` ("midnight
precision instrument"). It is dark-only. It supersedes both the 2026-08-18
Notion-palette pivot and the short-lived same-day "Lazy" pass, which is in
git history at `da68a23`. Where following the reference literally would break
a rule that outranks it, the rule wins, and each such place is named below:
muted text uses Fog rather than Ash (the AA floor), and overcommit stays red
via Linear's own coral.

## Theme

**A precision instrument at midnight.** Darkness is the substrate, not a
theme. Near-black surfaces step up in tone (Void → Carbon → Obsidian), edges
are hairlines, and geometry does the work that shadows usually would. There
is no decorative ornament and no skeuomorphic prop of any kind (no paper,
tape, stains or rotation jitter). Depth comes from surface steps, hairlines
and motion.

Calm at rest, expressive only under interaction.

**Dark-only** (`PRODUCT.md`, 2026-09-11 amendment). There is no light theme,
no theme toggle and no `data-theme` attribute. `:root` declares
`color-scheme: dark`.

## Color

**Strategy: a neutral ladder, one action color, and one alert color.**

- **Acid lime `--action`** is the single primary action per view: the landing
  hero's "Get started", login/signup's submit, the board's "Pick something to
  start", and settings' Export. It is never decoration, never a secondary
  button, and never data.
- **Coral `--alert`** marks the day's edge being crossed (the cutline, spill,
  the capacity overage and the day's endline) and form errors. Nothing else.
- **Everything else is neutral.** The focus ring, the capacity fill, step
  progress, selection, tinted chips and planned time all sit on the Mist/Bone
  ladder. What used to be "the blue commitment" is gone.

There is no per-course color system. Courses are text labels, now set in the
mono face. This rule is accessibility-motivated: color-blind-safe distinction
across many courses isn't achievable with color alone.

### Tokens

Hex, not OKLCH: the values are the reference's literals, and
`ui/tokens.contrast.test.ts` asserts each one.

| Token | Value | Linear name: role |
|---|---|---|
| `--desk` | `#08090a` | Void: page canvas, the day column |
| `--rail` | `#08090a` | Void: sidebar, separated from the day by a hairline, not a tone step |
| `--card` | `#0f1011` | Carbon: cards, screenshot frames, nav |
| `--card-hi` | `#161718` | Obsidian: hover, elevated panels, the toast |
| `--ink` | `#ffffff` | Paper: headings, titles |
| `--ink-2` | `#d0d6e0` | Mist: body, secondary headings, button text |
| `--ink-3` | `#8a8f98` | Fog: muted text, placeholders |
| `--line` | `#383b3f` | Smoke: higher-contrast hairlines, empty step segments |
| `--line-soft` | `#23252a` | Graphite: default hairline, dividers, ghost outlines |
| `--busy` | `#23252a` | Graphite: committed time |
| `--primary` | `#d0d6e0` | Mist: focus ring, indicators |
| `--primary-fill` | `#e5e5e6` | Bone: neutral high-emphasis fills (capacity bar, steps, day-mark arc) |
| `--primary-soft` | `rgb(255 255 255 / 0.05)` | Linear's pill/badge ground |
| `--primary-ink` | `#d0d6e0` | Mist: text on `--primary-soft` |
| `--on-fill` | `#08090a` | text on Bone |
| `--action` / `--on-action` | `#e4f222` / `#08090a` | Acid Lime and its text (16.15:1) |
| `--alert` / `--alert-ink` | `#eb5757` | Coral Red: fills and rules / text |
| `--alert-soft` | `rgb(235 87 87 / 0.12)` | the coral wash |

### Rules

- **`--ink-3` is Fog, not Ash.** Linear labels Ash (`#62666d`) "muted body
  text", but it measures **3.45:1** on Void and **3.30:1** on Carbon, under
  `PRODUCT.md`'s non-negotiable 4.5:1. Fog measures 6.13 / 5.86 / 5.52:1 on
  Void / Carbon / Obsidian. Ash is for non-text only. The contrast test
  asserts Ash's failure from the failing side, so switching to it has to be
  deliberate.
- **Coral text never sits on Graphite** (`--busy`, `--line-soft`): 4.41:1. On
  Void, Carbon, Obsidian and the coral wash it clears AA.
- **One `--action` per view.** A second lime element competes with the first
  and both lose their meaning. Repeatable actions such as "Break into steps"
  on a card are ghost buttons.
- Planned and committed time are told apart by **treatment, never hue**.
  Committed is solid Graphite; planned is the pill ground with a Smoke ring
  and white text.
- Surface order holds: `--desk` ≤ `--card` < `--card-hi`. The page is never
  brighter than the cards on it.
- Dimming (`.past`) is `0.6`, the dark-ground floor. It is raised to `0.85`
  on hover.
- **One gradient exists:** the landing hero's floor. Nowhere else, never on a
  button, card or text.

## Typography

**Inter Variable** at weights **400 / 510 / 590** with
`font-feature-settings: "cv01", "ss03", "zero"` set on `body`: the alternate
glyphs and slashed zero are Linear's typographic identity. Inter is loaded
without a `weight` array so 510 and 590 exist on the variable axis.

**JetBrains Mono** 400, as `--font-mono`, is Linear's documented substitute
for its licensed Berkeley Mono. It is used only in the reference's "issue ID"
slot: course codes and keyboard hints. Never headings, prose or durations.

**No serif, anywhere.** Nothing heavier than **590**. Sizes are integers.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Day title | 20px | 590 | −0.012em |
| Focus card title | 17px | 510 | −0.01em |
| Card title | 14px | 510 | −0.01em |
| Body / UI, AI reason line | 14px | 400 | −0.01em |
| Lane heading | 13px | 510 | −0.01em |
| Meta, labels | 12px | 400 | 0 |
| Course code (mono) | 12px | 400 | −0.013em |

The tracking ladder follows the reference:

| Size | Tracking |
|---|---|
| ≥48px | −0.022em (non-negotiable at display sizes) |
| 20–32px | −0.012em |
| 15px | −0.011em |
| 13–16px | −0.010em |
| ≤12px | 0 |

All durations, counts, clock times and dates use `font-variant-numeric:
tabular-nums`, so columns of numbers don't shimmer as they update.

## Spacing

Base unit `4px`, compact density, and the reference's 8 / 12 / 24 / 96
ladder: an element gap of `8px`, card padding of `12–16px` on the board and
`24px` on screenshot frames and auth cards, and a `96px` section rhythm on
the landing page.

## Depth and material

Elevation comes from surface steps and hairlines, not shadow stacks.

- **`--edge`**: `inset 0 0 0 1px #23252a`, Linear's `shadow-subtle`. Every
  resting card and panel uses it, with no shadow.
- **`--lift-1`**: `0 2px 4px rgb(0 0 0 / .4)`, Linear's `shadow-sm`. Only for
  interactive chrome.
- **`--lift-3`**: Linear's `shadow-xl` plus a Smoke hairline. Used while
  dragging and for the toast; only ever transient.
- **`--lift-action`**: the lime CTA's inset shadow stack, the one real shadow
  the reference puts on a chrome element.
- The rail/day seam is a **1px `--line-soft` border**. There is no `--groove`.

The capture bar is a translucent layer with content running underneath it,
not an opaque strip.

Radii: `4px` for badges, `6px` for buttons and inputs, `12px` for cards and
the focus card (no larger), and `9999px` for pills only.

## Motion

Springs for anything the user touches; short eased transitions for everything
else.

| Interaction | Parameters |
|---|---|
| Card settle after drop | Critically damped, `bounce 0.12`, `response 0.4`, carrying release velocity |
| Capacity meter | Critically damped, `response 0.45` |
| Hover, color, chrome | 120–200ms, `cubic-bezier(.22,1,.36,1)` |
| Button press | `scale(0.975)`, 110ms, on pointer-**down** |

These are interaction physics, not color, so they are unchanged by the
reference swap.

Rules that are not negotiable:

- Feedback fires on pointer-down, never on release.
- Drag tracks 1:1 and respects the grab offset. It never snaps to the card's
  center.
- Animate from the current on-screen value, never the target. Every animation
  is interruptible.
- Only `transform` and `opacity`. No animated layout properties.
- No orchestrated page-load sequence. The board loads into a task.
- `prefers-reduced-motion: reduce` replaces springs with instant settles and
  cross-fades. Content is never gated behind a reveal transition.

**Implementation note (2026-09-04):** the card-settle and capacity-meter
springs are real Framer Motion springs. This is a narrow, deliberate exception
covering only the two rows plain CSS provably can't satisfy: carrying release
velocity, and staying interruptible mid-flight. `ui/drag/springs.ts` defines
both. Nothing imports Framer Motion outside `ui/drag/useDraggableCard.ts` and
`ui/board/BoardHeader.tsx`.

## Landing surface

**Scope: `/`.** A public page has an audience the rest of this document was
never written for: a first-time reader on an unknown device, including a
phone. Where a rule's justification doesn't reach that reader, it is relaxed
here and nowhere else.

### Layout

The reference's marketing grammar, top to bottom:

1. **Nav**: the logo (day-mark glyph plus "Adlaw" at 16/510, white) on the
   left. On the right, a "Sign in" nav text link and a white "Sign up" pill.
   The nav is not sticky.
2. **Hero**: left-aligned. The audience line (Fog), the D1 headline with the
   rotating tagline word, then a row with the lead (Fog) on the left and the
   one lime action on the right.
3. **Product frame on the gradient floor**: a Carbon screenshot frame (12px,
   `--edge`, 24px padding, no outer shadow). Inside it, the live capture demo
   runs the real parser, above `ui/landing/demos/BoardPreview.tsx`, a still of
   the board in its over-capacity state.
4. **Four failure bands**: text on the left, evidence on the right, the same
   way round every time, separated by `--line-soft` hairlines at the 96px
   rhythm. There are no panels.
5. **How it works**: one row per sentence (sentence and parsed badges on the
   left, the resulting card on the right). Never a 3-column card grid.
6. **Showcase band**: the timeline at full width.
7. **Footer**: a hairline, the close line at 24/400, and "Sign in" as nav
   text.

**Imagery is product UI only**: the reference is product-screenshot-first.
Every miniature is a static reproduction built from
`ui/landing/demos/demos.module.css` and the fixtures in `copy.ts`. The
fixtures' arithmetic is asserted in `copy.test.ts`: the board preview's queue
sums to the capacity slot's planned minutes, and its cutline falls where the
board's rule puts it. A miniature that depicts unbuilt work carries the
`NOT_SHIPPED` line.

### Display type

| Role | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Display 1: hero | 40 → 72px | 510 | −0.022em | 1.0 |
| Display 2: section | 32 → 48px | 510 | −0.022em | 1.0 |
| Display 3: band heading | 24 → 32px | 400 | −0.022em | 1.13 |
| Lead prose | 16px | 400 | −0.01em | 1.5 |

### `clamp()`: a documented exception

The fixed-scale rule's premise ("users view at consistent DPI") doesn't reach
a public page, where a fixed 72px headline at 375px overflows. `clamp()` is
therefore **permitted for the three display sizes, on the landing surface,
and nowhere else**:

```
D1  clamp(2.5rem, 1.75rem + 3.2vw, 4.5rem)    40 → 72px
D2  clamp(2rem,   1.62rem + 1.6vw, 3rem)      32 → 48px
D3  clamp(1.5rem, 1.31rem + 0.8vw, 2rem)      24 → 32px
```

**Every fixed term is in `rem`, never `px`, and this is load-bearing.** A
pure-`vw` clamp violates WCAG 2.2 SC 1.4.4 (Resize Text). These values are
custom properties scoped to `.landing`, not global tokens.

### Motion allowance

Still binding: `transform` and `opacity` only, no animated layout properties,
the hover and press parameters above, and the focus ring untouched. Three
kinds are permitted here:

**(a) One ambient layer per screen.** On `/` this is the **hero gradient
floor**, the system's only gradient: Void at 10% to Mist at 100%, per the
reference, at 0.16 opacity. It is feathered at both sides, and its bright end
sits behind the product frame. It is static, non-interactive and
`pointer-events: none`, and it is hidden under `prefers-contrast: more`.

**(b) One scroll-triggered entrance per section**: ≤ 8px of translate via
native `animation-timeline: view()`, **`transform` only, never `opacity`**. An
opacity-gated reveal ships blank sections to screenshots, prints, headless
renderers and background tabs; that bug shipped once. The resting state is the
final visible state, and the `@supports` guard lands unsupporting browsers on
it.

**(c) One rotating word, in the hero tagline only.** The final word of "A day
that ___" cycles through four readings. Mechanics are under Components.

Banned here: parallax, scroll pinning or hijacking, animated counters,
typewriter effects, staggered list cascades, more than one ambient layer per
screen, and any animation of `background-position`, `width`, `height`, `top`
or `left`.

### Spacing

Content max-width **1200px** (the reference's). The section rhythm is
**96px**, dropping to **64px** below 720px, and the prose measure is
**36em**. **Never `width: 100vw`**: it includes the scrollbar and produces
horizontal overflow.

### Auth screens (`/login`, `/signup`)

Linear's minimal auth: one centered column on Void. It holds the wordmark and
a Carbon form card (12px, `--edge`, 24px padding) with the title at 24/400,
the Google ghost button, a divider, Linear's text inputs, the lime submit, and
the switch link as nav text. There is no ambient layer and no tagline. The one
motion is the `@starting-style` entrance.

## Components

**Buttons: Linear's four kinds.**

- *Primary action (lime)*: `--action` background, `--on-action` text, 6px
  radius, 10px 16px padding, 14/510, −0.011em, `--lift-action`. One per view.
- *Ghost/outline*: transparent, a 1px `--line-soft` ring, `--ink-2` text, 6px
  radius, 8px 12px padding, 13/400. Hover adds `--primary-soft` and a Smoke
  ring. Used for Google sign-in and "Break into steps".
- *Nav text*: no border and no fill, `--ink-2` text, 13/400, underline on
  hover.
- *Sign-up pill*: white background, Void text, 9999px radius, 8px 16px
  padding, 13/510. Used on the landing nav only.

**Text input.** A white-2% ground, a white-8% inset border, `--ink-2` text,
6px radius, 12px 14px padding, 14px. The border brightens to Mist on focus
and turns coral on `aria-invalid`.

**Badge.** `--primary-soft` ground, `--ink-3` text, 4px radius, 0 6px
padding, 12/400. Used for parsed-field previews and inline metadata. The coral
variant is the cutline label.

**Pill.** `--primary-soft` ground, `--ink-2` text, 9999px radius. Used for
the rotating tagline word.

**Card.** Cards differ by lane rather than repeating one rectangle:

- *Focus card* (Start here): 12px radius, 17px title, the AI's one-line
  reason in Inter 14/400 Mist, the parent breakdown bar, and actions. Exactly
  one exists.
- *Queue card* (Then): compact. Mono course code, title, duration, due hint.
- *Done card*: no background, a hairline separator, struck through at
  `--ink-3`.

**Cutline.** A coral hairline at 50% with a coral badge naming the real
boundary (`4:00 — work starts`). Cards below it dim. It moves as the queue
changes.

**Capacity slot.** A recessed track (Graphite, with an inset shadow), a Bone
fill up to the notch, a coral overflow segment past it, and a notch marking
100%. It reads as a machined slot, not a progress bar.

**Timeline (Today's shape).** A time gutter plus two tracks. Committed is
solid Graphite; planned is the pill ground with a Smoke ring. Spill is the
coral wash with a coral ring and its own "past today's edge" text, so spill is
never color-only. The now-line is a solid white line; the day's edge is a
dashed coral line.

**The rotating tagline** (`ui/type/TaglineWord.tsx`). It appears in the
landing hero's `<h1>` only. The four readings (**fits · adds up · balances ·
closes out**) are a set: "fits" is the capacity thesis, and the other three
describe a day the way a ledger describes entries.

- They are stacked in a **single CSS grid cell**, so nothing reflows.
- The animation is `opacity` plus `translateY(6px)`: an 18s cycle, 4.5s per
  reading, with a ~0.5s crossfade.
- **The readings live in the stylesheet as `::after` content, not DOM
  text.** DOM text would make the `<h1>` index as all four readings at once.
  The heading's real text is the visually hidden canonical sentence, which
  serves as the accessible name, the indexable text and what a selection
  copies.
- Each reading wears Linear's Pill.
- Reduced motion holds "fits."

**The day-mark** (`ui/graphics/DayMark.tsx`) is the capacity slot's shape
wrapped into a circle:

- a Smoke hairline ring for the day;
- a Bone arc for what's committed;
- a Mist notch where that commitment ends.

The notch is not coral: it's a boundary marker, not an overage. The fill
fraction is a fixed 0.58 and never wired to data (a mark, not a stat). It
exists at **wordmark scale only**, next to "Adlaw" on public surfaces, with no
motion. The large ambient ring behind the hero was removed on 2026-09-11,
because the reference allows almost no ornament.

**Favicon** (`app/icon.tsx`, 32px; `app/apple-icon.tsx`, 180px). Same
geometry, rendered via Satori, which can't read the CSS tokens, so the hex
values are copied in each file. The favicon is an opaque Void rounded tile,
because a light glyph on a transparent background vanishes on a light tab
strip. The apple icon is opaque Void and not pre-rounded, since iOS applies
its own mask. Both are dot-less routes, so they're listed in `proxy.ts`'s
`isPublicRoute`.

Every interactive component needs default, hover, focus-visible, active and
disabled states, plus loading and error where relevant. The focus ring is
`2px solid var(--primary)` (Mist) at a `2px` offset, everywhere, with no
exceptions.

## Bans

Rewrite the element if you are about to ship any of these:

- Colored side-stripe borders (`border-left` > 1px as an accent).
- Shadows on resting content cards. Use a hairline (`--edge`) only.
- Inverting the surface order: the page is never brighter than its cards.
- More than one `--action` (lime) element per view, or lime on anything that
  isn't a primary action.
- Any chromatic color outside `--action` and `--alert`. That includes a
  per-course rainbow of tags, and it includes Linear's own decorative accents
  (Pulse Green, Signal Teal, Iris Violet, Lavender), which are not adopted.
- Coral text on Graphite, and coral for anything but overcommit and errors.
- Font weights above 590. Any serif face. Mono outside course codes and
  keyboard hints.
- Gradients anywhere but the landing hero's floor, including gradient text.
- Radii above `12px` on cards and panels; `9999px` is for pills only.
- Skeuomorphic props: tape, stains, torn edges, pins, rotation jitter,
  texture, grain.
- Glassmorphism as decoration, hero-metric tiles, tiny uppercase tracked
  eyebrows above every section, and 3-column or identical card grids.
- Gamification surfaces: XP bars, level badges, streak flames, confetti.
- Nested cards. A screenshot frame is a picture of the product, not a UI card.
- A light theme, a theme toggle, or `data-theme` selectors.
