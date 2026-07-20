import NextAuth from "next-auth";
import { customFetch } from "next-auth";

// Auth.js (NextAuth v5) wired to Argus, our central OIDC identity provider.
//
// The flow: DashChat redirects to Argus's hosted /login (Authorization Code +
// PKCE — Auth.js does PKCE automatically for OIDC providers), Argus authenticates
// the user and redirects back to /api/auth/callback/argus, and Auth.js exchanges
// the code for tokens. We keep the Argus ACCESS token on the session so the axios
// client can forward it as a Bearer header to the Express backend, which verifies
// it against Argus's JWKS (see backend/middleware/isAuthenticated.ts).

const ARGUS_ISSUER = process.env.ARGUS_ISSUER;
if (!ARGUS_ISSUER) {
  throw new Error("ARGUS_ISSUER is required (the Argus deployment origin).");
}

// Argus mounts Better Auth (and its OIDC discovery) under /api/auth.
const ARGUS_OIDC_BASE = `${ARGUS_ISSUER.replace(/\/$/, "")}/api/auth`;

// The resource indicator (RFC 8707) sent on authorize + token so Argus issues a
// JWT (not opaque) access token. Must be one of Argus's validAudiences — which
// is BETTER_AUTH_URL, i.e. the Argus origin. Becomes the token's `aud` claim,
// which the backend verifies against.
const ARGUS_RESOURCE = ARGUS_ISSUER.replace(/\/$/, "");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "argus",
      name: "Argus",
      type: "oidc",
      issuer: ARGUS_OIDC_BASE,
      // Explicit discovery URL — Argus serves it at the issuer-prefixed path.
      wellKnown: `${ARGUS_OIDC_BASE}/.well-known/openid-configuration`,
      clientId: process.env.DASHCHAT_CLIENT_ID,
      clientSecret: process.env.DASHCHAT_CLIENT_SECRET,
      // `resource` (RFC 8707) is REQUIRED to get a JWT access token from Argus:
      // the provider only signs a JWT when an audience is present, and the
      // audience is derived from the `resource` in the TOKEN request body.
      // Without it Argus issues an OPAQUE access token, which the backend's jose
      // jwtVerify can't parse ("Invalid Compact JWS").
      //
      // Auth.js's config `token.params` is NOT forwarded to the token POST (it
      // calls oauth4webapi without additionalParameters), so we inject `resource`
      // into the token request body via a customFetch override below. We still
      // send it on authorize for spec-completeness.
      authorization: {
        params: {
          scope: "openid profile email offline_access",
          resource: ARGUS_RESOURCE,
        },
      },
      checks: ["pkce", "state"],
      // Intercept the outbound token request and add `resource` to its body.
      [customFetch]: async (...args: Parameters<typeof fetch>) => {
        const [input, init] = args;
        const url = typeof input === "string" ? input : (input as Request).url;
        if (init?.body && url.includes("/oauth2/token")) {
          const body = new URLSearchParams(init.body as string);
          if (!body.has("resource")) body.set("resource", ARGUS_RESOURCE);
          return fetch(input, { ...init, body });
        }
        return fetch(input, init);
      },
      // Map Argus/OIDC standard claims onto the Auth.js user shape.
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.email,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // Persist the Argus tokens onto the Auth.js JWT at sign-in: the access token
    // (forwarded to the backend on API calls) and the id_token (needed as
    // `id_token_hint` for RP-initiated logout at Argus — see lib/logout.ts).
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    // Surface the access + id tokens on the client-visible session.
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.idToken = token.idToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    // Route auth failures (e.g. a stale/replayed authorization code whose Argus
    // session was already ended, or a transient callback error) back to /login
    // to cleanly restart the flow, instead of Auth.js's default 500 error page.
    error: "/login",
  },
});
