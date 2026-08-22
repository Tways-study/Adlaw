import { ImageResponse } from "next/og";

// The iOS home-screen icon. Same geometry and source as icon.tsx (see that
// file for why the colors are hardcoded hex rather than the CSS tokens),
// but opaque: Apple's HIG renders a transparent apple-touch-icon as solid
// black, so this needs a real fill. --card (light) rather than --desk —
// a single static export can't follow the viewer's theme, and white reads
// correctly regardless of which theme the OS is in. No border-radius here:
// iOS applies its own corner mask, and pre-rounding would double it.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const CARD = "#ffffff"; // --card, light
const TRACK = "#d8d5d2"; // --line, light
const ARC = "#0069d0"; // --primary-fill, light
const NOTCH = "#e22a12"; // --alert, light

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CARD,
        }}
      >
        <svg width="118" height="118" viewBox="0 0 100 100">
          <circle
            cx={50}
            cy={50}
            r={42}
            fill="none"
            stroke={TRACK}
            strokeWidth={4.5}
          />
          <path
            d="M 50 8 A 42 42 0 1 1 29.77 86.80"
            fill="none"
            stroke={ARC}
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          <line
            x1={33.14}
            y1={80.67}
            x2={26.40}
            y2={92.94}
            stroke={NOTCH}
            strokeWidth={4.5}
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
