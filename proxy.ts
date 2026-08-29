import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { UID_HEADER } from "./sessionHeader";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const AUTH_PAGES = ["/login", "/signup"];
const LANDING = ["/"];
// Preserved verbatim from the Convex version — /icon and /apple-icon are
// Next's generated routes for app/icon.tsx / app/apple-icon.tsx, dot-less
// URLs the matcher's dot-exclusion doesn't catch. See CLAUDE.md.
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/icon", "/apple-icon"];

// Returns the verified subject (the Firebase uid) or null. The uid comes from
// the JWT's own `sub` claim *after* signature, issuer, and audience checks —
// never from anything the client can set directly.
async function verifiedUid(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

// Same three rules, same order, as the Convex version. The old "middleware
// IS the auth endpoint" concern doesn't apply here — there's no server-side
// POST interception for sign-in under Firebase, this is a pure cryptographic
// JWT check against the cookie. The /(api|trpc)(.*) matcher entry is kept
// for parity even though no route lives there today.
export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const uid = await verifiedUid(request);
  const authed = uid !== null;

  if (authed && (AUTH_PAGES.includes(path) || LANDING.includes(path))) {
    return NextResponse.redirect(new URL("/board", request.url));
  }
  if (!authed && !PUBLIC_ROUTES.includes(path)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Hand the verified uid down to the Route Handlers, which have no way to
  // check the cookie themselves (no Admin SDK). The header is unconditionally
  // deleted first so an inbound request carrying a forged one can never
  // survive: past this point its only possible source is the jwtVerify above.
  // Note this runs for page requests too — harmless, and it keeps the "always
  // stripped" invariant true for every path the matcher covers rather than
  // only the ones that happen to read it today.
  const headers = new Headers(request.headers);
  headers.delete(UID_HEADER);
  if (uid) headers.set(UID_HEADER, uid);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
