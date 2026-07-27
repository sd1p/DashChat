import asyncHandler from "express-async-handler";
import { bearerToken, verifyArgusToken } from "../lib/argus";
import { resolveUserFromClaims } from "../lib/authenticateUser";

// Express auth middleware. Verifies the incoming `Authorization: Bearer <jwt>`
// token against Argus's JWKS (see lib/argus) and attaches the resolved local
// user (see lib/authenticateUser) to req.user. Both the verification and the
// user mapping are shared with the Socket.IO handshake (middleware/socketAuth)
// so REST and realtime trust exactly the same tokens.

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const token = bearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ message: "Protected Route" });
    return;
  }

  try {
    const claims = await verifyArgusToken(token);
    req.user = await resolveUserFromClaims(claims);
  } catch {
    // Bad signature, wrong issuer/audience, expired token, or missing subject.
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  next();
});
