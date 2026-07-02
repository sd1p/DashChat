# Standalone Next.js (App Router) image for the DashChat frontend. Deployed as
# its own service; talks to the API-only backend over the network.
#
# NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time and are
# supplied as Docker build args. Render automatically translates a service's
# env vars into `--build-arg`s of the same name, so setting them in the Render
# dashboard is enough; for local/CI builds pass them explicitly with
# `docker build --build-arg NEXT_PUBLIC_...=...`. CLERK_SECRET_KEY is
# server-side and read at runtime (never a build arg — it must not be baked in).

# ---- deps ----
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- build ----
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public config baked into the client bundle. Render supplies these as build
# args of the same name (from the service's env vars); locally, pass them via
# --build-arg. The static defaults cover the Clerk routing paths so only the
# publishable key + backend URLs must be provided.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_API_ORIGIN
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL

RUN bun run build

# ---- runner ----
FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output: server.js + traced node_modules, plus static assets.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000

# CLERK_SECRET_KEY must be supplied at runtime (-e CLERK_SECRET_KEY=...).
CMD [ "bun", "server.js" ]
