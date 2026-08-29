// The one name shared by proxy.ts (which sets this header from a verified
// token) and app/api/ai/guard.ts (which reads it). It lives in its own
// module, with no imports, on purpose: proxy.ts calls createRemoteJWKSet at
// module scope, so a Route Handler importing the constant *from* proxy.ts
// would execute that JWKS setup inside the route's own bundle. A bare
// constant file keeps the two sides in sync with no side effects either way.

export const UID_HEADER = "x-adlaw-uid";
