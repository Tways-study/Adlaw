import type { ValueAnimationTransition } from "framer-motion";

// DESIGN.md §Motion's two spring rows, named for what they animate. These are
// the single source other modules import from — mirroring how --ease is the
// one easing token in ui/tokens.css — so the physics live in one place rather
// than as inline literals scattered across components.
//
// DESIGN.md writes them in Apple's own damping/response vocabulary (see the
// apple-design skill): duration ≈ response, bounce ≈ overshoot amount, 0 =
// critically damped. Framer Motion's { type: "spring", duration, bounce }
// form is that same vocabulary, not an approximation of it.

// "Card settle after drop | Critically damped, bounce 0.12, response 0.4,
// carrying release velocity." A drop follows a drag the user was actively
// carrying momentum in — exactly when a touch of bounce is correct, per
// apple-design's own rule: add bounce only when the gesture itself carried
// momentum; overshoot on a card you flicked feels right, overshoot on
// something that just appeared does not.
export const CARD_SETTLE_SPRING: Pick<ValueAnimationTransition, "type" | "duration" | "bounce"> = {
  type: "spring",
  duration: 0.4,
  bounce: 0.12,
};

// "Capacity meter | Critically damped, response 0.45." Not gesture-driven —
// no bounce, matching apple-design's default: start most UI at damping 1.0
// (critically damped), add bounce only under a gesture's momentum.
export const CAPACITY_METER_SPRING: Pick<ValueAnimationTransition, "type" | "duration" | "bounce"> = {
  type: "spring",
  duration: 0.45,
  bounce: 0,
};
