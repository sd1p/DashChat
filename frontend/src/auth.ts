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

// Argus's OAuth token endpoint (same one the code exchange hits). Used to trade
// a refresh token for a fresh access token when the current one is near expiry.
const ARGUS_TOKEN_ENDPOINT = `${ARGUS_OIDC_BASE}/oauth2/token`;

// Renew delay: refresh once the access token is within this many seconds of
// expiry, so requests never race a just-expired token.
const EXPIRY_SKEW_SECONDS = 60;

type RefreshedTokens = {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
};

// Exchange the stored refresh token for a new access token. Includes `resource`
// (so Argus keeps issuing a JWT, not an opaque token) and authenticates with the
// client credentials via HTTP Basic. Throws on any non-2xx so the caller can
// mark the session errored and force re-auth.
async function refreshArgusToken(refreshToken: string): Promise<RefreshedTokens> {
  const clientId = process.env.DASHCHAT_CLIENT_ID ?? "";
  const clientSecret = process.env.DASHCHAT_CLIENT_SECRET ?? "";

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    resource: ARGUS_RESOURCE,
  });

  const res = await fetch(ARGUS_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
    cache: "no-store",
  });

  const tokens = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(tokens.error || `Argus token refresh failed (${res.status})`);
  }

  return {
    accessToken: tokens.access_token,
    // Argus may rotate the refresh token; fall back to the old one if it didn't
    // return a new one.
    refreshToken: tokens.refresh_token ?? refreshToken,
    idToken: tokens.id_token,
    expiresAt: tokens.expires_in
      ? Math.floor(Date.now() / 1000) + tokens.expires_in
      : undefined,
  };
}

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
    // Persist the Argus tokens onto the Auth.js JWT at sign-in, then keep the
    // access token fresh on subsequent calls by trading the refresh token when
    // it's near expiry. The id_token is retained for RP-initiated logout at
    // Argus (`id_token_hint` — see lib/logout.ts).
    async jwt({ token, account }) {
      // 1. Initial sign-in: stash the tokens from the OAuth code exchange.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at;
        delete token.error;
        return token;
      }

      // 2. Access token still valid (with skew): use it as-is.
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && now < expiresAt - EXPIRY_SKEW_SECONDS) {
        return token;
      }

      // 3. Expired (or unknown expiry) — try a silent refresh. Without a refresh
      // token there's nothing to do; mark errored so the client re-authenticates.
      const refreshToken = token.refreshToken as string | undefined;
      if (!refreshToken) {
        token.error = "RefreshTokenError";
        return token;
      }

      try {
        const refreshed = await refreshArgusToken(refreshToken);
        token.accessToken = refreshed.accessToken;
        token.refreshToken = refreshed.refreshToken;
        if (refreshed.idToken) token.idToken = refreshed.idToken;
        token.expiresAt = refreshed.expiresAt;
        delete token.error;
      } catch (err) {
        console.error("[auth] Argus token refresh failed:", err);
        // Keep the (stale) tokens but flag the error so the UI forces a fresh
        // sign-in rather than looping on 401s.
        token.error = "RefreshTokenError";
      }
      return token;
    },
    // Surface the access + id tokens (and any refresh error) on the
    // client-visible session.
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.idToken = token.idToken as string | undefined;
      session.error = token.error as "RefreshTokenError" | undefined;
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
