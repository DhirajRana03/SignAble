import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

import { NotFoundError } from '../common/exceptions/domain.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrityService } from '../signing/integrity.service';
import { StorageService } from '../storage/storage.service';

export interface VerifyResponse {
  envelopeId: string;
  envelopeTitle: string;
  status: string;
  completedAt: string | null;
  integrity: {
    hash: string | null;
    mac: string | null;
    /**
     * True only when the stored MAC is valid for the stored hash AND
     * the hash recomputes byte-equal from current DB state. Either
     * mismatch flags tampering.
     */
    verified: boolean;
    /** Human-readable reason for failure. Empty when verified=true. */
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
  /** True when uploaded PDF's embedded hash matches the stored chain. */
  matchesStoredChain: boolean;
  /** Hash extracted from PDF metadata; null if not present. */
  pdfEmbeddedHash: string | null;
  storedHash: string | null;
  reason: string;
}

/**
 * Reads the integrity chain from the envelope row, recomputes it
 * from current state, and reports verification status. Mirror of
 * SigningService.buildSignedPdf produces.
 */
@Injectable()
export class VerifyService {
  private readonly logger = new Logger(VerifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly integrity: IntegrityService,
  ) {}

  async verifyEnvelope(envelopeId: string): Promise<VerifyResponse> {
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
    });
    if (!envelope) throw new NotFoundError('Envelope', envelopeId);

    const recipients = await this.prisma.recipient.findMany({
      where: { envelopeId },
    });
    const fields = await this.prisma.signatureField.findMany({
      where: { envelopeId },
    });

    let verified = false;
    let reason = '';
    if (!envelope.integrityHash || !envelope.integrityMac) {
      reason = 'Envelope not yet completed — no chain to verify.';
    } else {
      // First, MAC must validate stored hash. Constant-time compare.
      const macValid = this.integrity.verifyMac(
        envelope.integrityHash,
        envelope.integrityMac,
      );
      if (!macValid) {
        reason = 'Stored MAC does not match stored hash. Chain tampered.';
      } else {
        // Then, hash must recompute byte-equal from current state.
        const recomputed = this.integrity.compute(
          envelope,
          recipients,
          fields,
        );
        if (recomputed.hash !== envelope.integrityHash) {
          reason =
            'Envelope state has changed since completion. Hash mismatch.';
        } else {
          verified = true;
        }
      }
    }

    return {
      envelopeId: envelope.id,
      envelopeTitle: envelope.title,
      status: envelope.status,
      completedAt: envelope.completedAt?.toISOString() ?? null,
      integrity: {
        hash: envelope.integrityHash,
        mac: envelope.integrityMac,
        verified,
        reason,
      },
      recipients: recipients
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((r) => ({
          name: r.name,
          email: r.email,
          status: r.status,
          signedAt: r.signedAt?.toISOString() ?? null,
        })),
      fieldCount: fields.length,
      hasAuditCertificate: !!envelope.auditCertKey,
    };
  }

  /**
   * Read embedded hash from uploaded PDF, compare against stored
   * chain. Allows third parties to validate a downloaded signed PDF
   * against the canonical record.
   */
  async verifyUploadedPdf(
    envelopeId: string,
    pdfBytes: Buffer,
  ): Promise<PdfVerifyResponse> {
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
      select: { id: true, integrityHash: true },
    });
    if (!envelope) throw new NotFoundError('Envelope', envelopeId);

    let embedded: string | null = null;
    try {
      const doc = await PDFDocument.load(pdfBytes);
      const keywords = doc.getKeywords() ?? '';
      // pdf-lib's setKeywords stores array as a single string joined
      // by commas. Each entry is `key:value`.
      const match = keywords
        .split(/[,;]\s*/)
        .map((s) => s.trim())
        .find((s) => s.startsWith('integrityHash:'));
      if (match) embedded = match.slice('integrityHash:'.length);
    } catch (err) {
      this.logger.warn(
        `verifyUploadedPdf: failed to read PDF for ${envelopeId}: ${(err as Error).message}`,
      );
    }

    const stored = envelope.integrityHash;
    const matches =
      !!embedded && !!stored && embedded === stored;
    const reason = !embedded
      ? 'Uploaded PDF has no embedded integrity hash.'
      : !stored
        ? 'Envelope has no stored chain (not completed).'
        : matches
          ? ''
          : 'Hash mismatch. PDF bytes differ from canonical signed copy.';

    return {
      envelopeId: envelope.id,
      matchesStoredChain: matches,
      pdfEmbeddedHash: embedded,
      storedHash: stored,
      reason,
    };
  }

  async loadAuditCertificate(envelopeId: string): Promise<{
    data: Buffer;
    filename: string;
  }> {
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
      select: { id: true, title: true, auditCertKey: true },
    });
    if (!envelope) throw new NotFoundError('Envelope', envelopeId);
    if (!envelope.auditCertKey) {
      throw new NotFoundError('Audit certificate', envelopeId);
    }
    const data = await this.storage.load(envelope.auditCertKey);
    const safe = envelope.title.replace(/[^a-z0-9._-]+/gi, '_');
    return { data, filename: `${safe}-audit-certificate.pdf` };
  }
}
