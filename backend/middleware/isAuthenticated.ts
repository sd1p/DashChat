import asyncHandler from "express-async-handler";
import { getAuth, clerkClient } from "@clerk/express";
import prisma from "../config/prisma";

// Verifies the Clerk session (clerkMiddleware must run earlier in server.ts),
// then maps the Clerk user to a local Postgres user row. We JIT-create the
// row on first request so the rest of the app can reference users by their
// local id.
export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ message: "Protected Route" });
    return;
  }

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });

  if (!user) {
    // First time we've seen this Clerk user — pull their profile and create
    // the local record.
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      email ||
      "User";

    user = await prisma.user.create({
      data: {
        clerkId: userId,
        name,
        email,
        ...(clerkUser.imageUrl ? { photo: clerkUser.imageUrl } : {}),
      },
    });
  }

  req.user = user;
  next();
});
