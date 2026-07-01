import asyncHandler from "express-async-handler";
import type { Prisma } from "@prisma/client";
import prisma from "../config/prisma";

// Search users by name/email, excluding the current user. Auth is enforced by
// the isAuthenticated middleware, which populates req.user from Clerk.
export const findChats = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: "Protected Route" });
    return;
  }
  const keyword =
    typeof req.query.search === "string" ? req.query.search : undefined;

  const where: Prisma.UserWhereInput = {
    id: { not: req.user.id },
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { email: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({ where });
  res.send(users);
});

// Returns the local user record for the authenticated Clerk session. If we
// reach here, isAuthenticated has already verified the session and synced the
// user, so req.user is present.
export const authUser = asyncHandler(async (req, res) => {
  res.status(200).json({ auth: true, user: req.user });
});
