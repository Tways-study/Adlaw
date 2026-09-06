import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the measured contrast ratios DESIGN.md depends on, and the exact
 * literals ui/tokens.css must declare.
 *
 * Pure by construction: it reads a CSS file as text and does arithmetic. No
 * DOM, no environment — which is what lets it run in the fast `npm test`
 * suite alongside core/'s tests (vitest.config.mts includes every *.test.ts
 * file recursively and configures no environment).
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
