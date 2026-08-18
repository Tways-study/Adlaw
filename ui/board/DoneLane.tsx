// S2 "Done" lane: "Hidden entirely until the first completion today"
// (docs/02-app-flow.md). Slice 1 has no capture, so a completion can never
// exist yet — this can only ever render null this slice.
export function DoneLane() {
  return null;
}
