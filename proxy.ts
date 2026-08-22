import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isLoginPage = createRouteMatcher(["/login"]);
const isLanding = createRouteMatcher(["/"]);
// /icon and /apple-icon are Next's generated routes for app/icon.tsx and
// app/apple-icon.tsx — no dot in the URL, so the matcher below doesn't
// exclude them the way it excludes /favicon.ico. Without this, a signed-out
// request for either (e.g. a browser fetching the tab favicon while on
// /login) gets 307'd to /login instead of returned as image bytes, and the
// favicon silently breaks on the one page that most needs it to work.
const isPublicRoute = createRouteMatcher(["/", "/login", "/icon", "/apple-icon"]);

// Three rules, authed checked first:
//   1. Authed hitting /login or / (the landing page) → bounce to /board.
//      There's nothing for a signed-in user to do on either public route.
//   2. Unauthed hitting anything that isn't public (/, /login) → bounce to
//      /login. This must run after rule 1 or an authed user would never
//      reach /board from /.
//   3. Otherwise fall through — public routes for the unauthed, /board
//      (and everything else) for the authed.
export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();
  if (authed && (isLoginPage(request) || isLanding(request))) {
    return nextjsMiddlewareRedirect(request, "/board");
  }
  if (!authed && !isPublicRoute(request)) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

// Keep "/(api|trpc)(.*)" — the middleware IS the auth endpoint
// (shouldProxyAuthAction runs before the handler above); dropping it
// breaks sign-in silently, with no error at the source.
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
