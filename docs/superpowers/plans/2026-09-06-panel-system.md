# Panel System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the reference design system's *architecture* — colored full-bleed panels, a pill on the hero's rotating word, a midnight island, and an editorial serif lead — onto Adlaw's public surfaces, while keeping every measured AA guarantee and leaving the board's functional color discipline untouched.

**Architecture:** Two new token families (`--panel-*` for large fills that track the theme, `--pill-*` for small chips that hold their light value in both themes) are added to `ui/tokens.css` and guarded by a new pure Vitest suite that asserts the actual contrast ratios. The landing page's existing but unwired `.bleed` full-bleed wrapper becomes the element those panels paint onto. Nothing under `core/` changes; no component under `ui/board/` gains color.

**Tech Stack:** Next.js 16 App Router (server components), hand-written CSS Modules, OKLCH color, Vitest (pure suites only), Inter + Source Serif 4 via `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-09-06-panel-system-design.md` — read it before Task 1. The plan argues from the spec; where they disagree, the spec wins.

## Global Constraints

- **Dev server is on port 3001.** `localhost:3000` is a different project (`Pomodose`). Verify against `http://localhost:3001`.
- **Never run `npm run build`.** A dev server is live and sharing `.next/`; building clobbers it and produces a bogus `auth/invalid-api-key`. Use `npx tsc --noEmit`, `npm run lint`, `npm test`.
- **`vitest.config.mts` includes `**/*.test.ts` only** — no `.tsx`, and no environment is configured. Every test in this plan is a pure `.ts` file. Do not add a component test; it would require a config change that is out of scope.
- **`core/` has no imports outside itself.** No task in this plan touches `core/`.
- **`ui/landing/` may not import from `ui/board/`** except the two pure modules `core/heuristic.ts` and `ui/board/format.ts`.
- **Text on a light panel is `--ink` and nothing else.** `--ink-2` measures 4.43:1 on marigold and 4.37:1 on coral; `--ink-3` fails on all four. Anything needing a secondary tone sits on a `--card` surface.
- **Exactly one `--primary-fill` call-to-action on the whole landing document** — the hero's "Sign in". Unchanged.
- **Display tracking stays flat at −0.021…−0.024em.** Inter asymptotes near −0.022em. Do not extrapolate toward the reference's −0.048em; that is a different typeface.
- **Every fixed term in a `clamp()` is in `rem`, never `px`** (WCAG 2.2 SC 1.4.4).
- **Only `transform` and `opacity` animate.** No animated layout properties, ever.
- **Both themes are first-class.** Verify every visual change in light *and* dark before calling a task done.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA
  ```

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `ui/tokens.contrast.test.ts` | **Create.** Pure guard asserting every new token's measured contrast, and that `ui/tokens.css` declares the exact literals | 1 |
| `ui/tokens.css` | **Modify.** Add `--panel-*`, `--pill-*`, `--on-pill`, `--on-midnight` to all three theme blocks; remove `--wash-*` | 1 |
| `app/page.tsx` | **Modify.** Remove the outer `.shell`, give each top-level section its own `.bleed > .shell`, pass `accent` | 2 |
| `ui/landing/Failure.tsx` | **Modify.** `accent` prop type gains nothing; already correct — verify only | 2 |
| `ui/landing/landing.module.css` | **Modify.** `--wash-*` rules become `--panel-*`; add panel text rule, midnight island, centered hero, D1 rung, serif lead | 2–5, 7 |
| `ui/graphics/DayMark.module.css` | **Modify.** Ambient mark centers behind the hero instead of pinning top-right | 5 |
| `ui/type/TaglineWord.module.css` | **Modify.** Each reading's `::after` gains its own pill | 6 |
| `app/(auth)/login/login.module.css` | **Modify.** Serif lead + pill inherit | 8 |
| `app/(auth)/signup/signup.module.css` | **Modify.** Same | 8 |
| `ui/board/TaskCard.module.css` | **Modify.** Two `--primary` → `--primary-ink` text fixes | 9 |
| `ui/board/DeleteUndoContext.module.css` | **Modify.** One `--primary` text fix | 9 |
| `ui/capture/CaptureBar.module.css` | **Modify.** Comment on the 11px nested radius | 9 |
| `ui/landing/CaptureDemo.module.css` | **Modify.** Same comment | 9 |
| `ui/landing/demos/demos.module.css` | **Modify.** Same comment | 9 |
| `DESIGN.md` | **Modify.** Tokens, two new rules, D1 rung, serif scope, stale CaptureBar claim | 10 |
| `CLAUDE.md` | **Modify.** Warm-neutral-surfaces contradiction | 10 |

---

### Task 1: Panel and pill tokens, with a contrast guard

**Files:**
- Create: `ui/tokens.contrast.test.ts`
- Modify: `ui/tokens.css`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--panel-marigold`, `--panel-coral`, `--panel-sky`, `--panel-mocha`, `--panel-midnight`, `--pill-marigold`, `--pill-coral`, `--pill-sky`, `--pill-mocha`, `--on-pill`, `--on-midnight`, `--primary-on-ink`. Every later task consumes these by name; `--primary-on-ink` is consumed only by Task 9. `--wash-marigold` / `--wash-coral` / `--wash-mocha` / `--wash-sky` are **deleted** — Task 3 removes their last consumers.

This task is test-first for a real reason. `DESIGN.md` says lightening a token "for elegance is the single most common way this system breaks," and every ratio in the spec was computed by hand. A pure test makes those numbers permanent instead of a claim in a document.

- [ ] **Step 1: Write the failing test**

