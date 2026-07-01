import axios, { type AxiosInstance } from "axios";

// Shared axios instance for the whole API repository. Requests use relative
// "/api/..." URLs, which the Next.js dev rewrites (next.config.ts) — and the
// prod host — forward to the Express backend.
//
// The interceptor attaches the Clerk session token as a Bearer header so
// @clerk/express can authenticate each call. (The old auth used an httpOnly
// cookie set by the backend; with Clerk the token lives in window.Clerk and
// must be sent explicitly.) This replaces the former src/lib/axiosClerk.js
// global interceptor.
//
// Client-only: it reads window.Clerk, so any component using the resource
// clients (userApi/chatApi/messageApi) must be a "use client" component.

// window.Clerk is injected by @clerk/nextjs at runtime; its type is declared in
// global.d.ts.
export const apiClient: AxiosInstance = axios.create();

apiClient.interceptors.request.use(async (config) => {
  try {
    const clerk = window.Clerk;
    // Clerk hydrates asynchronously on the client. If a request fires during
    // that window, `session` is briefly absent and we'd send an unauthenticated
    // request (→ 401, empty cached result). Wait for Clerk to finish loading
    // first so the token is reliably available. (Callers are also gated on
    // isSignedIn, but this protects any request that slips through early.)
    if (clerk && clerk.loaded === false && clerk.load) {
      await clerk.load();
    }
    if (clerk?.session) {
      const token = await clerk.session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // No active session — the request goes out unauthenticated and the backend
    // responds 401 for protected routes.
  }
  return config;
});
