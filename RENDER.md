# Deploying DashChat to Render

DashChat is two services deployed from this one repo, defined in
[`render.yaml`](./render.yaml):

| Service             | What it is                              | Dockerfile           |
| ------------------- | --------------------------------------- | -------------------- |
| `dashchat-backend`  | Express + Socket.IO + Prisma (API + WS) | `./dockerfile`       |
| `dashchat-frontend` | Next.js (standalone) app                | `./frontend/Dockerfile` |

The Postgres database is **external (Supabase)** — not managed by Render.

## Why Render (not Vercel)

The backend keeps Socket.IO rooms and WebRTC signaling **in memory**
(`socket.join(userId)`, `socket.in(...).emit(...)`). That requires a single
long-lived process. Vercel's serverless model spreads connections across
instances, which would silently break cross-user delivery unless you add a
Socket.IO Redis adapter. Render web services are long-lived, so it just works.

> ⚠️ Do not scale the backend past 1 instance unless you add
> `@socket.io/redis-adapter` — in-memory rooms don't share across instances.
> (The free plan is single-instance anyway.)

## Cost

Both services use Render's **free plan → $0/month**. The database is your own
Supabase instance (free tier), so there's no Render database cost.

Trade-off of the free plan: a service **spins down after ~15 min of inactivity**
and cold-starts (~30–60s) on the next request. For the frontend that's just a
slow first load. For the **backend it drops live Socket.IO/WebRTC connections**
when it sleeps, and loses in-memory room state on wake — fine for demo/testing,
not ideal for real users. Upgrade the backend to `starter` (~$7/mo) in
`render.yaml` to keep it always warm.

## One-time setup

### 1. Push to GitHub

Render deploys from a Git repo. Make sure this repo is on GitHub and `render.yaml`
is committed.

### 2. Create the Blueprint

Render Dashboard → **New** → **Blueprint** → pick this repo. Render reads
`render.yaml` and creates both services. It will prompt for every variable marked
`sync: false`.

### 3. Fill in environment variables

**`dashchat-backend`:**

| Variable                | Value                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`          | Supabase **transaction** pooler: `...pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL`            | Supabase **session** pooler: `...pooler.supabase.com:5432/postgres`    |
| `CLERK_PUBLISHABLE_KEY` | from Clerk dashboard                                                   |
| `CLERK_SECRET_KEY`      | from Clerk dashboard (secret)                                          |
| `CLERK_FRONTEND_URL`    | the frontend's Render URL, e.g. `https://dashchat-frontend.onrender.com` |
| `AWS_ACCESS_KEY_ID`     | S3 credentials                                                        |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials (secret)                                               |
| `AWS_REGION`            | e.g. `ap-southeast-1`                                                  |
| `AWS_BUCKET_NAME`       | your bucket                                                            |

`PORT` and `NODE_ENV` are set in the blueprint — leave them.

**`dashchat-frontend`:**

| Variable                          | Value                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_API_ORIGIN`          | the backend URL, e.g. `https://dashchat-backend.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL`          | same backend URL (Socket.IO connects directly)           |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from Clerk dashboard                                    |
| `CLERK_SECRET_KEY`                | from Clerk dashboard (secret, runtime only)              |

The `NEXT_PUBLIC_*` vars are **baked into the client bundle at build time**.
Render passes a service's env vars into `docker build` as build args of the same
name, so setting them in the dashboard is enough. **If you change a
`NEXT_PUBLIC_*` value you must trigger a rebuild** (not just a restart) for it to
take effect.

### 4. Chicken-and-egg with URLs

The frontend needs the backend URL and vice versa, but you don't know the URLs
until the services exist. Easiest path:

1. Deploy the backend first (or let both fail once). Note its
   `https://dashchat-backend.onrender.com` URL.
2. Set `NEXT_PUBLIC_API_ORIGIN` / `NEXT_PUBLIC_SOCKET_URL` on the frontend to
   that URL, and `CLERK_FRONTEND_URL` on the backend to the frontend's URL.
3. Trigger a frontend rebuild.

## Migrations

Pending migrations are applied automatically on **container start** by
[`backend/entrypoint.sh`](./backend/entrypoint.sh) (`prisma migrate deploy` then
the server). This uses `DIRECT_URL` (session mode) via
[`prisma.config.ts`](./prisma.config.ts) — the transaction pooler cannot run
migrations. (Startup-time migration is used because the free plan has no
pre-deploy command hook; on a paid plan you could move this to a
`preDeployCommand` instead.)

To run migrations manually instead, drop the `migrate deploy` line from
`entrypoint.sh` and run locally against prod:

```bash
DIRECT_URL="<session-pooler-url>" bun run prisma migrate deploy
```

## CORS / auth notes

- The backend currently allows all origins (`cors: { origin: "*" }`) for both
  REST and Socket.IO. Tighten this to the frontend origin for production if you
  want to lock it down (`backend/server.ts`).
- Auth is via Clerk Bearer tokens validated by `@clerk/express` on the backend
  and `@clerk/nextjs` middleware (`frontend/proxy.ts`) on the frontend. `/api`
  and `/socket.io` are public to the Next proxy and authenticated by the backend.

## Local development is unchanged

`bun run dev` (backend) + `cd frontend && bun run dev` still work against
`backend/config/.env` and `frontend/.env.local`.
