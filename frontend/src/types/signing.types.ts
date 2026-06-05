import type {
  EnvelopeStatus,
  RecipientStatus,
  SignatureField,
} from './envelope.types';

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
