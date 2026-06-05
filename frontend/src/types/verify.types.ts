/**
 * Mirror of backend VerifyService response shape. Kept here so the
 * verify page can render typed data without pulling backend types.
 */
export interface VerifyResponse {
  envelopeId: string;
  envelopeTitle: string;
  status: string;
  completedAt: string | null;
  integrity: {
    hash: string | null;
    mac: string | null;
    verified: boolean;
    reason: string;
  };
  recipients: Array<{
    name: string;
    email: string;
    status: string;
    signedAt: string | null;
  }>;
  fieldCount: number;
  hasAuditCertificate: boolean;
}

export interface PdfVerifyResponse {
  envelopeId: string;
  matchesStoredChain: boolean;
  pdfEmbeddedHash: string | null;
  storedHash: string | null;
  reason: string;
}
