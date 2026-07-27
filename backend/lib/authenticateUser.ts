import type { User } from "@prisma/client";
import prisma from "../config/prisma";
import type { ArgusClaims } from "./argus";

// Maps verified Argus token claims → a local Postgres user row, JIT-creating it
// on first sight so the rest of the app can keep referencing users by their
// local id. Shared by the REST middleware and the Socket.IO handshake so both
// resolve the same user the same way.
//
// On FIRST sight we seed the local record from the token's claims (Argus
// requires a verified email before login, so `email` is present for
// password/social sign-ins; `picture` comes from Argus's
// customAccessTokenClaims). After that we never re-sync: the local row is the
// source of truth, so profile edits made here (name/avatar via PATCH /api/user)
// stick instead of being overwritten by the token on the next request.
export async function resolveUserFromClaims(claims: ArgusClaims): Promise<User> {
  const argusId = claims.sub;
  if (!argusId) throw new Error("Token missing subject");

  const email = claims.email ?? null;
  const name = claims.name || email || "User";
  const photo = claims.picture;

  const user = await prisma.user.findUnique({ where: { authId: argusId } });
  if (user) return user;

  return prisma.user.create({
    data: { authId: argusId, name, email, ...(photo ? { photo } : {}) },
  });
}
