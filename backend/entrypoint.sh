#!/bin/sh
# Backend container entrypoint. Applies any pending Prisma migrations against
# the production DB (using DIRECT_URL via prisma.config.ts — the Supabase
# session pooler, since the transaction pooler can't run migrations), then
# starts the server. Runs on every boot; `migrate deploy` is a no-op when the
# DB is already up to date. A migration failure aborts startup (set -e) so a
# broken schema never serves traffic.
set -e

echo "Running database migrations..."
bun run prisma migrate deploy

echo "Starting server..."
exec bun dist/server.js
