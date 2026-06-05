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
    root: process.env.STORAGE_ROOT ?? 'storage',
    urlBase: process.env.STORAGE_URL_BASE ?? 'http://localhost:8000/api/v1/files',
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

  /**
   * Tamper-evident signing chain.
   *
   * `signing.integritySecret` — HMAC-SHA256 key used to sign the hash
   * chain embedded in completed envelopes. Verification endpoint
   * recomputes the MAC to detect tampering with envelope state.
   *
   * Production: set 256-bit hex string via env. Rotating invalidates
   * all prior verification chains.
   */
  signing: {
    integritySecret:
      process.env.SIGNING_INTEGRITY_SECRET ??
      'dev-only-insecure-integrity-secret-rotate-in-production',
  },
});

export type AppConfig = ReturnType<typeof import('./configuration').default>;
