import type { DefaultSession } from "next-auth";

// Augment Auth.js types so the Argus access token we stash in the jwt/session
// callbacks (src/auth.ts) is typed everywhere it's consumed.
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    user: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: number;
  }
}
