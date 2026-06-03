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
    from: process.env.EMAIL_FROM ?? 'noreply@sinable.com',
  },

  maxUploadBytes: parseInt(
    process.env.MAX_UPLOAD_BYTES ?? String(50 * 1024 * 1024),
    10,
  ),
});

export type AppConfig = ReturnType<typeof import('./configuration').default>;
