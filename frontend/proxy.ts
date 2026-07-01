import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next 16 "proxy" file convention (the renamed Middleware). Replaces the old
// react-router <Show>/<Navigate> auth guard in App.tsx: app pages require a
// signed-in Clerk session and redirect to /login otherwise.
//
// IMPORTANT: /api and /socket.io are public *to the proxy* — they are rewritten
// (next.config.ts) straight to the Express backend, which does its own auth via
// the Clerk Bearer token (@clerk/express). If the proxy guarded them it would
// 307 unauthenticated XHRs to /login instead of letting the backend return 401.
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/api(.*)",
  "/socket.io(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect({ unauthenticatedUrl: new URL("/login", req.url).toString() });
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files; run on app pages so the auth guard
    // applies. API/socket paths are matched too but treated as public above.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
