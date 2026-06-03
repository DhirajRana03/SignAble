/**
 * Single source of truth for queue + job names.
 * Importing services use these constants — never raw strings.
 */
export const QUEUE_NAMES = {
  DOCUMENTS: 'documents',
  SIGNING: 'signing',
  WEBHOOKS: 'webhooks',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Job-name catalogues per queue. Each queue is a discriminated union of jobs
 * with strongly-typed payloads (declared in queue.types.ts).
 */
export const JOB_NAMES = {
  PROCESS_DOCUMENT: 'process-document',
  FINALIZE_SIGNED_PDF: 'finalize-signed-pdf',
  DELIVER_WEBHOOK: 'deliver-webhook',
  SEND_SIGNING_REQUEST: 'send-signing-request',
  SEND_COMPLETION: 'send-completion',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
