import { ImageResponse } from "next/og";

// The browser-tab favicon, generated from the day-mark's exact geometry
// (ui/graphics/DayMark.tsx: center 50,50, radius 42, start at 12 o'clock,
// 58% fill). This route can't read ui/tokens.css — next/og renders via
// Satori, server-side, independent of the app's CSS — so the three colors
// below are the light-theme --line / --primary-fill / --alert values,
// converted from OKLCH to sRGB hex once and hardcoded. Satori's color
// parser doesn't reliably support oklch(), which is the other reason not
// to pass the token strings through directly.
//
// Transparent background, on purpose: a favicon sits on the browser's own
// tab-strip color, not a canvas the app controls, so forcing an opaque fill
// here would fight whatever chrome surrounds it.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const TRACK = "#d8d5d2"; // --line, light
const ARC = "#0069d0"; // --primary-fill, light
const NOTCH = "#e22a12"; // --alert, light

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
        }}
      >
        <svg width="30" height="30" viewBox="0 0 100 100">
          <circle
            cx={50}
            cy={50}
            r={42}
            fill="none"
            stroke={TRACK}
            strokeWidth={7}
          />
          <path
            d="M 50 8 A 42 42 0 1 1 29.77 86.80"
            fill="none"
            stroke={ARC}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <line
            x1={33.14}
            y1={80.67}
            x2={26.40}
            y2={92.94}
            stroke={NOTCH}
            strokeWidth={7}
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
