/**
 * Strongly-typed job payloads shared across queue producers + consumers.
 */
import type { AuditEventType } from '@prisma/client';

export interface ProcessDocumentJob {
  documentId: string;
}

export interface FinalizeSignedPdfJob {
  envelopeId: string;
}

export interface DeliverWebhookJob {
  subscriptionId: string;
  url: string;
  secret: string;
  eventType: AuditEventType | string;
  envelopeId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface SendSigningRequestJob {
  recipientId: string;
}

export interface SendCompletionJob {
  envelopeId: string;
}
