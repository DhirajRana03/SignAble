import type { RecipientStatus, SignatureField } from './envelope.types';

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
