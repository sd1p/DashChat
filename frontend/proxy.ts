import { auth } from "@/auth";

// Next 16 "proxy" file convention (the renamed Middleware). Replaces the old
// react-router <Show>/<Navigate> auth guard: app pages require a signed-in
// Argus session and redirect to /login otherwise.
//
// IMPORTANT: /api and /socket.io are public *to the proxy* — the REST API is
// rewritten (next.config.ts) to the Express backend, which does its own auth via
// the Argus Bearer token (JWKS-verified). /api/auth/* is Auth.js's own OIDC
// endpoints. If the proxy guarded these it would redirect unauthenticated XHRs
// to /login instead of letting the backend / Auth.js respond.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/socket.io");

  if (!isPublic && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files; run on app pages so the auth guard
    // applies. API/socket paths are matched too but treated as public above.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
