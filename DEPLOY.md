# DashChat — Production Deployment

Live architecture and the exact records/env used in production. This is the
single source of truth; older Render/Cloud-Run/Socket.IO notes are superseded.

## Architecture

```text
Browser
  → https://dashchat.sudipmandal.com                 (Frontend — Next.js on Vercel)
       ├─ REST  → https://dashchat-backend.sudipmandal.com/api/*   (DIRECT, CORS)
       └─ WSS   → https://socket.sudipmandal.com/dashchat          (Hermes realtime)

https://dashchat-backend.sudipmandal.com             (Backend — Express + Prisma on Fly.io)
  → Fly app `dashchat-backend`, region `sin` (Singapore), always-on (min=1)
  → Supabase Postgres (aws-1-ap-southeast-1 / Singapore; txn pooler :6543 runtime,
    session pooler :5432 for migrations)
  → AWS S3 (image uploads, ap-south-1)

https://socket.sudipmandal.com                       (Realtime — Hermes, shared service)
  → GCP VM (e2-micro, us-central1-f, IP 35.209.159.150), Docker: hermes + Traefik
  → Upstash Redis (Socket.IO adapter + backend→client event bus, Redis Streams)

Auth: Argus (central OIDC identity provider) at https://auth.sudipmandal.com
```

### Key design decisions

- **Backend has NO socket server.** Realtime was extracted to **Hermes** (a shared,
  multi-tenant Socket.IO service). The backend is now a stateless REST API, so it can
  scale to multiple instances freely. It fans realtime events out by calling Hermes's
  `POST /api/emit` (authenticated with the tenant apiKey) — see `backend/lib/hermes.ts`.
- **Backend on Fly.io (Singapore), not Render.** Render's free tier sleeps after 15 min
  → ~25s cold starts. Fly runs an always-on VM (`min_machines_running=1`) co-located
  with the Supabase DB, so first-request latency is ~150ms, not ~25s.
- **Browser calls the backend DIRECTLY** (not through the Next.js `/api/*` rewrite).
  Proxying every call through Vercel's server added 250–700ms of cross-region hop. The
  browser hits `dashchat-backend.sudipmandal.com` directly; the backend allows CORS
  from any origin. The Next rewrite remains only as a local-dev fallback.
- **Realtime auth = Argus.** Hermes verifies the same Argus access token the REST API
  uses, on the socket handshake. Rooms are keyed by the Argus subject (`token.sub` =
  local `User.authId`) — the backend/frontend translate `authId` at the Hermes seam.

## Services & URLs

| Component | Platform | URL |
| --- | --- | --- |
| Frontend | **Vercel** (project `dashchat-frontend`, Node 24) | `dashchat.sudipmandal.com` |
| Backend  | **Fly.io** (`dashchat-backend`, region `sin`, `shared-cpu-1x` 512MB) | `dashchat-backend.sudipmandal.com` (also `dashchat-backend.fly.dev`) |
| Realtime | **Hermes** (GCP VM, Docker) | `socket.sudipmandal.com` |
| Database | Supabase Postgres (ap-southeast-1) | (external) |
| Redis    | Upstash (used by Hermes only) | (external) |
| Auth     | Argus (OIDC) | `auth.sudipmandal.com` |

> A legacy Render backend (`dashchat-backend-yp01.onrender.com`, Docker/Bun) still
> exists as a fallback but is **not** in the request path — delete once Fly is proven.

## DNS records (registrar: Spaceship, zone sudipmandal.com)

| Name | Type | Value | For |
| --- | --- | --- | --- |
| `dashchat` | (Vercel) | Vercel's assigned target | Frontend |
| `dashchat-backend` | A | `66.241.124.72` | Backend (Fly IPv4) |
| `dashchat-backend` | AAAA | `2a09:8280:1::158:3c5:0` | Backend (Fly IPv6) |
| `socket` | A | `35.209.159.150` | Hermes (GCP VM) |

