import { handlers } from "@/auth";

// Auth.js route handlers: /api/auth/signin, /api/auth/callback/argus,
// /api/auth/session, /api/auth/signout, etc. Replaces the Clerk-hosted flow.
export const { GET, POST } = handlers;
