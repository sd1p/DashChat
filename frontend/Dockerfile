# Standalone Next.js (App Router) image for the DashChat frontend. Deployed as
# its own service; talks to the API-only backend over the network.
#
# NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time and are
# supplied as Docker build args. Render automatically translates a service's
# env vars into `--build-arg`s of the same name, so setting them in the Render
# dashboard is enough; for local/CI builds pass them explicitly with
# `docker build --build-arg NEXT_PUBLIC_...=...`.
#
# Auth is Argus (OIDC) via Auth.js. `src/auth.ts` reads ARGUS_ISSUER /
# DASHCHAT_CLIENT_ID / DASHCHAT_CLIENT_SECRET at MODULE LOAD and throws if
# ARGUS_ISSUER is missing. `next build` evaluates the /api/auth/[...nextauth]
# route module during page-data collection, so ARGUS_ISSUER must be present at
# BUILD time too — not only at runtime — or the build fails with
# "ARGUS_ISSUER is required". They're passed as build args below AND set again
# at runtime in the runner stage (the client secret must be live for the OAuth
# code exchange). AUTH_SECRET/AUTH_URL are runtime-only (set on the service).

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

# Build-time config. Render supplies these as build args of the same name (from
# the service's env vars); locally, pass them via --build-arg.
#   NEXT_PUBLIC_*  → inlined into the client bundle.
#   ARGUS_ISSUER / DASHCHAT_CLIENT_* → NOT inlined, but required at build time
#   because src/auth.ts throws at module load and the auth route is evaluated
#   during `next build`. See the header comment.
ARG NEXT_PUBLIC_API_ORIGIN
ARG NEXT_PUBLIC_SOCKET_URL
ARG ARGUS_ISSUER
ARG DASHCHAT_CLIENT_ID
ARG DASHCHAT_CLIENT_SECRET
ENV NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    ARGUS_ISSUER=$ARGUS_ISSUER \
    DASHCHAT_CLIENT_ID=$DASHCHAT_CLIENT_ID \
    DASHCHAT_CLIENT_SECRET=$DASHCHAT_CLIENT_SECRET

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

# Runtime auth env (supplied by the Render service, not baked here):
#   ARGUS_ISSUER, DASHCHAT_CLIENT_ID, DASHCHAT_CLIENT_SECRET — the OAuth code
#   exchange and JWKS discovery happen at runtime; AUTH_SECRET, AUTH_URL — Auth.js
#   session encryption + the OAuth redirect base. All are set on the service.
CMD [ "bun", "server.js" ]
