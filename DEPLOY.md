# DashChat — Production Deployment

Live architecture and the exact steps/records used to deploy.

## Architecture

```
Browser
  → https://dashchat.sudipmandal.com        (Frontend — Next.js on Render, free plan)
       ├─ REST  → https://api.dashchat.sudipmandal.com/api/*   (baked in at build)
       └─ Socket.IO → https://api.dashchat.sudipmandal.com     (direct connection)

https://api.dashchat.sudipmandal.com        (Backend — Express + Socket.IO on Cloud Run)
  → Cloud Run service dashchat-backend (region asia-northeast1 / Tokyo)
  → Supabase Postgres (transaction pooler at runtime, session pooler for migrations)
  → AWS S3 (image uploads, ap-south-1)

Auth: Argus (central OIDC identity provider, e.g. auth.sudipmandal.com)
```

## Services & URLs

| Component | Platform | URL |
| --- | --- | --- |
| Frontend | Render (web, Docker, free) | `dashchat.sudipmandal.com` → `dashchat-frontend.onrender.com` |
| Backend | Cloud Run (`asia-northeast1`, min=0/max=1) | `api.dashchat.sudipmandal.com` → `dashchat-backend-...run.app` |
| Database | Supabase Postgres | (external) |
| Auth | Argus (OIDC) | `auth.sudipmandal.com` |

### Why this split
- **Backend on Cloud Run, not Vercel/serverless generally:** Socket.IO rooms + WebRTC
  signaling are in-memory. `max-instances=1` keeps all connections on one process so
  delivery is correct. `min-instances=0` keeps it free-tier (sleeps when idle; live
  connections drop + cold-start ~2-5s on wake — acceptable for low traffic).
- **Region asia-northeast1 (Tokyo), not asia-south1 (Mumbai):** Cloud Run **domain
  mapping is not supported in asia-south1** (`501 UNIMPLEMENTED`). Tokyo supports it and
  is the closest region that does.

## DNS records (registrar: Spaceship, zone sudipmandal.com)

| Name | Type | Value | For |
| --- | --- | --- | --- |
| `dashchat` | CNAME | `dashchat-frontend.onrender.com.` | Frontend (Render) |
| `api.dashchat` | CNAME | `ghs.googlehosted.com.` | Backend (Cloud Run mapping) |

Auth is handled by **Argus** (separate deployment, e.g. `auth.sudipmandal.com`) —
no per-app auth DNS records are needed on the DashChat domain.

- The custom domain must also be **added inside the Render frontend service**
  (Settings → Custom Domains) — DNS alone yields a Cloudflare `409 / error 1001`.
- Cloud Run + Render each auto-provision their own TLS certs once DNS resolves.
  New Cloud Run mappings can sit in `CertificatePending` 15–60 min; if it backs off to
  a multi-hour retry (from an earlier stale-DNS attempt), delete + recreate the mapping
  to reset the interval.

## Environment variables

Backend (Cloud Run service env): `NODE_ENV`, `PORT` (Cloud Run injects), `DATABASE_URL`
(Supabase :6543 pooler, `pgbouncer=true`), `DIRECT_URL` (:5432), `ARGUS_ISSUER`
(the Argus origin — no secret; tokens are verified against its public JWKS), `AWS_*`.

Frontend (Render): `AUTH_SECRET` + `AUTH_URL` (Auth.js), `ARGUS_ISSUER`,
`DASHCHAT_CLIENT_ID`, `DASHCHAT_CLIENT_SECRET` (all runtime), and build-baked
`NEXT_PUBLIC_API_ORIGIN` / `NEXT_PUBLIC_SOCKET_URL` (both
`https://api.dashchat.sudipmandal.com`). `NEXT_PUBLIC_*` change requires a **rebuild**.

Migrations run on backend container start via `backend/entrypoint.sh`
(`prisma migrate deploy` over `DIRECT_URL`).

## Argus (auth) production notes
- DashChat is a **trusted OIDC client** of Argus. Register it in Argus's
  `OAUTH_CLIENTS` config with the production redirect URI
  `https://dashchat.sudipmandal.com/api/auth/callback/argus`; Argus supplies the
  `DASHCHAT_CLIENT_ID` / `DASHCHAT_CLIENT_SECRET` used above.
- **Social login (Google, etc.) is configured once, on Argus** — not per app.
  DashChat never sees provider credentials; users authenticate on Argus's hosted
  UI and DashChat only validates the resulting JWT.
- Since Argus is `skipConsent: true` for first-party apps, sign-in is a seamless
  redirect with no consent screen.

## Rebuild / redeploy commands

Backend (build + deploy to Cloud Run):
```
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_IMAGE=asia-northeast1-docker.pkg.dev/dashchat-392309/dashchat/backend:latest .
gcloud run deploy dashchat-backend \
  --image asia-northeast1-docker.pkg.dev/dashchat-392309/dashchat/backend:latest \
  --region asia-northeast1 --min-instances=0 --max-instances=1 --port=5001 \
  --timeout=3600 --allow-unauthenticated
```
(`cloudbuild.yaml` builds the lowercase `dockerfile`; `.gcloudignore` trims the upload.)

Frontend: push to `master` → Render auto-deploys. Custom domains via Render dashboard.

## Security TODO
- Rotate the AWS access key and the DashChat OAuth client secret (were shared in
  plaintext during setup). The old Clerk keys can be deleted from the Clerk
  dashboard once the cutover is confirmed.
- Optionally tighten backend CORS from `*` to the frontend origin (`backend/server.ts`).
