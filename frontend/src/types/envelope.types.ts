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
 * - TEXT:     { placeholder?: string }
 * - other types: null
 *
 * Members overlap structurally, so narrow at runtime via the helpers
 * exported below instead of in-keyword checks against the union.
 */
export type DropdownOptions = { choices: string[] };
export type CheckboxOptions = { label?: string };
export type TextOptions = { placeholder?: string };
export type FieldOptions =
  | DropdownOptions
  | CheckboxOptions
  | TextOptions
  | null;

export function isDropdownOptions(o: FieldOptions): o is DropdownOptions {
  return !!o && Array.isArray((o as DropdownOptions).choices);
}
export function isCheckboxOptions(o: FieldOptions): o is CheckboxOptions {
  return (
    !!o &&
    !Array.isArray((o as DropdownOptions).choices) &&
    'label' in o
  );
}
export function isTextOptions(o: FieldOptions): o is TextOptions {
  return !!o && 'placeholder' in o;
}

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
  /** Palette tile label (e.g. "Name", "Email"). Metadata only. */
  label: string | null;
  /** Disables signer interaction; pre-filled value preserved on submit. */
  readOnly: boolean;
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
  | 'ENVELOPE_RESENT'
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

export interface ActivityItem {
  id: string;
  envelopeId: string;
  envelopeTitle: string;
  eventType: AuditEventType;
  actorEmail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
