export type SigningOrder = 'SEQUENTIAL' | 'PARALLEL';
export type EnvelopeStatus =
  | 'DRAFT'
  | 'SENT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'VOIDED'
  | 'EXPIRED';
export type RecipientStatus = 'PENDING' | 'VIEWED' | 'SIGNED' | 'DECLINED';
export type RecipientRole = 'SIGNER' | 'CC' | 'VIEWER';
export type FieldType =
  | 'SIGNATURE'
  | 'INITIALS'
  | 'DATE'
  | 'TEXT'
  | 'DROPDOWN'
  | 'CHECKBOX';

/**
 * Type-specific configuration persisted alongside a field.
 * - DROPDOWN: { choices: non-empty string[] }
 * - CHECKBOX: { label?: string }
 * - other types: null
 */
export type FieldOptions =
  | { choices: string[] }
  | { label?: string }
  | null;

export interface Recipient {
  id: string;
  envelopeId: string;
  email: string;
  name: string;
  orderIndex: number;
  role: RecipientRole;
  status: RecipientStatus;
  signingToken?: string;
  signedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  ipAddress: string | null;
}

export interface SignatureField {
  id: string;
  envelopeId: string;
  recipientId: string;
  pageNumber: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  fieldType: FieldType;
  required: boolean;
  value: string | null;
  options: FieldOptions;
  signedAt: string | null;
}

export interface PageMeta {
  pageNumber: number;
  width: number;
  height: number;
  imageUrl: string;
}

export interface Envelope {
  id: string;
  userId: string;
  documentId: string;
  title: string;
  message: string | null;
  status: EnvelopeStatus;
  signingOrder: SigningOrder;
  signedStorageKey: string | null;
  createdAt: string;
  sentAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  recipients?: Recipient[];
  fields?: SignatureField[];
}

export type AuditEventType =
  | 'ENVELOPE_CREATED'
  | 'ENVELOPE_SENT'
  | 'DOCUMENT_VIEWED'
  | 'RECIPIENT_SIGNED'
  | 'RECIPIENT_DECLINED'
  | 'ENVELOPE_COMPLETED'
  | 'ENVELOPE_VOIDED';

export interface AuditEvent {
  id: string;
  envelopeId: string;
  eventType: AuditEventType;
  actorEmail: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}
