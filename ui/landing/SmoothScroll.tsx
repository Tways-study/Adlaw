"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

// Renders nothing — this is a client island that exists purely to run
// Lenis's requestAnimationFrame loop for as long as / is mounted. Lenis
// drives the real native scrollTop (not a transform-based virtual scroll),
// so position: sticky, anchor links, and this page's own scroll-driven
// .reveal sections (landing.module.css's animation-timeline: view()) all
// keep working unmodified. prefers-reduced-motion is honored by Lenis
// itself by default (lerp forced to 1 — scroll tracks the input device
// 1:1, no easing), so no separate media-query handling is needed here.
//
// Scoped to this page rather than the root layout: cleanup on unmount
// means /board, /login, and /signup — which either don't scroll the
// document or shouldn't have their scroll feel altered — are never
// affected by Next's client-side navigation away from /.
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return null;
}
