import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

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

async function isAuthed(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    return true;
  } catch {
    return false;
  }
}

// Same three rules, same order, as the Convex version. The old "middleware
// IS the auth endpoint" concern doesn't apply here — there's no server-side
// POST interception for sign-in under Firebase, this is a pure cryptographic
// JWT check against the cookie. The /(api|trpc)(.*) matcher entry is kept
// for parity even though no route lives there today.
export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const authed = await isAuthed(request);

  if (authed && (AUTH_PAGES.includes(path) || LANDING.includes(path))) {
    return NextResponse.redirect(new URL("/board", request.url));
  }
  if (!authed && !PUBLIC_ROUTES.includes(path)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
