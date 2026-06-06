/**
 * Single source of truth for environment-derived configuration.
 * All other modules read through ConfigService, never directly from process.env.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '8000', 10),

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  databaseUrl: process.env.DATABASE_URL ?? '',

  processorUrl: process.env.PROCESSOR_URL ?? 'http://processor:8001',

  redis: {
    host: process.env.REDIS_HOST ?? 'redis',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? '',
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    // When true, queues become synchronous in-process (no Redis needed).
    // Useful for tests + dev without Redis. Production: false.
    inline: process.env.QUEUES_INLINE === 'true',
  },

  bull: {
    boardEnabled: process.env.BULL_BOARD_ENABLED === 'true',
    // Job retention to avoid Redis bloat
    completedRetention: parseInt(process.env.BULL_COMPLETED_RETAIN ?? '500', 10),
    failedRetention: parseInt(process.env.BULL_FAILED_RETAIN ?? '5000', 10),
  },

  storage: {
    // `local` writes to filesystem under `root` — used for dev + when no
    // object store configured. `r2` uses Cloudflare R2 (S3-compatible).
    backend: (process.env.STORAGE_BACKEND ?? 'local') as 'local' | 'r2',
    root: process.env.STORAGE_ROOT ?? 'storage',
    urlBase: process.env.STORAGE_URL_BASE ?? 'http://localhost:8000/api/v1/files',
    r2: {
      accountId: process.env.R2_ACCOUNT_ID ?? '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      bucket: process.env.R2_BUCKET ?? '',
    },
  },

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    provider: (process.env.EMAIL_PROVIDER ?? 'smtp') as
      | 'smtp'
      | 'sendgrid'
      | 'postmark'
      | 'console',
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
    postmarkToken: process.env.POSTMARK_SERVER_TOKEN ?? '',
    from: process.env.EMAIL_FROM ?? 'noreply@signable.com',
  },

  maxUploadBytes: parseInt(
    process.env.MAX_UPLOAD_BYTES ?? String(50 * 1024 * 1024),
    10,
  ),
});

export type AppConfig = ReturnType<typeof import('./configuration').default>;
