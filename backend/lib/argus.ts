import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// Verifies an Argus-issued OIDC access token (EdDSA JWT). This is the single
// source of truth for token verification, shared by the REST middleware
// (isAuthenticated) and the Socket.IO handshake (socketAuth) so both the API
// and the realtime channel trust exactly the same tokens.
//
// Argus is the central identity provider. It signs access tokens with EdDSA and
// publishes its public keys at ${ARGUS_ISSUER}/api/auth/jwks. We verify each
// token's signature against that JWKS — no network hop per request/handshake,
// since jose caches the key set and only refetches on rotation.

const ARGUS_ISSUER = process.env.ARGUS_ISSUER;
if (!ARGUS_ISSUER) {
  throw new Error(
    "ARGUS_ISSUER is not set — the auth server origin is required to verify tokens.",
  );
}

// Argus mounts Better Auth under /api/auth, so JWKS lives at
// ${ARGUS_ISSUER}/api/auth/jwks and the issuer claim is ${ARGUS_ISSUER}/api/auth.
const ARGUS_BASE = `${ARGUS_ISSUER.replace(/\/$/, "")}/api/auth`;
const JWKS = createRemoteJWKSet(new URL(`${ARGUS_BASE}/jwks`));

// The `aud` claim Argus stamps on tokens (its validAudiences = BETTER_AUTH_URL).
const EXPECTED_AUDIENCE = process.env.ARGUS_AUDIENCE || ARGUS_ISSUER;

export interface ArgusClaims extends JWTPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Verifies an Argus access token and returns its claims. Throws on any failure
 * (bad signature, wrong issuer/audience, expiry, or missing subject) — the
 * caller rejects the request/handshake.
 */
export async function verifyArgusToken(token: string): Promise<ArgusClaims> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: ARGUS_BASE,
    audience: EXPECTED_AUDIENCE,
  });
  if (!payload.sub) throw new Error("Token missing subject");
  return payload as ArgusClaims;
}

/** Extracts the token from an `Authorization: Bearer <token>` header value. */
export function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && value ? value : null;
}