Create `ui/tokens.contrast.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the measured contrast ratios DESIGN.md depends on, and the exact
 * literals ui/tokens.css must declare.
 *
 * Pure by construction: it reads a CSS file as text and does arithmetic. No
 * DOM, no environment — which is what lets it run in the fast `npm test`
 * suite alongside core/'s tests (vitest.config.mts includes every .test.ts
 * file and configures no environment).
 *
 * Note for whoever edits this header: do not write the config's glob out
 * literally here. It ends in the two characters that close a block comment,
 * which silently truncates this JSDoc and makes the file collect zero tests
 * rather than fail one.
 *
 * The OKLCH→sRGB conversion below is the standard Björn Ottosson matrix pair.
 * It is duplicated here rather than imported because core/ is forbidden from
 * carrying anything that isn't domain logic, and this is a test guard.
 */

type Oklch = readonly [l: number, c: number, h: number];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** OKLCH → linear sRGB, before gamut clipping. */
function toLinearSrgb([l, c, h]: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

const encode = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
const decode = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

/** WCAG relative luminance, after clipping to the sRGB gamut. */
function luminance(color: Oklch): number {
  const [r, g, b] = toLinearSrgb(color).map((v) =>
    decode(clamp01(encode(clamp01(v)))),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** True when the color needs clipping to fit sRGB — i.e. the literal lies. */
function outOfGamut(color: Oklch): boolean {
  return toLinearSrgb(color).some((v) => v < -0.002 || v > 1.002);
}

// ── The palette under test ────────────────────────────────────────────────
// Light inks
const INK: Oklch = [0.22, 0.004, 68];
const INK_2: Oklch = [0.42, 0.005, 68];
const INK_3: Oklch = [0.505, 0.005, 68];
const CARD: Oklch = [1, 0, 0];
const DESK: Oklch = [0.97, 0.003, 68];
// Dark
const DARK_INK: Oklch = [0.97, 0.004, 68];
const DARK_INK_2: Oklch = [0.775, 0.005, 68];
const DARK_INK_3: Oklch = [0.665, 0.005, 68];
const DARK_CARD: Oklch = [0.205, 0.005, 68];
const DARK_DESK: Oklch = [0.145, 0.004, 68];

// The delete-undo toast is an INVERTED surface (background: var(--ink)), so
// its accent has to invert too. See the --primary-on-ink describe block.
const PRIMARY_ON_INK_LIGHT: Oklch = [0.75, 0.16, 254];
const PRIMARY_ON_INK_DARK: Oklch = [0.47, 0.17, 254];

const LIGHT_PANELS = {
  marigold: [0.8, 0.16, 75],
  coral: [0.8, 0.1, 34],
  sky: [0.8, 0.09, 240],
  mocha: [0.8, 0.045, 55],
} as const satisfies Record<string, Oklch>;

const DARK_PANELS = {
  marigold: [0.145, 0.042, 75],
  coral: [0.145, 0.045, 34],
  sky: [0.145, 0.04, 240],
  mocha: [0.145, 0.028, 55],
} as const satisfies Record<string, Oklch>;

const MIDNIGHT_LIGHT: Oklch = [0.22, 0.055, 265];
const MIDNIGHT_DARK: Oklch = [0.25, 0.05, 265];
const ON_MIDNIGHT: Oklch = [0.98, 0.004, 68];
const ON_PILL: Oklch = [0.22, 0.004, 68];

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const fmt = ([l, c, h]: Oklch) => `oklch(${l} ${c} ${h})`;

describe("light panels", () => {
  for (const [name, panel] of Object.entries(LIGHT_PANELS)) {
    it(`${name} is inside the sRGB gamut`, () => {
      expect(outOfGamut(panel)).toBe(false);
    });

    // The whole reason L is pinned to 0.80: it is where --ink clears 7:1,
    // leaving headroom above PRODUCT.md's non-negotiable 4.5:1 floor.
    it(`${name} carries --ink at 7:1 or better`, () => {
      expect(contrast(INK, panel)).toBeGreaterThanOrEqual(7);
    });

    // The panel text rule, asserted from the failing side. If a future
    // change makes --ink-2 pass here, the rule can be relaxed — but it must
    // be relaxed deliberately, by deleting this test, not by drifting.
    it(`${name} does NOT carry --ink-3 (this is why the panel text rule exists)`, () => {
      expect(contrast(INK_3, panel)).toBeLessThan(4.5);
    });

    it(`${name} is visibly darker than --card, so a card floats on it`, () => {
      expect(luminance(CARD)).toBeGreaterThan(luminance(panel));
    });
  }

  it("marigold and coral are exactly why the panel text rule bans --ink-2", () => {
    expect(contrast(INK_2, LIGHT_PANELS.marigold)).toBeLessThan(4.5);
    expect(contrast(INK_2, LIGHT_PANELS.coral)).toBeLessThan(4.5);
  });
});

describe("dark panels", () => {
  // The load-bearing property: a panel must not invert the card hierarchy.
  // Dark --card on --desk is the separation every card already relies on;
  // card-on-panel must match it, which is what pinning L to --desk buys.
  const baseline = contrast(DARK_CARD, DARK_DESK);

  for (const [name, panel] of Object.entries(DARK_PANELS)) {
    it(`${name} is inside the sRGB gamut`, () => {
      expect(outOfGamut(panel)).toBe(false);
    });

    it(`${name} preserves the card/canvas separation`, () => {
      expect(contrast(DARK_CARD, panel)).toBeCloseTo(baseline, 1);
      expect(luminance(DARK_CARD)).toBeGreaterThan(luminance(panel));
    });

    // Unlike light, dark panels carry the whole ladder. The panel text rule
    // is still written for light so that one rule serves both themes.
    it(`${name} carries the full ink ladder in dark`, () => {
      expect(contrast(DARK_INK, panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(DARK_INK_2, panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(DARK_INK_3, panel)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("midnight island", () => {
  it("carries white text in light theme", () => {
    expect(contrast(ON_MIDNIGHT, MIDNIGHT_LIGHT)).toBeGreaterThanOrEqual(7);
  });

  it("reads as a raised slab in dark, not a hole", () => {
    expect(luminance(MIDNIGHT_DARK)).toBeGreaterThan(luminance(DARK_CARD));
    expect(luminance(MIDNIGHT_DARK)).toBeGreaterThan(luminance(DARK_DESK));
  });

  it("carries white text in dark theme too", () => {
    expect(contrast(ON_MIDNIGHT, MIDNIGHT_DARK)).toBeGreaterThanOrEqual(7);
  });
});

describe("pills hold their light value in both themes", () => {
  for (const [name, pill] of Object.entries(LIGHT_PANELS)) {
    it(`--on-pill reads on ${name} regardless of theme`, () => {
      expect(contrast(ON_PILL, pill)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${name} stands off the dark canvas as a bright chip`, () => {
      expect(contrast(pill, DARK_DESK)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${name} stands off the light canvas`, () => {
      expect(luminance(DESK)).toBeGreaterThan(luminance(pill));
    });
  }
});

describe("--primary-on-ink: the accent for an inverted surface", () => {
  // ui/board/DeleteUndoContext.module.css's toast sets background: var(--ink)
  // — near-black in light, near-white in dark. Both existing blue tokens were
  // tuned for normal-polarity grounds and fail here: --primary measures
  // 3.80:1 light and 2.09:1 dark, and --primary-ink is worse still at 2.53:1
  // light. This is the Undo control for a destructive action, so it gets a
  // token rather than a workaround.
  //
  // The derivation is just the polarity flip: an inverted surface takes the
  // OTHER theme's blue.
  it("clears AA on the light-theme toast (a near-black ground)", () => {
    expect(contrast(PRIMARY_ON_INK_LIGHT, INK)).toBeGreaterThanOrEqual(4.5);
  });

  it("clears AA on the dark-theme toast (a near-white ground)", () => {
    expect(contrast(PRIMARY_ON_INK_DARK, DARK_INK)).toBeGreaterThanOrEqual(4.5);
  });

  it("documents why the existing tokens could not be reused", () => {
    expect(contrast([0.568, 0.182, 254], INK)).toBeLessThan(4.5);
    expect(contrast([0.47, 0.17, 254], INK)).toBeLessThan(4.5);
    expect(contrast([0.75, 0.16, 254], DARK_INK)).toBeLessThan(4.5);
  });
});

describe("ui/tokens.css declares exactly these literals", () => {
  const declared = (token: string, value: Oklch) =>
    css.split(`--${token}: ${fmt(value)};`).length - 1;

  for (const [name, panel] of Object.entries(LIGHT_PANELS)) {
    it(`--panel-${name} light appears once`, () => {
      expect(declared(`panel-${name}`, panel)).toBe(1);
    });
    // Dark is declared twice: the explicit [data-theme="dark"] block and the
    // prefers-color-scheme media query that mirrors it.
    it(`--panel-${name} dark appears twice`, () => {
      expect(declared(`panel-${name}`, DARK_PANELS[name as keyof typeof DARK_PANELS])).toBe(2);
    });
    it(`--pill-${name} appears three times (identical in every block)`, () => {
      expect(declared(`pill-${name}`, panel)).toBe(3);
    });
  }

  it("--panel-midnight is declared per theme", () => {
    expect(declared("panel-midnight", MIDNIGHT_LIGHT)).toBe(1);
    expect(declared("panel-midnight", MIDNIGHT_DARK)).toBe(2);
  });

  it("--on-pill and --on-midnight are theme-invariant", () => {
    expect(declared("on-pill", ON_PILL)).toBe(3);
    expect(declared("on-midnight", ON_MIDNIGHT)).toBe(3);
  });

  it("--primary-on-ink is declared per theme", () => {
    expect(declared("primary-on-ink", PRIMARY_ON_INK_LIGHT)).toBe(1);
    expect(declared("primary-on-ink", PRIMARY_ON_INK_DARK)).toBe(2);
  });

  it("the superseded --wash-* tokens are gone", () => {
    expect(css).not.toContain("--wash-");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run ui/tokens.contrast.test.ts`
Expected: FAIL. The arithmetic `describe` blocks pass immediately (they test math, not the file); the `ui/tokens.css declares exactly these literals` block fails on every assertion, and `the superseded --wash-* tokens are gone` fails because `--wash-*` is still present.

If any *arithmetic* assertion fails, stop and report — the spec's numbers are wrong and the plan needs revising, not the tokens.

- [ ] **Step 3: Add the tokens to the light block**

In `ui/tokens.css`, inside `:root { … }`, **replace** the four `--wash-*` declarations and their comment block with:

```css
  /* --panel-*: full-bleed section mats on the public surfaces. Pinned to
     OKLCH L 0.80 in light — not chosen by eye, but the lightness at which
     --ink clears 7:1, leaving headroom over PRODUCT.md's 4.5:1 floor.
     Chroma differs per hue because the sRGB gamut at L 0.80 does: marigold
     holds 0.16 there, blue cannot.

     Coral departs from the reference swatch on purpose. #f64932 sits at
     L 0.65, where black text measures 3.45:1 and white 3.55:1 — both fail
     body-size AA. The reference survives that by only putting display type
     on coral; our bands carry body copy, so coral moves up to the panel L
     and keeps its hue. It reads as a warm salmon.

     TEXT ON A LIGHT PANEL IS --ink AND NOTHING ELSE. --ink-2 measures
     4.43:1 on marigold and 4.37:1 on coral; --ink-3 fails on all four.
     Anything needing a secondary tone sits on a --card surface instead.
     ui/tokens.contrast.test.ts asserts all of this. */
  --panel-marigold: oklch(0.8 0.16 75);
  --panel-coral: oklch(0.8 0.1 34);
  --panel-sky: oklch(0.8 0.09 240);
  --panel-mocha: oklch(0.8 0.045 55);
  --panel-midnight: oklch(0.22 0.055 265);
  --on-midnight: oklch(0.98 0.004 68);

  /* --pill-*: the same four hues at chip scale. These are IDENTICAL in every
     theme block, and --on-pill is always the dark ink.

     That asymmetry with --panel-* is the rule, not an oversight: large fills
     track the theme because a saturated full-bleed band at night is
     fatiguing and breaks "quiet at rest"; a chip of one word is punctuation
     and must read as the same object in both themes. Against dark --desk a
     pill carries a 10:1 halo, which is the bright-chip-on-dark-ground read. */
  --pill-marigold: oklch(0.8 0.16 75);
  --pill-coral: oklch(0.8 0.1 34);
  --pill-sky: oklch(0.8 0.09 240);
  --pill-mocha: oklch(0.8 0.045 55);
  --on-pill: oklch(0.22 0.004 68);

  /* --primary-on-ink: the accent color for an INVERTED surface — currently
     just ui/board/DeleteUndoContext.module.css's toast, which sets
     `background: var(--ink)`.

     Both existing blues fail there, because both were tuned against
     normal-polarity grounds: --primary measures 3.80:1 on the light toast
     and 2.09:1 on the dark one, and --primary-ink is worse still at 2.53:1.
     That is the Undo control for a destructive action, so it earns a token
     rather than a workaround.

     The derivation is the polarity flip and nothing cleverer: an inverted
     surface takes the OTHER theme's blue. Light's toast is a near-black
     ground, so it takes dark's --primary (7.58:1). */
  --primary-on-ink: oklch(0.75 0.16 254);
```

- [ ] **Step 4: Add the tokens to both dark blocks**

In `ui/tokens.css`, in **`:root[data-theme="dark"]`**, replace the `--wash-*` declarations and their comment with:

```css
  /* --panel-*: pinned to dark's --desk L (0.145), carrying the hue in chroma
     alone. A full-bleed L-0.80 marigold band on a dark page is punishing at
     night and breaks "quiet at rest", so large fills dim with the theme.

     Pinning L to --desk is load-bearing, not cosmetic: dark --card (0.205)
     on --desk (0.145) measures 1.10:1, and that is the separation every card
     in the product already relies on with --edge carrying the rest. A panel
     at desk's L makes card-on-panel measure the same 1.10:1, so the
     canvas/card hierarchy cannot invert on a panel.

     Chroma is roughly double the light values — the same chroma renders
     visibly weaker on a dark ground, and the superseded tokens' numbers were
     simply not visible.

     (Do not name those superseded tokens literally in this comment.
     ui/tokens.contrast.test.ts asserts the whole file no longer contains
     that prefix, so writing it here — even inside a comment — fails the
     suite.)

     Unlike light, dark panels DO carry the full ink ladder (--ink-2 at 9.7,
     --ink-3 at 6.5). The panel text rule is still written for light, so one
     rule serves both. */
  --panel-marigold: oklch(0.145 0.042 75);
  --panel-coral: oklch(0.145 0.045 34);
  --panel-sky: oklch(0.145 0.04 240);
  --panel-mocha: oklch(0.145 0.028 55);

  /* Midnight cannot invert in dark — there is nothing to invert against. It
     becomes a raised slab ABOVE --card instead, separated by --edge, so it
     reads as a distinct object rather than a hole. */
  --panel-midnight: oklch(0.25 0.05 265);
  --on-midnight: oklch(0.98 0.004 68);

  /* Identical to light on purpose — see the light block's --pill-* note. */
  --pill-marigold: oklch(0.8 0.16 75);
  --pill-coral: oklch(0.8 0.1 34);
  --pill-sky: oklch(0.8 0.09 240);
  --pill-mocha: oklch(0.8 0.045 55);
  --on-pill: oklch(0.22 0.004 68);

  /* The inverted toast is a near-WHITE ground in dark, so it takes light's
     blue — the mirror of what the light block does. 6.27:1. */
  --primary-on-ink: oklch(0.47 0.17 254);
```

Then paste the **same block** into `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }`, replacing its `--wash-*` declarations, with the comment shortened to `/* See the explicit dark block above. */` — matching how every other token in that block is already commented.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run ui/tokens.contrast.test.ts`
Expected: PASS, all assertions.

Then confirm nothing else regressed and no consumer of `--wash-*` remains:

Run: `npm test`
Run: `grep -rn -- "--wash-" ui app`
Expected: `npm test` passes; the grep prints `ui/landing/landing.module.css` only (Task 3 removes it). Any other hit is a consumer this plan missed — report it.

- [ ] **Step 6: Commit**

```bash
git add ui/tokens.css ui/tokens.contrast.test.ts
git commit -m "feat: panel and pill tokens, guarded by a contrast test

Adds --panel-* (large fills, theme-tracking) and --pill-* (chips, held at
their light value in both themes), replacing the unwired --wash-* set.

Light panels pin to OKLCH L 0.80 — the lightness where --ink clears 7:1.
Dark panels pin to --desk's L so card-on-panel measures the same 1.10:1
separation every card already relies on, which is what stops a panel from
inverting the canvas/card hierarchy.

ui/tokens.contrast.test.ts makes those ratios permanent. DESIGN.md warns
that lightening a token for elegance is the most common way this system
breaks; a pure test is a better guard than a paragraph.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 2: Unbreak the `.bleed` wiring

**Files:**
- Modify: `app/page.tsx`
- Verify (likely no change): `ui/landing/Failure.tsx`

**Interfaces:**
- Consumes: `.bleed` and `.shell` from `ui/landing/landing.module.css` (both already exist); `Failure`'s existing `accent?: "marigold" | "coral" | "mocha" | "sky"` prop.
- Produces: a DOM where every top-level section is its own `.bleed > .shell > …`. Task 3 paints `.bleed[data-accent]`; Task 4 adds `.bleed[data-panel="midnight"]`; Task 5 restyles `.hero` inside it.

**This task was found already implemented in the working tree** and was committed as part of the pre-execution checkpoint (`349bd96`). `app/page.tsx` already gives header, hero, closing section and footer their own `.bleed > .shell`, and already passes `accent="marigold" | "coral" | "mocha" | "sky"` in that order.

So this task is now **verification only**. Do not rewrite `app/page.tsx`. Confirm the four checks below; if any fails, fix only the thing that failed, using the reference JSX in Step 2 as the target shape.

- [ ] **Step 1: Confirm the structure is right**

```bash
grep -n "bleed\|accent=" app/page.tsx
```

Expected: `.bleed` on the header, hero section, closing section and footer, each wrapping a `.shell`; `accent="marigold"`, `accent="coral"`, `accent="mocha"`, `accent="sky"` on the four `<Failure>` calls **in that order**; and **no** outer `.shell` wrapping the whole document.

If the order differs, fix it — the order is fixed by the hue-distance reasoning in `landing.module.css`'s band comment, not by preference.

- [ ] **Step 2: Reference JSX (target shape — only apply what is missing)**

```tsx
  return (
    <div className={styles.landing}>
      <SmoothScroll />

      <div className={styles.bleed}>
        <div className={styles.shell}>
          <header className={styles.topBar}>
            <span className={styles.wordmark}>
              <DayMark size={18} />
              Adlaw
            </span>
            <div className={styles.topRight}>
              <ThemeToggle />
              <Link href="/login" className={styles.textLink}>
                Sign in
              </Link>
            </div>
          </header>
        </div>
      </div>

      <main>
        <div className={styles.bleed}>
          <div className={styles.shell}>
            <section className={styles.hero}>
              <DayMark ambient size={560} className={styles.heroMark} />
              <p className={styles.audience}>
                Built for students juggling requirements, org work, and a class schedule that never
                has room for anything else.
              </p>
              <h1 className={styles.d1}>
                A day that <TaglineWord />
              </h1>
              <p className={styles.lead}>
                Type what you need to do, the way you&rsquo;d actually say it — &ldquo;finish bio lab
                report by Thursday.&rdquo; Adlaw works out the subject, how long it&rsquo;ll really
                take, and the deadline. Then it tells you, honestly, whether today can fit it.
              </p>
              {/* The only --primary-fill call-to-action on the entire document. */}
              <Link href="/login" className={styles.cta}>
                Sign in
              </Link>
              <div className={styles.heroDemo}>
                <CaptureDemo />
              </div>
            </section>
          </div>
        </div>

        {/* The four failures, in the order they are ranked in PRODUCT.md.
            Panel hues are assigned by maximum hue distance from the functional
            color each band's own miniature already renders — see the band
            comment in landing.module.css. The order is fixed by that, not by
            the tagline; the hero's rotating pill then follows this order so
            the headline teaches the page's color sequence. */}
        <Failure
          heading="You plan ten things. Today only has room for four."
          evidence={<CapacitySlot />}
          accent="marigold"
        >
          Every task gets a realistic time estimate, and so does your day — based on your actual
          class schedule. The moment your plan runs past what&rsquo;s left, you&rsquo;ll see it,
          before you&rsquo;re the one finding out at 11pm that today was never going to work.
        </Failure>

        <Failure
          heading="Staring at your to-do list is its own kind of tired."
          evidence={<FocusCard />}
          accent="coral"
          flip
        >
          Instead of a wall of tasks to sort through, Adlaw hands you one: the thing to do right
          now, with a plain reason why. No re-sorting your list at midnight trying to figure out
          what actually matters.
        </Failure>

        <Failure
          heading="A 12-hour requirement shouldn't sneak up like a 20-minute one."
          evidence={<StepProgress />}
          accent="mocha"
        >
          Big requirements — a thesis chapter, a major project — get split into steps the moment
          you add them, and stay visible for the two weeks leading up to the deadline.
          &ldquo;Due in two weeks&rdquo; stops quietly turning into &ldquo;due tomorrow.&rdquo;
        </Failure>

        <Failure
          heading="Most planners get used for four days, then abandoned."
          evidence={<BareCapture />}
          accent="sky"
          flip
        >
          No tags to set up, no priority levels to assign, no board to maintain. You type one
          line and you&rsquo;re done — because the planners that fail are the ones that feel like
          homework.
        </Failure>

        <HowItWorks />

        <section className={styles.bleed}>
          <div className={styles.shell}>
            <div className={`${styles.section} ${styles.reveal}`}>
              <h2 className={styles.d2}>
                A day has a finite number of hours, and this one already has classes in it.
              </h2>
              <p className={styles.lead}>
                Your free time comes straight from your actual class schedule, not a guess. If what
                you&rsquo;ve planned runs past the hours you actually have, you&rsquo;ll see it
                drawn past the edge — not buried in a warning you&rsquo;d ignore anyway.
              </p>
              <Timeline />
            </div>
          </div>
        </section>
      </main>

      <div className={styles.bleed}>
        <div className={styles.shell}>
          <footer className={styles.close}>
            <p className={styles.closeLine}>One sentence in, a finite day out.</p>
            <Link href="/login" className={styles.textLink}>
              Sign in
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
```

The hero's `DayMark` is currently `size={420}`. **Leave it** — Task 5 owns both the size bump to 560 and the centering, so the mark's placement changes in one commit rather than two.

- [ ] **Step 3: Verify `Failure.tsx` needs no change**

Run: `sed -n '20,50p' ui/landing/Failure.tsx`
Expected: it already accepts `accent?: "marigold" | "coral" | "mocha" | "sky"` and spreads it as `data-accent` on `styles.bleed`. If it does, change nothing. If it does not, add it exactly as the spec describes.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: both clean.

- [ ] **Step 5: Verify in the browser that shells no longer nest**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto http://localhost:3001/
$B js "[...document.querySelectorAll('main [data-accent]')].map(e => e.dataset.accent).join(',')"
$B js "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
```

Expected: `marigold,coral,mocha,sky` and `true` (no horizontal overflow — the `.bleed` element must never reintroduce the `100vw` bug).

The bands are still uncolored at this point; Task 3 paints them. That is expected.

- [ ] **Step 6: Commit only if something needed fixing**

If Steps 1–5 all passed with no edit, there is nothing to commit — report `DONE` with "verification only, no changes required" and say which checks you ran with their actual output.

If you did fix something:

```bash
git add app/page.tsx
git commit -m "fix: <the specific thing that was wrong>

<why it mattered>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 3: Paint the panels

**Files:**
- Modify: `ui/landing/landing.module.css`

**Interfaces:**
- Consumes: `--panel-*` from Task 1; `data-accent` on `.bleed` from Task 2.
- Produces: `.bleed[data-accent]` painted; a `.panelText` guarantee that text on a panel is `--ink`. Task 4 adds the midnight variant beside these rules.

- [ ] **Step 1: Replace the wash rules with panel rules**

In `ui/landing/landing.module.css`, replace the four `.bleed[data-accent="…"]` blocks with:

```css
/* A panel is a colored mat the page sits on. In light it is a real
   saturated surface at OKLCH L 0.80; in dark it is a tinted region of the
   ground at --desk's own L. Neither is an inversion of the other — see
   ui/tokens.css's --panel-* comments for why the two behave differently.

   TEXT DIRECTLY ON A PANEL IS --ink ONLY. --ink-2 measures 4.43:1 on
   marigold and 4.37:1 on coral, under PRODUCT.md's floor; --ink-3 fails on
   all four. .lead and .caption both default to a lighter ink, so both are
   promoted below when they sit on a panel. Anything else needing a
   secondary tone belongs on a --card surface, not on the mat. */
.bleed[data-accent="marigold"] {
  background: var(--panel-marigold);
}

.bleed[data-accent="coral"] {
  background: var(--panel-coral);
}

.bleed[data-accent="mocha"] {
  background: var(--panel-mocha);
}

.bleed[data-accent="sky"] {
  background: var(--panel-sky);
}

/* The panel text rule, enforced rather than documented. */
.bleed[data-accent] .lead,
.bleed[data-accent] .caption {
  color: var(--ink);
}
```

- [ ] **Step 2: Keep the seam rule, and confirm the band comment still describes reality**

The existing `.bleed[data-accent] .band { border-top: 0 }` rule stays exactly as written — a panel's own color edge already divides it from its neighbor, and a hairline on top reads as a seam.

Update the band comment's wording from "wash" to "panel" throughout, and confirm its four numbered hue-distance justifications still match the `accent` values Task 2 passed (`marigold, coral, mocha, sky` in that order). They should; if they do not, the comment is the thing that is wrong — fix it, not the assignment.

- [ ] **Step 3: Verify both themes in the browser**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
S=/private/tmp/claude-501/-Users-virnajanem-navarro-Downloads-adlaw/4829ff6e-66fc-42cd-a29a-0ef75b86b639/scratchpad/shots
$B viewport 1440x900
$B goto http://localhost:3001/
$B js "document.documentElement.setAttribute('data-theme','light'); 'ok'"
$B screenshot $S/t3-light.png
$B js "document.documentElement.setAttribute('data-theme','dark'); 'ok'"
$B screenshot $S/t3-dark.png
```

Then **Read both PNGs.** Expected: four visibly distinct colored bands in light with white miniature cards floating on them; four visibly tinted-but-dim bands in dark with the cards still clearly brighter than the band. If a dark band is indistinguishable from `--desk`, report it rather than raising chroma unilaterally — the value is contract-tested.

- [ ] **Step 4: Confirm no `--wash-` reference survives**

Run: `grep -rn -- "--wash-" ui app DESIGN.md`
Expected: no output.

- [ ] **Step 5: Run the suite**

Run: `npm test`
Run: `npm run lint`
Expected: both clean, including `ui/tokens.contrast.test.ts`'s "superseded --wash-* tokens are gone".

- [ ] **Step 6: Commit**

```bash
git add ui/landing/landing.module.css
git commit -m "feat: paint the four failure bands as real panels

Light bands become saturated mats with the white miniatures floating on
them; dark bands become tinted regions of the ground at --desk's own
lightness, so the card hierarchy holds identically in both themes.

.lead and .caption are promoted to --ink on a panel. Both default to a
lighter ink, and --ink-2 measures 4.43:1 on marigold and 4.37:1 on coral —
under the floor. The rule is enforced in CSS rather than left as a note.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 3b: Every miniature sits on a card surface

**Files:**
- Modify: `ui/landing/demos/demos.module.css`

**Interfaces:**
- Consumes: `--card`, `--edge`, `--r-l` — all existing.
- Produces: the invariant Task 4 depends on — the Timeline carries its own surface, which is what lets the midnight island leave the capacity colors untouched.

**Why this task exists.** Task 3 promoted `.lead` and `.caption` to `--ink` on a panel, which covers the text `Failure.tsx` renders itself. It does **not** cover the `evidence` children — the miniatures under `ui/landing/demos/`. Those render functional color, and measured against the four panels every one of them fails the 4.5:1 floor:

| text token | marigold | coral | mocha | sky |
|---|---|---|---|---|
| `--alert-ink` | 3.47 | 3.43 | 3.52 | 3.60 |
| `--alert` | 2.39 | 2.36 | 2.42 | 2.48 |
| `--primary-ink` | 3.58 | 3.54 | 3.63 | 3.71 |
| `--primary` | 2.39 | 2.35 | 2.41 | 2.47 |
| `--primary-fill` | 2.78 | 2.75 | 2.82 | 2.88 |
| `--ink-3` | 3.08 | 3.04 | 3.11 | 3.19 |
| `--ink-2` | 4.43 | 4.37 | 4.49 | **4.59** |
| `--ink` | **9.06** | **8.94** | **9.17** | **9.39** |

Only `--ink` passes on all four. `--ink-2` passes on sky alone, which is not a rule.

This is visible today: band 1 renders "2h 15m over" in `--alert-ink` and its free/planned line in `--ink-3` directly on marigold; band 3 renders its horizon list the same way on mocha. Bands 2 and 4 mostly escape it because `FocusCard` and `BareCapture`'s input already carry `.card`.

Fixing it also fixes a visual inconsistency: two bands currently show a white card and two do not, so the page reads as four different treatments rather than one system.

**The invariant to satisfy:**

> Inside `.bleed[data-accent]`, every text element either renders in `--ink` **or** sits on a `--card` surface. **No nested cards** — `DESIGN.md` bans them, so a wrapper card around a miniature that already has one is not the fix.

**Current state, so you know what you are working with:**
- `demos.module.css` `.card` (line ~22) already sets `background: var(--card)` — used by `FocusCard` and `StepProgress`'s `<article>`.
- `.bareInner` (line ~329) already sets it — `BareCapture`'s input row.
- `.capBlock` (line ~115) sets **no** background — this is band 1, the worst case.
- `.horizon` (StepProgress's day list, a **sibling** of its `.card`, not a child) sets no background — band 3.
- `.bare` (line ~323) wraps `.bareInner` plus a struck-through list of refused fields (`.refused` — not `.bareHint`, which is the "to capture" chip inside the input) that renders on the panel — band 4.
- `.tl` (line ~223) sets no background — the Timeline, which **Task 4 depends on** having its own surface.

- [ ] **Step 1: Give each uncovered miniature a card surface**

Apply `background: var(--card)`, `border-radius: var(--r-l)`, `box-shadow: var(--edge)`, and comfortable padding to `.capBlock`, `.horizon`, and `.tl`. Use `--edge` and **never** a shadow — `DESIGN.md` reserves shadows for interactive chrome and the transient drag state; a resting card is `--edge` only.

For `.bare`, the struck-through `.refused` list is the problem and they are *meant* to read as dimmed. Do not lighten them further and do not wrap `.bareInner` in a second card. Pick one:
- move the hint row inside the existing `.bareInner` card, or
- give `.bare` the surface and reduce `.bareInner` to a hairline input outline (`box-shadow: var(--edge)` with no fill).

Either satisfies the invariant. Say in your report which you chose and why.

Add a comment above the first of these rules explaining the invariant and naming the measured reason:

```css
/* Every miniature carries its own --card surface, because these sit on
   saturated accent panels and each renders functional color. Measured
   against the four panels, --alert-ink reaches only 3.43-3.60:1,
   --primary-ink 3.54-3.71:1 and --ink-3 3.04-3.19:1 — all under the 4.5:1
   floor. Only --ink clears it (8.94-9.39:1), so anything that is not --ink
   has to sit on white.

   --edge, never a shadow: DESIGN.md reserves shadows for interactive chrome
   and the drag state. A resting card is a hairline. */
```

- [ ] **Step 2: Verify the invariant in the browser, computed rather than eyeballed**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B viewport 1440x2600
$B goto http://localhost:3001/
$B js "document.documentElement.setAttribute('data-theme','light'); 'ok'"
```

Then walk every text node inside an accented band and report any that is neither `--ink` nor on a card. Run this and paste its real output into your report:

```bash
$B js "
const bad=[];
document.querySelectorAll('[data-accent] *').forEach(el=>{
  const t=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
  if(!t) return;
  let p=el, onCard=false;
  while(p && !p.hasAttribute('data-accent')){
    const bg=getComputedStyle(p).backgroundColor;
    if(bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent'){onCard=true;break;}
    p=p.parentElement;
  }
  if(!onCard) bad.push(el.className+' :: '+getComputedStyle(el).color);
});
bad.length? bad.join('\n') : 'INVARIANT HOLDS';
"
```

Expected: `INVARIANT HOLDS`, or a list where **every** reported color resolves to `--ink`. `--ink` is `oklch(0.22 0.004 68)`, which computes to `rgb(28, 26, 25)`. Any reported color that is blue, red, or a mid grey is a failure — fix it and re-run.

- [ ] **Step 3: Screenshot both themes and read them**

```bash
S=/private/tmp/claude-501/-Users-virnajanem-navarro-Downloads-adlaw/4829ff6e-66fc-42cd-a29a-0ef75b86b639/scratchpad/shots
$B js "document.documentElement.setAttribute('data-theme','light'); 'ok'"
$B screenshot $S/t3b-light.png
$B js "document.documentElement.setAttribute('data-theme','dark'); 'ok'"
$B screenshot $S/t3b-dark.png
```

**Read both PNGs.** All four bands should now show a white card holding their miniature, and the four bands should read as one repeated treatment rather than four different ones. In dark, the cards must still be clearly brighter than the band.

- [ ] **Step 4: Confirm nothing regressed**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: clean, 165/165.

- [ ] **Step 5: Commit**

```bash
git add ui/landing/demos/demos.module.css
git commit -m "fix: every landing miniature sits on its own card surface

The miniatures render functional color, and on a saturated panel every one
of those tokens fails AA: --alert-ink reaches 3.43-3.60:1, --primary-ink
3.54-3.71:1, --ink-3 3.04-3.19:1, against a 4.5:1 floor. Only --ink clears
it. Band 1 was rendering \"2h 15m over\" in red directly on marigold and
band 3 its horizon list on mocha.

Task 3 promoted the text Failure.tsx renders itself, but not the evidence
children — this closes that half. It also makes the four bands one repeated
treatment instead of two with cards and two without.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 4: The midnight island

**Files:**
- Modify: `ui/landing/landing.module.css`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `--panel-midnight`, `--on-midnight` from Task 1; `.bleed` from Task 2.
- Produces: `.bleed[data-panel="midnight"]`. Nothing later depends on it.

- [ ] **Step 1: Add the midnight rules**

Append to `ui/landing/landing.module.css`, after the panel rules:

```css
/* The closing section inverts to a deep navy mat with white text — the
   reference system's "dark island on a light page", used exactly once.

   In dark theme it cannot invert; there is nothing to invert against. It
   becomes a raised slab above --card instead, separated by --edge, so it
   still reads as a distinct object rather than a hole in the page. */
.bleed[data-panel="midnight"] {
  background: var(--panel-midnight);
  color: var(--on-midnight);
}

.bleed[data-panel="midnight"] .d2,
.bleed[data-panel="midnight"] .lead {
  color: var(--on-midnight);
}

/* The section's own hairline would be invisible against midnight and reads
   as a seam where the color already divides — same reasoning as a panel. */
.bleed[data-panel="midnight"] .section {
  border-top: 0;
}

:root[data-theme="dark"] .bleed[data-panel="midnight"] {
  box-shadow: var(--edge);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .bleed[data-panel="midnight"] {
    box-shadow: var(--edge);
  }
}
```

- [ ] **Step 2: Mark the closing section in `app/page.tsx`**

Change the closing section's opening tag from:

```tsx
        <section className={styles.bleed}>
```

to:

```tsx
        {/* The one midnight island on the document. The Timeline inside keeps
            its own --card surface, which is what lets --primary, --alert and
            --busy stay untouched — the capacity colors never sit on midnight. */}
        <section className={styles.bleed} data-panel="midnight">
```

- [ ] **Step 3: Verify the timeline kept its own surface**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto http://localhost:3001/
$B js "getComputedStyle(document.querySelector('[data-panel=midnight]')).backgroundColor"
```

Expected: a dark navy. Then screenshot in both themes and **Read** them. The timeline must still render on its own light card, with its blue planned blocks and red day-edge unchanged.

The landing page's timeline is `ui/landing/demos/Timeline.tsx`, styled by `.tl` in `ui/landing/demos/demos.module.css` — **not** `ui/timeline/TodaysShape.module.css`, which is the board's component and is not on this page. Task 3b gives `.tl` its card surface, so by the time you run this it should already hold. If it does not, fix `.tl` rather than relaxing the island: the whole reason the island needs no colour re-tuning is that `--primary`, `--alert` and `--busy` never touch the midnight ground.

Verify it computed, not just visually:

```bash
$B js "getComputedStyle(document.querySelector('[data-panel=midnight] [class*=tl]')).backgroundColor"
```

Expected: an opaque light value in light theme (roughly `rgb(255, 255, 255)`), never `rgba(0, 0, 0, 0)`.

- [ ] **Step 3b: Clean up three stale post-rename comments**

The accent bands were called "washes" before this work renamed them to panels. Three prose comments still say the old word and now describe something that does not exist:

- `app/page.tsx` ~line 86 — "gets a full-bleed accent wash … band-to-wash pairing comment"
- `ui/landing/Failure.tsx` ~line 15 — "paints the full-bleed wash"
- `ui/landing/HowItWorks.tsx` ~lines 36-39 — "unwashed", "four failures get a wash"

Replace "wash" with "panel" in each, keeping the surrounding reasoning intact. Do not reword anything else in those comments — they are load-bearing and correct apart from the stale noun.

- [ ] **Step 4: Verify contrast on the island**

```bash
$B js "const s=getComputedStyle(document.querySelector('[data-panel=midnight] h2')); s.color + ' on ' + getComputedStyle(document.querySelector('[data-panel=midnight]')).backgroundColor"
```

Expected: a near-white on a deep navy. `ui/tokens.contrast.test.ts` already asserts ≥7:1 for both themes; this confirms the tokens actually reached the element.

- [ ] **Step 5: Typecheck, lint, test**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add ui/landing/landing.module.css app/page.tsx
git commit -m "feat: the midnight island on the closing section

One inverted deep-navy mat with white text, used exactly once. In dark it
becomes a raised slab above --card with --edge instead of inverting, since
there is nothing on a dark page to invert against.

The Timeline keeps its own --card surface on the mat, which is what lets
--primary, --alert and --busy go untouched — the capacity colors never sit
on midnight and need no re-tuning.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 5: Centered hero, the D1 rung, and the centered day-mark

**Files:**
- Modify: `ui/landing/landing.module.css`
- Modify: `ui/graphics/DayMark.module.css`

**Interfaces:**
- Consumes: `.hero`, `.heroMark`, `.d1`, `--d1` — all existing.
- Produces: a centered `.hero`; `--d1` topping out at 78px. Task 6's pill sits inside the `<h1>` this task restyles.

- [ ] **Step 1: Raise D1 by one rung**

In `ui/landing/landing.module.css`, in `.landing`, replace the `--d1` declaration and extend the comment:

```css
  /* Four rungs on the existing ladder, seeded at the 20px day title at a
     constant 1.4 ratio: 20 → 28 → 40 → 56 → 78. D1 took the 78 rung when
     the hero centered — a four-word headline centered in a 1080px measure
     wants to be big, and 56px left it floating.

     Every fixed term is in rem, never px. A pure-vw clamp violates WCAG 2.2
     SC 1.4.4 (Resize Text) — the text stops responding to the reader's
     browser font-size setting. The rem intercept is what preserves scaling,
     which is why these numbers look arbitrary. Do not "simplify" them.
     Check: at 375px viewport D1 is 40px; it reaches 78px at ~1421px. */
  --d1: clamp(2.5rem, 1.65rem + 3.63vw, 4.875rem); /* 40 → 78px */
```

Leave `--d2` and `--d3` exactly as they are.

**Do not change `.d1`'s `letter-spacing: -0.024em`.** Inter's metrics asymptote near −0.022em; the reference's −0.048em is for a different typeface and extrapolating produces a squashed logotype.

- [ ] **Step 2: Center the hero**

Replace the `.hero` rule:

```css
/* Centered stack: audience line → headline → lead → the one filled CTA →
   the capture demo. Centering is what let the ambient day-mark move behind
   the stack instead of being cropped by the right edge — DESIGN.md records
   a cropped ring as reading "off-centre rather than as deliberate framing",
   which is why it was pulled from /login. */
.hero {
  position: relative;
  z-index: 0;
  padding-block: clamp(48px, 8vw, 104px) var(--rhythm);
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  text-align: center;
}

/* The lead is measure-capped at 34em, so centering it needs the auto margin
   as well as the flex alignment. */
.hero .lead,
.hero .audience {
  margin-inline: auto;
}
```

- [ ] **Step 3: Center the ambient day-mark**

Replace the `.heroMark` rule in `ui/landing/landing.module.css`:

```css
/* Centered behind the stack rather than pinned top-right. z-index: -1
   (against .hero's own stacking context) keeps it behind the headline and
   demo — texture for the section, not a second thing to read. Positioned
   with a transform rather than negative offsets so it can never reintroduce
   the horizontal-overflow bug a 100vw or offset element would. */
.heroMark {
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  z-index: -1;
}

@media (max-width: 860px) {
  .heroMark {
    display: none;
  }
}
```

- [ ] **Step 4: Check `DayMark.module.css` does not fight the new positioning**

Run: `cat ui/graphics/DayMark.module.css`

The ambient variant sets `position: absolute` there. If it also sets `top`/`right`/`left` values, remove only those — the placement now belongs to the consumer (`.heroMark`), not the graphic. Leave `stroke-width`, opacity, the 140s rotation, the load-in, and both media queries (`prefers-reduced-motion`, `prefers-contrast: more`) untouched.

- [ ] **Step 5: Verify at three widths, both themes**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
S=/private/tmp/claude-501/-Users-virnajanem-navarro-Downloads-adlaw/4829ff6e-66fc-42cd-a29a-0ef75b86b639/scratchpad/shots
$B goto http://localhost:3001/
for w in 375 768 1440; do
  $B viewport ${w}x900
  $B js "document.documentElement.setAttribute('data-theme','light'); 'ok'"
  $B screenshot $S/t5-${w}-light.png --clip 0,0,${w},900
  $B js "document.documentElement.setAttribute('data-theme','dark'); 'ok'"
  $B screenshot $S/t5-${w}-dark.png --clip 0,0,${w},900
done
$B js "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
$B js "getComputedStyle(document.querySelector('h1')).fontSize"
```

**Read all six PNGs.** Expected: no horizontal overflow at any width (`true`); `fontSize` is `78px` at 1440 and `40px` at 375; the day-mark ring is fully visible and concentric behind the stack at 1440, absent below 860.

- [ ] **Step 6: Verify reduced motion still holds the mark still**

```bash
$B js "matchMedia('(prefers-reduced-motion: reduce)').matches"
```

If the daemon reports `false`, verify by temporarily forcing the media query in devtools or by reading `DayMark.module.css` to confirm the `animation: none` rule is intact and unmodified. Do not ship a change to that rule.

- [ ] **Step 7: Typecheck, lint, test, commit**

Run: `npx tsc --noEmit && npm run lint && npm test`

```bash
git add ui/landing/landing.module.css ui/graphics/DayMark.module.css
git commit -m "feat: center the hero, raise D1 to the 78px rung, center the day-mark

The ladder's next rung (56 x 1.4 = 78) — a four-word headline centered in a
1080px measure was floating at 56. Tracking stays flat at -0.024em: Inter
asymptotes near -0.022em, and the reference's -0.048em is a different face.

Centering also fixes the ambient day-mark. DESIGN.md records that a ring
cropped by the screen edge reads as off-centre rather than deliberate, which
is why it was pulled from /login; behind a centered stack it is uncropped.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 6: The pill on the rotating word

**Files:**
- Modify: `ui/type/TaglineWord.module.css`

**Interfaces:**
- Consumes: `--pill-marigold`, `--pill-coral`, `--pill-mocha`, `--pill-sky`, `--on-pill`, `--r-pill` from Task 1 / existing tokens.
- Produces: nothing later depends on it.

`ui/type/TaglineWord.tsx` is **not** modified. The readings live in CSS as `::after` content, and that is load-bearing: it is what keeps `h1.textContent` equal to `"A day that fits."` instead of all four readings concatenated. Do not move them into the DOM.

The pill goes on each `::after` box — four separate pills, one per reading — not on `.word` or `.rotator`. A single pill on the shared grid cell would be sized to the widest reading and would hang off "fits."

- [ ] **Step 1: Add the pill to each reading**

In `ui/type/TaglineWord.module.css`, extend each `:nth-child` block. Replace the four existing pairs with:

```css
/* Each reading wears its own pill, on its own ::after box — four pills, not
   one pill that resizes. A background on .word or .rotator would be sized to
   the widest reading ("closes out.") and would hang off "fits."

   The ::after is an inline box, so its block padding paints outside the line
   box without contributing to layout: the pill is drawn, nothing reflows,
   and the transform/opacity-only rule holds. The grid cell still sizes to
   the widest reading plus its inline padding.

   The hues follow the page's band order (marigold, coral, mocha, sky), so
   the headline teaches the color sequence the reader is about to scroll
   through. That order is fixed by the hue-distance reasoning in
   landing.module.css's band comment, not by the words. */
.word::after {
  background: var(--pill);
  color: var(--on-pill);
  border-radius: var(--r-pill);
  padding: 0.1em 0.3em;
}

.word:nth-child(1) {
  --i: 0;
  --pill: var(--pill-marigold);
}
.word:nth-child(1)::after {
  content: "fits.";
}

.word:nth-child(2) {
  --i: 1;
  --pill: var(--pill-coral);
}
.word:nth-child(2)::after {
  content: "adds up.";
}

.word:nth-child(3) {
  --i: 2;
  --pill: var(--pill-mocha);
}
.word:nth-child(3)::after {
  content: "balances.";
}

.word:nth-child(4) {
  --i: 3;
  --pill: var(--pill-sky);
}
.word:nth-child(4)::after {
  content: "closes out.";
}
```

- [ ] **Step 2: Give the rotator room so the pill is not clipped**

The pill's block padding paints outside the line box. `.d1` has `line-height: 1.02`, which is tight enough that an ancestor with `overflow: hidden` would clip the pill's top and bottom.

Add to `ui/type/TaglineWord.module.css`:

```css
/* The pill paints outside a 1.02 line box. Nothing in the hero clips today,
   but state the requirement here rather than relying on that staying true. */
.rotator {
  display: inline-grid;
  vertical-align: baseline;
  overflow: visible;
}
```

Then confirm no ancestor clips:

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto http://localhost:3001/
$B js "let e=document.querySelector('h1'),o=[];while(e&&e!==document.body){const v=getComputedStyle(e).overflow;if(v!=='visible')o.push(e.className+':'+v);e=e.parentElement}o.join('|')||'none clip'"
```

Expected: `none clip`. If an ancestor clips, add `overflow: visible` to that element rather than shrinking the pill.

- [ ] **Step 3: Verify the accessible name is unchanged — this is the regression that matters**

```bash
$B js "document.querySelector('h1').textContent.trim()"
```

Expected: **exactly** `A day that fits.`

If this returns anything containing "adds up" or "balances", a reading has leaked into the DOM and the change must be reverted. This is the single most important assertion in the task.

Then confirm the server-rendered HTML still ships the slots empty:

```bash
curl -s http://localhost:3001/ | grep -c 'adds up'
```

Expected: `0`.

- [ ] **Step 4: Verify the pill in both themes**

```bash
S=/private/tmp/claude-501/-Users-virnajanem-navarro-Downloads-adlaw/4829ff6e-66fc-42cd-a29a-0ef75b86b639/scratchpad/shots
$B viewport 1440x700
$B js "document.documentElement.setAttribute('data-theme','light'); 'ok'"
$B screenshot $S/t6-pill-light.png --clip 0,0,1440,700
$B js "document.documentElement.setAttribute('data-theme','dark'); 'ok'"
$B screenshot $S/t6-pill-dark.png --clip 0,0,1440,700
```

**Read both.** Expected: a bright marigold pill with dark text in *both* themes — that is the point of `--pill-*` not tracking the theme. If the dark screenshot shows a dim pill, a `--panel-*` token was used by mistake.

- [ ] **Step 5: Verify reduced motion holds "fits." with its pill**

The existing `@media (prefers-reduced-motion: reduce)` block sets `.word { animation: none; opacity: 0 }` and `.word:first-child { opacity: 1 }`. The pill is on `::after`, which is unaffected by those rules, so the first reading keeps its marigold pill and holds. Confirm by reading the block — it needs **no change**. If the implementer changed it, revert that.

- [ ] **Step 6: Lint, test, commit**

Run: `npm run lint && npm test`

```bash
git add ui/type/TaglineWord.module.css
git commit -m "feat: give each tagline reading its own pill

Four pills on four ::after boxes, not one pill on the shared grid cell — a
background on .word would size to \"closes out.\" and hang off \"fits.\"

The hues follow the page's band order, so the headline teaches the color
sequence the reader is about to scroll through.

The readings stay in CSS as ::after content: that is what keeps
h1.textContent equal to \"A day that fits.\" rather than all four readings
concatenated. Verified, along with the server-rendered HTML shipping the
slots empty.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 7: The serif lead

**Files:**
- Modify: `ui/landing/landing.module.css`

**Interfaces:**
- Consumes: `--font-accent` (Source Serif 4), already loaded in `app/layout.tsx`.
- Produces: `.leadSerif`. Task 8 reuses the same treatment on the auth surfaces.

- [ ] **Step 1: Add the serif lead role**

Append to the Type roles section of `ui/landing/landing.module.css`:

```css
/* The editorial serif, in the reference system's own role: section intros
   and lead paragraphs, "a system accent, not a parallel hierarchy". Public
   surfaces only, roughly five instances.

   This is a widening of DESIGN.md's previous rule, which locked Source
   Serif 4 to the focus card's reason line alone. That rule survives inside
   the board unchanged; what the ban list now says is "never a button, label,
   or data value", which is the constraint that was actually doing the work. */
.leadSerif {
  font-family: var(--font-accent), Georgia, serif;
  letter-spacing: 0;
}
```

`.leadSerif` is applied **alongside** `.lead`, not instead of it, so the measure, size, line-height, colour, and the panel-text promotion from Task 3 all still apply. The `letter-spacing: 0` override matters: `.lead` sets `-0.011em`, which is tuned for Inter and reads as cramped on a serif.

- [ ] **Step 2: Apply it to the lead paragraphs**

In `app/page.tsx`, change the hero lead and the closing section's lead to:

```tsx
<p className={`${styles.lead} ${styles.leadSerif}`}>
```

In `ui/landing/Failure.tsx`, change the band's lead to:

```tsx
<p className={`${styles.lead} ${styles.leadSerif}`}>{children}</p>
```

In `ui/landing/HowItWorks.tsx`, change its lead the same way, keeping the existing `style={{ marginTop: 14 }}`.

That is five instances: hero, four bands (one component), HowItWorks, closing section.

- [ ] **Step 3: Verify the font actually loaded**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto http://localhost:3001/
$B js "getComputedStyle(document.querySelector('main p')).fontFamily"
```

Expected: a value containing a Source Serif family name, **not** the Georgia fallback alone. If it falls back, `--font-accent` is not reaching the landing subtree — check `app/layout.tsx`'s variable class is on `<html>`.

- [ ] **Step 4: Screenshot both themes and read them**

```bash
S=/private/tmp/claude-501/-Users-virnajanem-navarro-Downloads-adlaw/4829ff6e-66fc-42cd-a29a-0ef75b86b639/scratchpad/shots
$B viewport 1440x900
$B js "document.documentElement.setAttribute('data-theme','light'); 'ok'"
$B screenshot $S/t7-light.png
$B js "document.documentElement.setAttribute('data-theme','dark'); 'ok'"
$B screenshot $S/t7-dark.png
```

**Read both.** The leads should read as editorial serif; every heading, label, chip, button, and data value must still be Inter. If a serif has reached a chip or a button, the class was applied too broadly.

- [ ] **Step 5: Typecheck, lint, test, commit**

Run: `npx tsc --noEmit && npm run lint && npm test`

```bash
git add ui/landing/landing.module.css app/page.tsx ui/landing/Failure.tsx ui/landing/HowItWorks.tsx
git commit -m "feat: Source Serif 4 carries the landing lead paragraphs

The reference system's Lyon Text role — section intros and leads, a system
accent rather than a parallel hierarchy. Five instances, public surfaces
only; the focus card's reason line inside the board is untouched.

.leadSerif composes with .lead rather than replacing it, so the measure and
the panel-text promotion still apply. letter-spacing resets to 0: .lead's
-0.011em is tuned for Inter and reads cramped on a serif.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 8: The auth surfaces

**Files:**
- Modify: `app/(auth)/login/login.module.css`
- Modify: `app/(auth)/signup/signup.module.css`

**Interfaces:**
- Consumes: the pill from Task 6 (automatic — `TaglineWord` is shared), `--font-accent`.
- Produces: nothing later depends on it.

`/login` and `/signup` already render `TaglineWord`, so the pill arrives with no change. This task confirms it lands correctly there and gives their echo line the serif.

- [ ] **Step 1: Verify the pill renders on both auth screens**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
S=/private/tmp/claude-501/-Users-virnajanem-navarro-Downloads-adlaw/4829ff6e-66fc-42cd-a29a-0ef75b86b639/scratchpad/shots
$B viewport 1440x900
for p in login signup; do
  $B goto http://localhost:3001/$p
  $B js "document.documentElement.setAttribute('data-theme','light'); 'ok'"
  $B screenshot $S/t8-$p-light.png
  $B js "document.documentElement.setAttribute('data-theme','dark'); 'ok'"
  $B screenshot $S/t8-$p-dark.png
done
```

**Read all four.** Expected: the pill appears on the echo tagline in both themes, bright in both, uncropped.

- [ ] **Step 2: Fix clipping if the pill is cut off**

If either screenshot shows a clipped pill, find the clipping ancestor:

```bash
$B goto http://localhost:3001/login
$B js "let e=document.querySelector('[class*=rotator]'),o=[];while(e&&e!==document.body){const v=getComputedStyle(e).overflow;if(v!=='visible')o.push(e.className+':'+v);e=e.parentElement}o.join('|')||'none clip'"
```

Add `overflow: visible` to the named element in that page's module CSS. Do not shrink the pill padding — it is shared with the landing hero.

- [ ] **Step 3: Give the echo line the serif**

In each of `login.module.css` and `signup.module.css`, find the rule for the paragraph beneath the echo tagline (the lead-equivalent — identify it by reading the corresponding `page.tsx`) and add:

```css
  font-family: var(--font-accent), Georgia, serif;
  letter-spacing: 0;
```

Do **not** touch the form labels, inputs, buttons, error text, or the ambient sweep. The serif is for prose only.

- [ ] **Step 4: Confirm the ambient sweep is untouched**

Run: `grep -n "sheen\|sweep" "app/(auth)/login/login.module.css"`
Expected: the `--sheen` ambient rules are byte-identical to `git show HEAD:'app/(auth)/login/login.module.css'`. Verify with:

```bash
git diff -- "app/(auth)/login/login.module.css" | grep -c "sheen"
```

Expected: `0` — no sweep line appears in the diff.

- [ ] **Step 5: Re-screenshot, read, then lint, test, commit**

Repeat Step 1's screenshots and **Read** them.

Run: `npx tsc --noEmit && npm run lint && npm test`

```bash
git add "app/(auth)/login/login.module.css" "app/(auth)/signup/signup.module.css"
git commit -m "feat: serif echo line on the auth surfaces

The pill arrives on /login and /signup for free — both already render
TaglineWord. This gives their echo line the same Source Serif 4 treatment
the landing leads got, and nothing else: labels, inputs, buttons, error
text, and the ambient sweep are untouched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 9: Board material pass

**Files:**
- Modify: `ui/board/TaskCard.module.css:174` and `:404`
- Modify: `ui/board/DeleteUndoContext.module.css:20`
- Modify: `ui/capture/CaptureBar.module.css:80`
- Modify: `ui/landing/CaptureDemo.module.css:14`
- Modify: `ui/landing/demos/demos.module.css:334`

**Interfaces:**
- Consumes: `--primary-ink`, `--r-l` — both existing.
- Produces: nothing.

**No new color and no layout change.** This is the audit half of the spec: three real contrast fixes and three comments.

- [ ] **Step 1: Fix `.retryBtn`**

`ui/board/TaskCard.module.css:174` uses `color: var(--primary)` on a `--card` ground. Measured: **4.56:1** at 11px — it passes by 0.06, which is not a margin. `--primary-ink` measures 6.85:1.

```css
.retryBtn {
  display: block;
  margin: 2px 13px 8px;
  font-size: 11px;
  font-weight: 600;
  /* --primary-ink, not --primary: text on a surface takes the ink variant.
     --primary on --card measures 4.56:1 at 11px — over the 4.5:1 floor by
     0.06, which is not a margin. --primary-ink is 6.85:1. Same reasoning as
     ui/capture/CaptureBar.module.css's chips. */
  color: var(--primary-ink);
}
```

- [ ] **Step 2: Fix `.undo` in `TaskCard.module.css`**

This one sits in the done row (`.doneCard`), which sets no background of its own and so inherits the lane ground. On `--card` that is 4.56:1; on `--desk` it is **4.18:1**, a real failure. `--primary-ink` clears both (6.85:1 / 6.28:1), so it is correct either way and no further measurement is needed.

```css
.undo {
  font-size: 11px;
  font-weight: 600;
  /* --primary-ink, not --primary — see .retryBtn above. This sits in the
     done row, which sets no background and inherits the lane ground:
     4.56:1 on --card but 4.18:1 on --desk, under the floor. --primary-ink
     clears both (6.85 / 6.28). */
  color: var(--primary-ink);
  padding: 4px 8px;
  border-radius: var(--r-m);
  flex: none;
}
```

- [ ] **Step 3: Fix `.undo` in `DeleteUndoContext.module.css` — the worst of the three**

`.toast` sets `background: var(--ink)`. That is an **inverted** surface: near-black in light, near-white in dark. Measured, `color: var(--primary)` on it is **3.80:1 in light and 2.09:1 in dark** — and `--primary-ink` is worse still at 2.53:1, because both blues were tuned against normal-polarity grounds.

This is the Undo affordance for a destructive delete, so it takes the `--primary-on-ink` token added in Task 1 (light 7.58:1, dark 6.27:1):

```css
.undo {
  font-weight: 600;
  /* --primary-on-ink, not --primary or --primary-ink. .toast above sets
     `background: var(--ink)` — an inverted surface, near-black in light and
     near-white in dark — and BOTH normal blues fail on it: --primary is
     3.80:1 light / 2.09:1 dark, --primary-ink 2.53:1 light. An inverted
     surface takes the other theme's blue; that is what --primary-on-ink is.
     Measured 7.58:1 light, 6.27:1 dark. */
  color: var(--primary-on-ink);
  padding: 6px 10px;
  border-radius: var(--r-m);
}
```

Do **not** change `.toast`'s own `background` or `color` — `--desk` on `--ink` already measures 15.87:1 light and 18.14:1 dark. The toast is fine; only its link was wrong.

- [ ] **Step 4: Document the three 11px radii**

These are **not** drift and must **not** be tokenized. Each is an inner surface inside a 12px container behind a 1px inset edge: 12 − 1 = 11 is the correct nested radius, because concentric corners need the inner radius reduced by the offset or the curves visibly diverge.

Add this comment above each of the three `border-radius: 11px` declarations:

```css
  /* 11, not 12: this inner surface sits inside a 12px container behind a 1px
     inset edge, and concentric corners need the inner radius reduced by the
     offset or the two curves visibly diverge. Not drift, and not worth a
     --r-l-inner token for three call sites. */
```

- [ ] **Step 5: Verify nothing else changed**

```bash
git diff --stat
```

Expected: exactly the six files above, with small diffs. If `git diff` shows a layout or color property other than the three `color:` changes and three comments, revert it.

- [ ] **Step 6: Lint, test, commit**

Run: `npm run lint && npm test`

```bash
git add ui/board/TaskCard.module.css ui/board/DeleteUndoContext.module.css ui/capture/CaptureBar.module.css ui/landing/CaptureDemo.module.css ui/landing/demos/demos.module.css
git commit -m "fix: three text-on-surface contrast failures, one of them real

The delete-undo toast is the serious one. .toast sets background: var(--ink),
an inverted surface, and its Undo link measured 3.80:1 in light and 2.09:1
in dark — the control that reverses a destructive delete, well under AA.
--primary-ink made it worse (2.53:1): both blues were tuned against
normal-polarity grounds. It now uses --primary-on-ink, which is just the
polarity flip (an inverted surface takes the other theme's blue): 7.58 / 6.27.

The other two are margin cases. --primary as text measures 4.56:1 on --card
and 4.18:1 on --desk; --primary-ink is 6.85 / 6.28. Same fix CaptureBar
already shipped.

The 11px radii in CaptureBar, CaptureDemo and demos are correct nested radii
(12px container minus a 1px inset edge), not drift. They read as drift only
because they were undocumented, so they get a comment rather than a token.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 10: Amend the documentation

**Files:**
- Modify: `DESIGN.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything built in Tasks 1–9.
- Produces: nothing.

`DESIGN.md` is the system's source of truth and it currently describes a system that no longer exists. Write it so a later reader finds a **decision**, not drift — matching how the 2026-08-18 pivot note and the Framer Motion exception are already written.

- [ ] **Step 1: §Color → Tokens**

Add `--panel-*`, `--pill-*`, `--on-pill`, `--on-midnight` to both theme blocks in the code fence, with the measured ratios stated inline (marigold 9.06:1, coral 8.94:1, sky 9.39:1, mocha 9.17:1 for `--ink`; midnight 17.39:1 for `--on-midnight`; card-on-dark-panel 1.10:1 matching the card/desk baseline).

Note that `ui/tokens.contrast.test.ts` now guards these, and that the numbers are asserted rather than claimed.

Also add `--primary-on-ink` with its own short note: it is the accent for an
inverted surface, it exists because the delete-undo toast sets
`background: var(--ink)` and both normal blues fail there (3.80:1 / 2.09:1,
and `--primary-ink` worse at 2.53:1), and its derivation is the polarity
flip — an inverted surface takes the other theme's blue.

- [ ] **Step 2: §Color → Rules — add two rules**

```markdown
- **Text directly on a light panel is `--ink` and nothing else.** `--ink-2`
  measures 4.43:1 on marigold and 4.37:1 on coral; `--ink-3` fails on all
  four (3.04–3.19:1). Anything needing a secondary or meta tone sits on a
  `--card` surface, where the full ink ladder is available. Dark panels do
  carry the whole ladder, but the rule is written for the stricter theme so
  one rule serves both.
- **Large fills track the theme; chips hold their light value.** A saturated
  full-bleed band is fatiguing at night and breaks "quiet at rest", so
  `--panel-*` dims in dark. A chip of one word is punctuation and must read
  as the same object in both themes, so `--pill-*` does not, and `--on-pill`
  is always the dark ink. This is why two token families exist for four hues.
```

- [ ] **Step 3: §Color → Rules — amend the reserved-accent rule**

The existing bullet says the accent tokens "are not wired into any component in v1." Replace it:

```markdown
- The accent cast is wired as `--panel-*` and `--pill-*` on the **public
  surfaces only** (`/`, `/login`, `/signup`). Inside the board it remains
  banned: `--primary` means committed/planned and `--alert` means past the
  edge of the day, and a third chromatic signal on a task card is the palette
  equivalent of the per-course-color failure mode. There is still no
  per-course color system.
```

- [ ] **Step 4: §Typography and §Landing surface**

- Add the 78px D1 rung to the landing display table, with the clamp and the note that the ladder is now 20 → 28 → 40 → 56 → 78 at the same 1.4 ratio.
- Restate that tracking stays flat at −0.021…−0.024em and that the reference's −0.048em is a different typeface. This is already the strongest warning in the file; keep it.
- Record the centered hero and that centering is what removed the day-mark's crop objection.
- Add the serif lead role.

- [ ] **Step 5: §Components — day-mark and rotating tagline**

Under the day-mark entry, after the existing paragraph about the crop on `/login`, add that the ambient scale is now centered behind the landing hero at ~560px, and that centering is what makes it work — the objection was the crop, not the size.

Under the rotating tagline entry, add the pill and the reading↔band mapping, including that the hue order is fixed by the hue-distance reasoning in `landing.module.css`'s band comment and the readings map onto it, not the other way round.

- [ ] **Step 6: §Bans — two corrections**

Replace the Source Serif 4 ban line with:

```markdown
- The Source Serif 4 accent as a button, label, or data value. It carries the
  focus card's reason line inside the board and the lead paragraphs on the
  public surfaces; it never carries UI chrome.
```

Then find the §Color → Rules note claiming `ui/capture/CaptureBar.module.css` "still ships the failing pairing" and **delete that clause**. It is false: line 70 already uses `--primary-ink`, with the reasoning in a comment. Replace it with a note that the board's remaining `--primary`-as-text call sites were fixed in this pass.

- [ ] **Step 7: Fix the `CLAUDE.md` contradiction**

`CLAUDE.md`'s design-constraints section still says:

> **No warm-neutral surfaces** and none of the token names that come with them (`--paper`, `--cream`, `--linen`, `--parchment`, `--sand`).

That contradicts `DESIGN.md`'s post-pivot warm `--desk`, which is deliberate and documented. Replace it with:

```markdown
- **No warm-neutral *textures*.** The 2026-08-18 pivot made `--desk` a warm
  flat canvas on purpose — that is the palette's signature and it is not the
  thing being banned. What stays banned is texture and prop: paper grain,
  parchment, linen, stains, tape. A warm hex value is not a prop. Avoid the
  token names that carry the skeuomorphic reading anyway (`--paper`,
  `--cream`, `--linen`, `--parchment`, `--sand`); the system's names are
  `--desk`, `--rail`, `--card`, `--panel-*`.
```

Also update `CLAUDE.md`'s module-map line for `ui/landing/` to mention the panel system, and its `ui/tokens.css` line to mention the contrast test.

- [ ] **Step 8: Verify the docs match the code**

```bash
grep -c "panel-marigold" DESIGN.md ui/tokens.css
grep -c "wash-" DESIGN.md CLAUDE.md ui/tokens.css ui/landing/landing.module.css
grep -n "still ships the failing pairing" DESIGN.md
```

Expected: `--panel-marigold` present in both files; zero `wash-` anywhere; no output from the third grep.

- [ ] **Step 9: Commit**

```bash
git add DESIGN.md CLAUDE.md
git commit -m "docs: record the panel system as a decision, not drift

DESIGN.md gains the panel and pill tokens with their measured ratios, the
panel text rule, and the large-fills-track-the-theme rule. The
reserved-accent bullet is amended: the cast is now wired on public surfaces
and still banned inside the board, for the reason it was always banned.

Two corrections while here. DESIGN.md claimed CaptureBar still ships the
failing --primary-on-tint pairing; it does not, and has not for some time.
CLAUDE.md still banned warm-neutral surfaces, which the 2026-08-18 pivot
deliberately adopted — the ban is on texture and props, not on a warm hex.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01E1cSvkT53pu3FEWU33EayA"
```

---

### Task 11: Full verification sweep

**Files:** none modified unless a defect is found.

**Interfaces:**
- Consumes: everything.
- Produces: a pass/fail report.

- [ ] **Step 1: Static checks**

```bash
npx tsc --noEmit
npm run lint
npm test
```

Expected: all clean. **Do not run `npm run build`** — a dev server is live on 3001 and building clobbers its `.next/`.

- [ ] **Step 2: Every public surface, both themes, three widths**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
S=/private/tmp/claude-501/-Users-virnajanem-navarro-Downloads-adlaw/4829ff6e-66fc-42cd-a29a-0ef75b86b639/scratchpad/shots
for p in "" login signup; do
  for w in 375 768 1440; do
    for t in light dark; do
      $B viewport ${w}x1000
      $B goto http://localhost:3001/$p
      $B js "document.documentElement.setAttribute('data-theme','$t'); 'ok'"
      $B screenshot $S/final-${p:-home}-${w}-${t}.png
    done
  done
done
```

**Read every PNG.** 18 images. Check each for: no horizontal overflow, no clipped pill, panels visibly distinct in light and visibly tinted in dark, cards always brighter than the surface under them, the day-mark uncropped at 1440 and absent at 375.

- [ ] **Step 3: The accessibility assertions**

```bash
$B goto http://localhost:3001/
$B js "document.querySelector('h1').textContent.trim()"
$B js "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
curl -s http://localhost:3001/ | grep -c 'adds up'
```

Expected: `A day that fits.` — exactly; `true`; `0`.

- [ ] **Step 4: Console and network clean**

```bash
$B goto http://localhost:3001/
$B console --errors
$B network
```

Expected: no errors and no failed requests. A hydration mismatch here would be a real defect — the landing page is a server component and nothing in this plan added client state.

- [ ] **Step 5: Report**

Write a short report naming: which tasks landed, every screenshot path, the three assertions from Step 3 with their actual values, and anything that failed. Do not claim completion for a step whose command was not run and whose output was not read.

## Notes for the executor

- **Read the spec first.** `docs/superpowers/specs/2026-09-06-panel-system-design.md` carries the reasoning; this plan carries the steps. Where they disagree, the spec wins and the plan is wrong — say so rather than picking one.
- **Every colour value in this plan is contract-tested.** If a panel looks wrong to you, report it. Do not adjust an OKLCH literal without also updating `ui/tokens.contrast.test.ts` and saying why in the commit.
- **Screenshots are not optional and must actually be read.** Contrast and dimming bugs in this system are invisible in one theme and obvious in the other; that is stated in `CLAUDE.md` and it is the reason both themes appear in every verification step.
