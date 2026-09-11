import { ImageResponse } from "next/og";

// The browser-tab favicon, generated from the day-mark's exact geometry
// (ui/graphics/DayMark.tsx: center 50,50, radius 42, start at 12 o'clock,
// 58% fill). This route can't read ui/tokens.css — next/og renders via
// Satori, server-side, independent of the app's CSS — so the colors below
// are the token hex values copied once.
//
// Opaque Void tile, not transparent: the glyph is light-on-dark now, and a
// light glyph on a transparent background disappears on a light browser
// tab strip.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const TILE = "#08090a"; // --desk (Void)
const TRACK = "#383b3f"; // --line (Smoke)
const ARC = "#e5e5e6"; // --primary-fill (Bone)
const NOTCH = "#d0d6e0"; // --ink-2 (Mist)

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: TILE,
          borderRadius: 7,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 100 100">
          <circle
            cx={50}
            cy={50}
            r={42}
            fill="none"
            stroke={TRACK}
            strokeWidth={8}
          />
          <path
            d="M 50 8 A 42 42 0 1 1 29.77 86.80"
            fill="none"
            stroke={ARC}
            strokeWidth={8}
            strokeLinecap="round"
          />
          <line
            x1={33.14}
            y1={80.67}
            x2={26.40}
            y2={92.94}
            stroke={NOTCH}
            strokeWidth={8}
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
