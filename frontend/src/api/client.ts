import axios, { type AxiosInstance } from "axios";
import { getSession } from "next-auth/react";

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
