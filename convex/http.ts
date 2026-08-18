import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// JWKS/JWT verification routes Convex Auth needs regardless of provider —
// not the Google Calendar OAuth callback. That route (docs/04-tdd.md
// §Calendar integration) is added here in Slice 6, not before.
auth.addHttpRoutes(http);

export default http;
