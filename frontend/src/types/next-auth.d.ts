import type { DefaultSession } from "next-auth";

// Augment Auth.js types so the Argus access token we stash in the jwt/session
// callbacks (src/auth.ts) is typed everywhere it's consumed.
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    // Set when a silent token refresh failed (e.g. the refresh token is
    // expired/revoked). The client uses it to force a fresh sign-in.
    error?: "RefreshTokenError";
    user: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    // Access-token expiry, in SECONDS since epoch (matches OAuth `expires_at`).
    expiresAt?: number;
    // Sentinel set by the jwt callback when a refresh attempt failed.
    error?: "RefreshTokenError";
  }
}
