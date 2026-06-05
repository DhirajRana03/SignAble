import type {
  EnvelopeStatus,
  RecipientStatus,
  SignatureField,
} from './envelope.types';

/**
 * Adopted signature style returned to the signing UI. Populated once
 * the recipient confirms the "Adopt Your Signature" modal. Null until
 * adoption happens; after that, every SIGNATURE/INITIALS click reuses
 * these images instead of re-prompting.
 */
export interface AdoptedSignature {
  signature: string | null;
  initials: string | null;
  fullName: string | null;
  initialsText: string | null;
  adoptedAt: string;
}

export interface SigningView {
  envelopeId: string;
  envelopeTitle: string;
  envelopeMessage: string | null;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientStatus: RecipientStatus;
  fields: SignatureField[];
  pageUrls: string[];
  pageCount: number;
  adopted: AdoptedSignature | null;
}

/**
 * Payload posted to /sign/:token/adopt. Base64 data URLs for both
 * images; full name + initials text drive the audit trail and the
 * preview card in the modal.
 */
export interface AdoptSignaturePayload {
  signature: string;
  initials: string;
  fullName: string;
  initialsText: string;
}

/**
 * Public completion view. Returned by GET /sign/:token/completion.
 * Drives the standalone post-sign page recipients land on from the
 * completion email. No JWT — token gates access.
 */
export interface SigningCompletionView {
  envelopeId: string;
  envelopeTitle: string;
  envelopeStatus: EnvelopeStatus;
  completedAt: string | null;
  recipientName: string;
  recipientStatus: RecipientStatus;
  /**
   * Token-scoped public URL for the signed PDF. Null until envelope
   * fully completed.
   */
  signedPdfUrl: string | null;
}
