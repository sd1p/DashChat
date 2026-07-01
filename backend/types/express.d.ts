import type { User } from "@prisma/client";

// Augment Express's Request so `req.user` (set by isAuthenticated) is typed as
// our local Prisma User across all controllers.
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
