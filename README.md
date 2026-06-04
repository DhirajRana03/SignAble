# SignAble

[![Backend CI](https://github.com/DhirajRana03/SignAble/actions/workflows/backend.yml/badge.svg)](https://github.com/DhirajRana03/SignAble/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/DhirajRana03/SignAble/actions/workflows/frontend.yml/badge.svg)](https://github.com/DhirajRana03/SignAble/actions/workflows/frontend.yml)
[![Processor CI](https://github.com/DhirajRana03/SignAble/actions/workflows/processor.yml/badge.svg)](https://github.com/DhirajRana03/SignAble/actions/workflows/processor.yml)

DocuSign-style e-signature platform. Upload PDFs, place signature fields, route to recipients, finalize signed documents.

## Architecture

3-service monorepo + Redis-backed job queues:

- **`backend/`** — NestJS + Prisma + PostgreSQL. Auth, envelopes, recipients, fields, signing flow, storage, webhooks.
- **`processor/`** — Python FastAPI. Stateless PDF processing only (extract, render pages, apply signatures). Uses pypdf directly.
- **`frontend/`** — Next.js 14 + TypeScript + Tailwind. Coral-on-paper editorial aesthetic, matched to definable.ai.

Communication: Frontend → NestJS API → Python processor via internal HTTP.
Background work: document processing, signed PDF finalization, webhook delivery, and signing-request emails all run on **BullMQ + Redis** with exponential-backoff retries. Set `QUEUES_INLINE=true` for synchronous execution in dev/CI without Redis.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend API | NestJS 10 · Prisma 5 · PostgreSQL 16 · JWT · bcrypt · BullMQ · Redis 7 |
| Processor | FastAPI · pypdf · pdf2image · reportlab · doc_loader |
| Frontend | Next.js 14 · TanStack Query · Zustand · Tailwind · shadcn-style primitives |
| Container | Docker Compose (4 services) |

## Quick Start

### Docker (recommended)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
docker-compose up --build
```

Frontend: http://localhost:3000
API docs: http://localhost:8000/api/v1
Processor: http://localhost:8001/health

### Native (without Docker)

Requires PostgreSQL 16, Python 3.12, Node 20, poppler-utils.

```bash
# 1. Database
createuser signable -P             # password: secret
createdb signable -O signable

# 2. Backend
cd backend
cp .env.example .env               # edit DATABASE_URL host to localhost
npm install
npx prisma migrate dev
npm run start:dev                  # :8000

# 3. Processor (separate terminal)
cd processor
uv sync
uv run uvicorn src.main:app --port 8001

# 4. Frontend (separate terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                        # :3000
```

## Project Structure

```
signable/
├── backend/        NestJS API — auth, envelopes, signing
├── processor/      Python — PDF processing
├── frontend/       Next.js — UI
├── docker-compose.yml
└── README.md
```

## Engineering Principles

- **Controllers** parse DTO → call service → return. Zero business logic.
- **Services** own all business logic + Prisma queries + state transitions.
- **Domain exceptions** carry no HTTP codes. Mapped only in `DomainExceptionFilter`.
- **ProcessorService** is sole HTTP path to Python processor.
- **StorageService** is sole filesystem I/O — swap to S3 by replacing backend class.
- **Frontend components** split into Layout / UI Atom / Feature / Page. Services hold all API calls; hooks bridge them to components.

## API Surface

Base: `/api/v1`

```
POST   /auth/register | /auth/login | /auth/refresh
GET    /auth/me

POST   /documents (multipart)
GET    /documents | /documents/:id | /documents/:id/pages
DELETE /documents/:id

POST   /envelopes
GET    /envelopes | /envelopes/:id
POST   /envelopes/:id/send | /envelopes/:id/void
GET    /envelopes/:id/audit | /envelopes/:id/download

POST   /envelopes/:id/recipients
PUT    /envelopes/:id/recipients/:rid
DELETE /envelopes/:id/recipients/:rid

POST   /envelopes/:id/fields
PUT    /envelopes/:id/fields/bulk | /envelopes/:id/fields/:fid
DELETE /envelopes/:id/fields/:fid

# Public (token-auth)
GET    /sign/:token
POST   /sign/:token/viewed | /sign/:token/submit | /sign/:token/decline

GET    /files/*    (JWT-protected)
```

## State Machine

Envelope: `DRAFT → SENT → IN_PROGRESS → COMPLETED` (or `VOIDED` from any non-terminal).
Recipient: `PENDING → VIEWED → SIGNED` (or `DECLINED`).

## Roadmap

- [ ] Bull queue (replace `setImmediate`)
- [ ] S3 storage backend
- [ ] Rate limiting + helmet
- [ ] DOCX/PPTX/XLSX/image support (processor abstraction ready)
- [ ] Email provider integration (SendGrid/Postmark)
- [ ] Backend Jest tests

## License

MIT
