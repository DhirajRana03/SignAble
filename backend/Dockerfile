# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install all deps (including dev) for the build
COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY src ./src

RUN npm run build

# Prune to production-only deps for the runtime image
RUN npm prune --omit=dev

# ---------- Runtime ----------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# OpenSSL required by Prisma engines on Alpine
RUN apk add --no-cache openssl libc6-compat

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Storage dir for local-disk backend (mount a Railway volume here in prod)
RUN mkdir -p /app/storage

EXPOSE 8000

# Apply pending migrations then start API.
# `migrate resolve --rolled-back` clears stuck failed-migration row from
# `_prisma_migrations`. No-op if migration already applied/resolved.
# Safe to keep — survives Neon pooled-connection rollback edge cases.
CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back 20260603122159_initial_schema || true; npx prisma migrate deploy && node dist/main.js"]
