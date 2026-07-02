// Prisma 7 configuration. Replaces the `url` that used to live in the
// `datasource` block of backend/prisma/schema.prisma (removed in v7).
//
// This file is read by the Prisma CLI (generate, migrate, studio). The runtime
// PrismaClient gets its connection separately via the pg driver adapter in
// backend/config/prisma.js — both read the same DATABASE_URL.
//
// Our .env lives in a non-standard location (backend/config/.env), so we load
// it explicitly here instead of relying on dotenv's default cwd lookup. In
// hosted environments (Render) there is no .env file — the vars are injected
// directly — so dotenv silently no-ops on the missing file.
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: "backend/config/.env" });

// Migrations must run over a DIRECT (session-mode) connection. Supabase's
// transaction-mode pooler (port 6543, pgbouncer=true) used by the runtime
// client does not support the prepared statements / advisory locks that
// `prisma migrate deploy` needs. Prefer DIRECT_URL; fall back to DATABASE_URL
// for local dev where the two are the same.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
