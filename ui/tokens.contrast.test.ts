import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the contrast ratios DESIGN.md depends on, and the exact literals
 * ui/tokens.css must declare — the Linear reference system, dark-only.
 *
 * Pure by construction: it reads a CSS file as text and does arithmetic. No
 * DOM, no environment — which is what lets it run in the fast `npm test`
 * suite alongside core/'s tests.
 */

type Rgb = readonly [r: number, g: number, b: number]; // 0–255 per channel

function hex(value: string): Rgb {
  const h = value.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as unknown as Rgb;
}

const decode = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance. */
function luminance([r, g, b]: Rgb): number {
  return 0.2126 * decode(r) + 0.7152 * decode(g) + 0.0722 * decode(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Source-over composite of a translucent color onto an opaque ground, in
 *  sRGB space — the way browsers blend `rgb(… / alpha)` backgrounds. */
function over(fg: Rgb, alpha: number, ground: Rgb): Rgb {
  return fg.map((c, i) => c * alpha + ground[i] * (1 - alpha)) as unknown as Rgb;
}

// ── The palette under test ────────────────────────────────────────────────
const TOKENS = {
  desk: "#08090a",
  rail: "#08090a",
  card: "#0f1011",
  "card-hi": "#161718",
  ink: "#ffffff",
  "ink-2": "#d0d6e0",
  "ink-3": "#8a8f98",
  line: "#383b3f",
  "line-soft": "#23252a",
  busy: "#23252a",
  primary: "#d0d6e0",
  "primary-fill": "#e5e5e6",
  "primary-ink": "#d0d6e0",
  "on-fill": "#08090a",
  action: "#e4f222",
  "on-action": "#08090a",
  alert: "#eb5757",
  "alert-ink": "#eb5757",
} as const;

type Token = keyof typeof TOKENS;
const c = (name: Token) => hex(TOKENS[name]);

/** Linear's "Ash" — its labelled muted-body-text grey, deliberately NOT used. */
const ASH = hex("#62666d");
const PRIMARY_SOFT = { rgb: [255, 255, 255] as const, alpha: 0.05 };
const ALERT_SOFT = { rgb: [235, 87, 87] as const, alpha: 0.12 };

const SURFACES = ["desk", "card", "card-hi"] as const;

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

describe("the ink ladder clears AA on every surface", () => {
  for (const ink of ["ink", "ink-2", "ink-3"] as const) {
    for (const surface of SURFACES) {
      it(`--${ink} on --${surface}`, () => {
        expect(contrast(c(ink), c(surface))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

// Asserted from the failing side: if Ash ever passed, --ink-3 could follow the
// reference literally — but that must be a deliberate change, not drift.
describe("Linear's Ash is why --ink-3 is Fog", () => {
  it("fails AA on the canvas and on cards", () => {
    expect(contrast(ASH, c("desk"))).toBeLessThan(4.5);
    expect(contrast(ASH, c("card"))).toBeLessThan(4.5);
  });
});

describe("text on Linear's pill/badge ground (--primary-soft over --card)", () => {
  const ground = over(PRIMARY_SOFT.rgb, PRIMARY_SOFT.alpha, c("card"));

  it("--ink-3 (badge text) clears AA", () => {
    expect(contrast(c("ink-3"), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it("--primary-ink clears AA", () => {
    expect(contrast(c("primary-ink"), ground)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("coral carries overcommit text", () => {
  for (const surface of SURFACES) {
    it(`--alert-ink on --${surface}`, () => {
      expect(contrast(c("alert-ink"), c(surface))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("--alert-ink on --alert-soft composited over --card", () => {
    const wash = over(ALERT_SOFT.rgb, ALERT_SOFT.alpha, c("card"));
    expect(contrast(c("alert-ink"), wash)).toBeGreaterThanOrEqual(4.5);
  });

  // DESIGN.md bans coral text on Graphite; this is the measured reason.
  it("fails on --busy / --line-soft, which is why that pairing is banned", () => {
    expect(contrast(c("alert-ink"), c("busy"))).toBeLessThan(4.5);
  });
});

describe("fills carry their own text", () => {
  it("--on-action on --action (the lime button)", () => {
    expect(contrast(c("on-action"), c("action"))).toBeGreaterThanOrEqual(4.5);
  });

  it("--on-fill on --primary-fill", () => {
    expect(contrast(c("on-fill"), c("primary-fill"))).toBeGreaterThanOrEqual(4.5);
  });
});

// WCAG 2.2 SC 1.4.11: a focus indicator is a non-text UI component, 3:1.
describe("the Mist focus ring is visible on every surface", () => {
  for (const surface of SURFACES) {
    it(`--primary on --${surface}`, () => {
      expect(contrast(c("primary"), c(surface))).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("ui/tokens.css declares exactly these literals", () => {
  for (const [name, value] of Object.entries(TOKENS)) {
    it(`--${name}: ${value}`, () => {
      expect(css.split(`--${name}: ${value};`).length - 1).toBe(1);
    });
  }

  it("declares the translucent grounds", () => {
    expect(css).toContain("--primary-soft: rgb(255 255 255 / 0.05);");
    expect(css).toContain("--alert-soft: rgb(235 87 87 / 0.12);");
  });

  it("is dark-only", () => {
    expect(css).toContain("color-scheme: dark;");
    expect(css).not.toContain("data-theme");
    expect(css).not.toContain("prefers-color-scheme");
  });

  it("the superseded token families are gone", () => {
    for (const gone of [
      "--panel-",
      "--pill-",
      "--accent-",
      "--on-pill",
      "--on-midnight",
      "--primary-on-ink",
      "--sheen",
      "--groove",
      "--wash-",
    ]) {
      expect(css).not.toContain(gone);
    }
  });
});
