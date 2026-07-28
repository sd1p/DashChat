import axios, { type AxiosInstance } from "axios";
import { getSession, signOut } from "next-auth/react";

// Shared axios instance for the whole API repository.
//
// PERF: app REST calls go DIRECTLY to the backend origin (NEXT_PUBLIC_API_ORIGIN,
// e.g. the Fly.io backend in Singapore) rather than through the Next.js rewrite
// proxy. The rewrite tunnels every /api/* request browser → Vercel's server →
// backend → back; with the backend in Singapore that detour added 250–700ms per
// call. Calling the backend host directly removes that hop (the backend allows
// CORS from any origin, so cross-origin works). Auth routes are NOT affected:
// getSession()/signOut() below use next-auth/react against the same-origin
// /api/auth/* on Vercel, not this client.
//
// If NEXT_PUBLIC_API_ORIGIN is unset we fall back to relative "/api/..." URLs,
// which still work via the rewrite (just slower) — e.g. in local dev.
//
// The interceptor attaches the Argus access token as a Bearer header so the
// backend can verify it against Argus's JWKS.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_ORIGIN || undefined,
});

// getSession() does a NETWORK fetch to /api/auth/session every call — calling it
// per request adds a round-trip to every API interaction. The Argus access token
// is stable between refreshes, so we cache the resolved session for a short TTL.
//
// TTL is 5 min — matching Argus's own session cookie cache (auth.ts cookieCache
// maxAge). Argus access tokens live 15 min and Auth.js refreshes them 60s before
// expiry, so a token served up to 5 min stale is still comfortably valid; the
// self-healing 401 retry below covers the rare rotation-boundary miss.
//
// A concurrent burst of requests shares ONE in-flight fetch via the cached
// promise. We only cache a session that actually carries a token: if the fetch
// fails OR resolves without an access token, we invalidate immediately so the
// next request retries rather than reusing a dead session for 5 minutes.
const SESSION_TTL_MS = 5 * 60_000;
let cachedSessionAt = 0;
let cachedSessionPromise: ReturnType<typeof getSession> | null = null;

function getCachedSession(): ReturnType<typeof getSession> {
  const now = Date.now();
  if (cachedSessionPromise && now - cachedSessionAt < SESSION_TTL_MS) {
    return cachedSessionPromise;
  }
  cachedSessionAt = now;
  cachedSessionPromise = getSession()
    .then((session) => {
      // A session with no access token is useless to cache — drop it so the
      // next call refetches instead of serving nothing for the whole TTL.
      if (!session?.accessToken) invalidateSessionCache();
      return session;
    })
    .catch((err) => {
      // Don't cache a failed fetch — clear so the next call retries.
      invalidateSessionCache();
      throw err;
    });
  return cachedSessionPromise;
}

/**
 * Invalidate the cached session so the next request re-fetches. Call this after
 * a token refresh / on 401 so a stale cached token isn't reused on the retry.
 */
export function invalidateSessionCache(): void {
  cachedSessionPromise = null;
  cachedSessionAt = 0;
}

apiClient.interceptors.request.use(async (config) => {
  try {
    const session = await getCachedSession();
    const token = session?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // No active session — the request goes out unauthenticated and the backend
    // responds 401 for protected routes.
  }
  return config;
});

// Guard so a burst of concurrent 401s (e.g. the whole app firing after a token
// finally expires) triggers exactly one sign-out/redirect, not a stampede.
let signingOut = false;

// On 401, the access token is invalid/expired and the silent refresh in
// auth.ts couldn't save it (refresh token also gone/revoked). The session is
// effectively dead, so end it and send the user to Argus's login to get a fresh
// one. Auth.js's jwt callback handles the *proactive* refresh; this is the
// last-resort fallback for when that fails.
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config;

    if (status === 401 && typeof window !== "undefined") {
      // A 401 may just mean our CACHED token went stale at a refresh boundary.
      // Bust the cache and retry the request ONCE with a freshly-fetched
      // session before concluding the session is truly dead. The `_retried`
      // flag prevents an infinite loop.
      if (config && !config._retried) {
        config._retried = true;
        invalidateSessionCache();
        const session = await getCachedSession().catch(() => null);
        const token = session?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return apiClient(config);
        }
      }

      // Retry didn't help (no valid token) — the session is dead. Sign out once
      // even if several requests 401 together.
      if (!signingOut) {
        signingOut = true;
        await signOut({ callbackUrl: "/login" });
      }
    }
    return Promise.reject(error);
  },
);
