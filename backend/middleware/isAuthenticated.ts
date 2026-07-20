import asyncHandler from "express-async-handler";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import prisma from "../config/prisma";

// Verifies an Argus-issued OIDC access token (a JWT) instead of a Clerk session.
//
// Argus is the central identity provider (see the Argus repo). It signs access
// tokens with EdDSA and publishes its public keys at ${ARGUS_ISSUER}/api/auth/jwks.
// We verify each incoming Bearer token's signature against that JWKS — no network
// hop per request, since jose caches the key set and only refetches on rotation.
//
// On success we map the token's `sub` (the stable Argus user id) to a local
// Postgres user row, JIT-creating it on first sight so the rest of the app can
// keep referencing users by their local id.

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

interface ArgusClaims extends JWTPayload {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && value ? value : null;
}

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const token = bearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ message: "Protected Route" });
    return;
  }

  let claims: ArgusClaims;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ARGUS_BASE,
      audience: EXPECTED_AUDIENCE,
    });
    claims = payload;
  } catch {
    // Bad signature, wrong issuer/audience, or expired token.
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const argusId = claims.sub;
  if (!argusId) {
    res.status(401).json({ message: "Token missing subject" });
    return;
  }

  // Map the token → a local user, syncing profile from the token's claims.
  // Argus requires a verified email before login, so `email` is present for
  // password/social sign-ins; `picture` comes from Argus's
  // customAccessTokenClaims. We keep the local record in sync with the identity
  // provider so profile changes / the avatar propagate — but only WRITE when a
  // field actually differs, so steady-state requests do no extra DB writes.
  const email = claims.email ?? null;
  const name = claims.name || email || "User";
  const photo = claims.picture;

  let user = await prisma.user.findUnique({ where: { authId: argusId } });

  if (!user) {
    user = await prisma.user.create({
      data: { authId: argusId, name, email, ...(photo ? { photo } : {}) },
    });
  } else if (
    user.name !== name ||
    user.email !== email ||
    (photo && user.photo !== photo)
  ) {
    user = await prisma.user.update({
      where: { authId: argusId },
      data: { name, email, ...(photo ? { photo } : {}) },
    });
  }

  req.user = user;
  next();
});
