// Load env here (not just in server.ts) because this module is imported before
// server.ts calls dotenv.config(), and the pg adapter below reads DATABASE_URL
// at construction time. Loading is idempotent — dotenv won't clobber set vars.
import { config as loadEnv } from "dotenv";
loadEnv({ path: "backend/config/.env" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7: the connection URL no longer lives in schema.prisma. The CLI reads
// it from prisma.config.ts; the runtime client reaches the DB through a driver
// adapter we construct here.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Cache the client on globalThis so dev hot-reloads don't exhaust the pool with
// a new client per reload.
const globalForPrisma = globalThis as typeof globalThis & {
  __prisma?: PrismaClient;
};

const prisma = globalForPrisma.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
