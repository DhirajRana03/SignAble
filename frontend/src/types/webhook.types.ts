export const WEBHOOK_EVENT_TYPES = [
  'ENVELOPE_CREATED',
  'ENVELOPE_SENT',
  'ENVELOPE_RESENT',
  'DOCUMENT_VIEWED',
  'RECIPIENT_SIGNED',
  'RECIPIENT_DECLINED',
  'ENVELOPE_COMPLETED',
  'ENVELOPE_VOIDED',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export interface WebhookSubscription {
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
  lastFiredAt: string | null;
  failureCount: number;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseBody: string | null;
  attempt: number;
  succeeded: boolean;
  createdAt: string;
}

export interface CreateWebhookInput {
  url: string;
  events?: WebhookEventType[];
}

export interface UpdateWebhookInput {
  url?: string;
  events?: WebhookEventType[];
  isActive?: boolean;
}
