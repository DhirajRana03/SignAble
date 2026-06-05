# SignAble — Railway Deployment Guide

This repo is a monorepo with **three independently deployable services**:

| Service | Path | Port | Stack |
|---------|------|------|-------|
| `processor` | `processor/` | 8001 | FastAPI + Python 3.12 |
| `backend` | `backend/` | 8000 | NestJS + Prisma + Node 20 |
| `frontend` | `frontend/` | 3000 | Next.js 14 (standalone) |

Railpack failed because it cannot guess which subdirectory to build. The fix is to create **one Railway service per directory** and point each at its own root.

---

## 1. Provision shared infrastructure

Inside your Railway project, click **+ New** and add:

1. **PostgreSQL** — gives you `DATABASE_URL`.
2. **Redis** — gives you `REDIS_URL` (BullMQ job queue).
3. *(Optional)* **Volume** — attach to the `backend` service at `/app/storage` for persistent PDF / page-image storage. Skip if you migrate to S3/R2 later.

---

## 2. Create the three services

For each service, do the following in the Railway dashboard:

**+ New → GitHub Repo → DhirajRana03/SignAble** then under **Settings → Source**:

- **Root Directory**: set to `processor`, `backend`, or `frontend` (one per service).
- **Branch**: `feat/prepare-envelope-improvements` (or whichever you deploy from).

Railway auto-detects the `railway.json` and `Dockerfile` inside each root and builds correctly. No more "Railpack could not determine how to build the app".

---

## 3. Environment variables

### `processor`
No required env vars. Railway injects `PORT` automatically; the Dockerfile binds to it.

### `backend`
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Reference: `${{Postgres.DATABASE_URL}}` |
| `REDIS_HOST` | Reference: `${{Redis.REDIS_PRIVATE_DOMAIN}}` |
| `REDIS_PORT` | `6379` |
| `REDIS_PASSWORD` | Reference: `${{Redis.REDIS_PASSWORD}}` (leave blank if Redis has none) |
| `PROCESSOR_URL` | `http://${{processor.RAILWAY_PRIVATE_DOMAIN}}:8001` |
| `JWT_SECRET` | Generate a 64-char random string |
| `JWT_EXPIRES_IN` | `30m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `STORAGE_ROOT` | `/app/storage` |
| `STORAGE_URL_BASE` | `https://${{RAILWAY_PUBLIC_DOMAIN}}/api/v1/files` |
| `FRONTEND_URL` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `ALLOWED_ORIGINS` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `QUEUES_INLINE` | `false` |
| `EMAIL_ENABLED` | `false` initially. Flip to `true` once SMTP/SendGrid/Postmark is configured. |
| `EMAIL_PROVIDER` | `console` for dev, `smtp` / `sendgrid` / `postmark` for prod |
| `EMAIL_FROM` | `noreply@yourdomain.com` |
| `MAX_UPLOAD_BYTES` | `52428800` |

Then in **Settings → Networking** click **Generate Domain** to expose the backend publicly.

### `frontend`
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1` |

`NEXT_PUBLIC_*` vars are inlined at **build time**. After setting it, redeploy with **Deployments → Redeploy** so the new value is baked in.

Then **Generate Domain** for the frontend too.

---

## 4. Storage notes

Local filesystem storage is wired by default. On Railway:

- Attach a **Volume** to the backend service, mount path `/app/storage`. This persists uploaded PDFs, rendered page images, signed PDFs, and certificates across deploys.
- Without a volume, every deploy wipes uploads. Fine for smoke-testing, **not for production**.

S3 / Cloudflare R2 migration is a follow-up: swap `StorageService`'s internal backend, no callers change.

---

## 5. Deploy order

1. Push to GitHub.
2. `processor` builds and goes live.
3. `backend` builds, runs `prisma migrate deploy` on startup, then serves on port 8000.
4. `frontend` builds with the baked-in `NEXT_PUBLIC_API_URL`, then serves Next.js standalone on port 3000.

Railway exposes each service at `https://<service>-<project>.up.railway.app` until you bind custom domains.

---

## 6. Smoke test

```bash
# Backend healthcheck
curl https://<backend-domain>/api/v1/health

# Frontend
open https://<frontend-domain>
```

Sign up, upload a PDF, send for signature, complete the flow. Done.
