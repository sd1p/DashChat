// Prisma 7 configuration. Replaces the `url` that used to live in the
// `datasource` block of backend/prisma/schema.prisma (removed in v7).
//
// This file is read by the Prisma CLI (generate, migrate, studio). The runtime
// PrismaClient gets its connection separately via the pg driver adapter in
// backend/config/prisma.js — both read the same DATABASE_URL.
//
// Our .env lives in a non-standard location (backend/config/.env), so we load
// it explicitly here instead of relying on dotenv's default cwd lookup.
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: "backend/config/.env" });

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
