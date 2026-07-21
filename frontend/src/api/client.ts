import axios, { type AxiosInstance } from "axios";
import { getSession, signOut } from "next-auth/react";

// Shared axios instance for the whole API repository. Requests use relative
// "/api/..." URLs, which the Next.js rewrite (next.config.ts) forwards to the
// Express backend (except /api/auth/*, owned by Auth.js).
//
// The interceptor attaches the Argus access token (a JWT issued by our OIDC
// provider) as a Bearer header so the backend can verify it against Argus's
// JWKS. The token lives on the Auth.js session (stashed in the jwt/session
// callbacks in src/auth.ts); getSession() reads it client-side.
//
// Client-only: getSession() hits /api/auth/session, so any component using the
// resource clients (userApi/chatApi/messageApi) must be a "use client" component.
export const apiClient: AxiosInstance = axios.create();

apiClient.interceptors.request.use(async (config) => {
  try {
    const session = await getSession();
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
    if (status === 401 && typeof window !== "undefined" && !signingOut) {
      signingOut = true;
      await signOut({ callbackUrl: "/login" });
    }
    return Promise.reject(error);
  },
);