The custom domain must also be added inside each platform (Vercel domain, Fly
`fly certs create`) — DNS alone doesn't provision the TLS cert.

## Environment variables

**Frontend (Vercel — Production).** `NEXT_PUBLIC_*` are build-time; redeploy after changes.
- `NEXT_PUBLIC_API_ORIGIN` = `https://dashchat-backend.sudipmandal.com` (browser calls backend directly)
- `NEXT_PUBLIC_HERMES_URL` = `https://socket.sudipmandal.com`
- `NEXT_PUBLIC_ARGUS_ISSUER` = `https://auth.sudipmandal.com`
- `ARGUS_ISSUER` = `https://auth.sudipmandal.com`
- `AUTH_URL` = `https://dashchat.sudipmandal.com`, plus `AUTH_SECRET`, `DASHCHAT_CLIENT_ID`, `DASHCHAT_CLIENT_SECRET`

**Backend (Fly secrets — `fly secrets set --app dashchat-backend`).** Never commit these.
- `DATABASE_URL` (Supabase :6543, `pgbouncer=true`), `DIRECT_URL` (:5432)
- `ARGUS_ISSUER` = `https://auth.sudipmandal.com`
- `HERMES_URL` = `https://socket.sudipmandal.com`
- `HERMES_API_KEY` = the `dashchat` tenant apiKey (matches Hermes's TENANTS on the VM)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`
- `NODE_ENV`/`PORT` come from `fly.toml` (PORT=8080 = internal_port). Do NOT set PORT as a secret.

**Hermes (GCP VM `~/hermes/.env`).** `REDIS_URL` (Upstash rediss://), `ARGUS_ISSUER`/
`ARGUS_AUDIENCE` (= `https://auth.sudipmandal.com`), `TENANTS` (JSON — the `dashchat`
tenant with `authMode:"argus"`, its `apiKey`, and `allowedOrigins` including
`https://dashchat.sudipmandal.com`).

## Deploy steps

**Frontend (Vercel):** push to `master` → Vercel auto-builds `dashchat-frontend`. Or
`vercel deploy --prod`. `NEXT_PUBLIC_*` bake at build time, so set env first.

**Backend (Fly.io):**
```bash
# one-time: fly launch --no-deploy (uses fly.toml); fly certs create dashchat-backend.sudipmandal.com
fly secrets set --app dashchat-backend --stage KEY=VALUE ...   # secrets never in repo
fly deploy --app dashchat-backend                              # builds Dockerfile, migrates, starts
```
`fly.toml` (repo root) pins region `sin`, always-on, and a health check. The Dockerfile
(Bun) compiles TS and runs `backend/entrypoint.sh` (migrate deploy → `bun dist/server.js`).

**Hermes (GCP VM):** push to the Hermes repo `main` → GitHub Actions builds the image to
GHCR and SSHes into the VM to `docker compose up -d`. See the Hermes repo's
`.github/workflows/deploy.yml` and `SPEC.md`.

## Gotchas learned in production

- **Multiple stale services caused silent failures.** Three Render backends existed;
  two `env=node` ones failed to build the Bun/`??=` code and served stale pre-migration
  code, and the frontend proxied to one of them → messages saved but never delivered
  live. Fix: point `NEXT_PUBLIC_API_ORIGIN` at the one working backend; delete the rest.
  Also a duplicate Vercel project `dash-chat` (Node 18) failed every build — deleted.
- **id vs authId:** Hermes joins sockets to `user:<token.sub>` = `User.authId`, NOT the
  local `User.id`. Emitting/granting/signaling to `user:<localId>` lands in an empty
  room (messages/typing/presence/calls silently do nothing). Always target by `authId`.
- **Fly requires a credit card** even for the small always-on machine. `env pull`/`secrets`
  redact values; the CLI's `secrets list` box-table trips naive parsers — read it raw.
- **Local resolver may cache new subdomains as NXDOMAIN** briefly; verify with
  `curl --resolve <host>:443:<ip>` before assuming a domain is down.
