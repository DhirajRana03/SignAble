import { createHash } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import {
  AuditEventType,
  Envelope,
  EnvelopeStatus,
  Prisma,
  Recipient,
  RecipientStatus,
  SigningOrder,
} from '@prisma/client';

import {
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '../common/exceptions/domain.exceptions';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CertificateData,
  ProcessorService,
  RecipientCertEntry,
  SignedFieldData,
} from '../processor/processor.service';
import { JOB_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import { QueueService } from '../queues/queue.service';
import type {
  FinalizeSignedPdfJob,
  SendSigningRequestJob,
} from '../queues/queue.types';
import { StorageService } from '../storage/storage.service';
import { WebhooksService } from '../webhooks/webhooks.service';

/**
 * Signed-PDF renderer version. Bump whenever the certificate layout,
 * signature stamping, or any other visual output of the build pipeline
 * changes. Download self-heals envelopes whose stored signedPdfVersion
 * (or null) is below this value.
 *
 *   v1 — original single-page audit (legacy / pre-versioning)
 *   v2 — first DocuSign-style certificate + double-bracket signature
 *   v3 — left-only bracket signature stamp
 *   v4 — certificate page removed; larger Signed by / hash typography
 *   v5 — certificate restored; bigger signature typography retained
 *   v6 — rounded bracket corners + rigid 3-row layout + overlap dedupe
 *   v7 — aggressive overlap dedupe (>5% area) + bigger default sigs
 *   v8 — document + certificate persisted separately; combined merged
 *        on demand at download time
 *   v9 — fixed triplicate hash overprint; signature image enlarged to
 *        ~60% of field height; bigger label/hash type
 *   v10 — even larger signature/initials label + hash font caps
 *   v11 — SignAble brand banner on certificate; trust-proxy IP capture
 *         drives the real client IP onto every audit row
 *   v12 — signature image row enlarged to ~70% of field height; tighter
 *         label/hash rows. Note: existing adopted signatures already
 *         stored on Recipient row render larger because the new front-end
 *         canvas crop reduces dead space too.
 *   v13 — label/hash caps cut so signature image dominates visually.
 *         Image row 76%, label cap 11pt, hash cap 9pt. Fixes the
 *         "Signed by" outshouting the actual signature.
 *   v14 — aspect lock dropped on signature/initials image so glyph
 *         fills field box vertically. Frontend canvas already crops
 *         tight, so vertical stretch stays minimal while visible
 *         signature size jumps ~2×.
 *   v15 — aspect lock restored; v14 fattened glyphs into a pseudo-bold
 *         appearance. Frontend canvas font reduced 160→96 so the
 *         proportional fit reads at a sensible size without bleed.
 */
export const SIGNED_PDF_RENDERER_VERSION = 15;

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly processor: ProcessorService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
    private readonly queue: QueueService,
  ) {}

  async getForSigner(token: string) {
    const recipient = await this.getByToken(token);
    this.assertSignable(recipient);

    const envelope = await this.prisma.envelope.findUnique({
      where: { id: recipient.envelopeId },
    });
    if (!envelope) throw new NotFoundError('Envelope', recipient.envelopeId);

    if (
      envelope.status === EnvelopeStatus.VOIDED ||
      envelope.status === EnvelopeStatus.EXPIRED
    ) {
      throw new InvalidStateTransitionError(envelope.status, 'sign');
    }

    // Sequential signing: ensure earlier recipients have signed
    if (envelope.signingOrder === SigningOrder.SEQUENTIAL) {
      const earlier = await this.prisma.recipient.findFirst({
        where: {
          envelopeId: envelope.id,
          orderIndex: { lt: recipient.orderIndex },
          status: { notIn: [RecipientStatus.SIGNED, RecipientStatus.DECLINED] },
        },
      });
      if (earlier) {
        throw new InvalidStateTransitionError(
          'awaiting_previous_signer',
          'sign',
        );
      }
    }

    const doc = await this.prisma.document.findUnique({
      where: { id: envelope.documentId },
    });
    if (!doc) throw new NotFoundError('Document', envelope.documentId);

    const fields = await this.prisma.signatureField.findMany({
      where: { recipientId: recipient.id },
      orderBy: [{ pageNumber: 'asc' }, { yPct: 'asc' }],
    });

    return {
      envelopeId: envelope.id,
      envelopeTitle: envelope.title,
      envelopeMessage: envelope.message,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      recipientStatus: recipient.status,
      fields,
      pageUrls: this.publicPageUrls(token, doc.id, doc.pageCount),
      pageCount: doc.pageCount,
      // Adopted style — included so the client can skip the modal on
      // return visits and start applying signatures immediately.
      adopted: recipient.adoptedAt
        ? {
            signature: recipient.adoptedSignature,
            initials: recipient.adoptedInitials,
            fullName: recipient.adoptedFullName,
            initialsText: recipient.adoptedInitialsText,
            adoptedAt: recipient.adoptedAt,
          }
        : null,
    };
  }

  /**
   * Capture the signer's "Adopt Your Signature" choice. Idempotent —
   * subsequent calls overwrite the previous style (so the user can
   * re-adopt if they choose Change Style). Logs the first adoption to
   * the audit trail.
   */
  async adoptSignature(
    token: string,
    payload: {
      signature: string;
      initials: string;
      fullName: string;
      initialsText: string;
    },
    ip: string | null,
  ): Promise<{
    signature: string;
    initials: string;
    fullName: string;
    initialsText: string;
    adoptedAt: Date;
  }> {
    const recipient = await this.getByToken(token);
    this.assertSignable(recipient);

    const wasFirstAdoption = !recipient.adoptedAt;
    const now = new Date();

    const updated = await this.prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        adoptedSignature: payload.signature,
        adoptedInitials: payload.initials,
        adoptedFullName: payload.fullName,
        adoptedInitialsText: payload.initialsText,
        adoptedAt: recipient.adoptedAt ?? now,
      },
    });

    if (wasFirstAdoption) {
      await this.log(
        recipient.envelopeId,
        AuditEventType.DOCUMENT_VIEWED,
        recipient.email,
        { event: 'signature_adopted' },
        ip,
      );
    }

    return {
      signature: updated.adoptedSignature!,
      initials: updated.adoptedInitials!,
      fullName: updated.adoptedFullName!,
      initialsText: updated.adoptedInitialsText!,
      adoptedAt: updated.adoptedAt!,
    };
  }

  async markViewed(token: string, ip: string | null): Promise<void> {
    const recipient = await this.getByToken(token);
    if (recipient.status === RecipientStatus.PENDING) {
      await this.prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: RecipientStatus.VIEWED },
      });
    }
    await this.log(
      recipient.envelopeId,
      AuditEventType.DOCUMENT_VIEWED,
      recipient.email,
      {},
      ip,
    );
  }

  /**
   * Persist mid-session draft values without finalizing. Idempotent —
   * callable repeatedly as signer types/clicks. Skips required-field
   * validation and audit/webhook fan-out (would flood the log).
   * Rejects if recipient already SIGNED or DECLINED to prevent tampering
   * after submission.
   */
  async saveProgress(
    token: string,
    fieldValues: Record<string, string>,
  ): Promise<{ savedCount: number }> {
    const recipient = await this.getByToken(token);
    this.assertSignable(recipient);

    const fields = await this.prisma.signatureField.findMany({
      where: { recipientId: recipient.id },
      select: { id: true },
    });
    const validIds = new Set(fields.map((f) => f.id));
    const entries = Object.entries(fieldValues).filter(([id]) =>
      validIds.has(id),
    );

    // Draft saves do NOT set signedAt (reserved for final submission).
    await Promise.all(
      entries.map(([id, value]) =>
        this.prisma.signatureField.update({
          where: { id },
          data: { value },
        }),
      ),
    );

    return { savedCount: entries.length };
  }

  async submit(
    token: string,
    fieldValues: Record<string, string>,
    ip: string | null,
  ): Promise<void> {
    const recipient = await this.getByToken(token);
    this.assertSignable(recipient);

    await this.validateRequiredFilled(recipient.id, fieldValues);
    await this.saveFieldValues(recipient.id, fieldValues);

    await this.prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        status: RecipientStatus.SIGNED,
        signedAt: new Date(),
        ipAddress: ip,
      },
    });

    await this.log(
      recipient.envelopeId,
      AuditEventType.RECIPIENT_SIGNED,
      recipient.email,
      {},
      ip,
    );

    await this.advance(recipient.envelopeId);
  }

  async decline(
    token: string,
    reason: string,
    ip: string | null,
  ): Promise<void> {
    const recipient = await this.getByToken(token);
    this.assertSignable(recipient);

    await this.prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        status: RecipientStatus.DECLINED,
        declinedAt: new Date(),
        declineReason: reason,
        ipAddress: ip,
      },
    });

    await this.log(
      recipient.envelopeId,
      AuditEventType.RECIPIENT_DECLINED,
      recipient.email,
      { reason },
      ip,
    );
  }

  /**
   * After a signing, decide what happens next:
   * - Sequential: notify next pending signer, or finalize if none remain
   * - Parallel: finalize when all signed
   */
  private async advance(envelopeId: string): Promise<void> {
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
    });
    if (!envelope) return;

    if (envelope.signingOrder === SigningOrder.SEQUENTIAL) {
      const next = await this.prisma.recipient.findFirst({
        where: { envelopeId, status: RecipientStatus.PENDING },
        orderBy: { orderIndex: 'asc' },
      });
      if (next) {
        if (envelope.status === EnvelopeStatus.SENT) {
          await this.prisma.envelope.update({
            where: { id: envelopeId },
            data: { status: EnvelopeStatus.IN_PROGRESS },
          });
        }
        await this.queue.enqueue<SendSigningRequestJob>(
          QUEUE_NAMES.NOTIFICATIONS,
          JOB_NAMES.SEND_SIGNING_REQUEST,
          { recipientId: next.id },
        );
      } else {
        await this.finalize(envelope);
      }
    } else {
      const pending = await this.prisma.recipient.count({
        where: { envelopeId, status: RecipientStatus.PENDING },
      });
      if (pending === 0) {
        await this.finalize(envelope);
      } else if (envelope.status === EnvelopeStatus.SENT) {
        await this.prisma.envelope.update({
          where: { id: envelopeId },
          data: { status: EnvelopeStatus.IN_PROGRESS },
        });
      }
    }
  }

  private async finalize(envelope: Envelope): Promise<void> {
    await this.prisma.envelope.update({
      where: { id: envelope.id },
      data: { status: EnvelopeStatus.COMPLETED, completedAt: new Date() },
    });
    await this.log(
      envelope.id,
      AuditEventType.ENVELOPE_COMPLETED,
      'system',
    );
    // Fire completion emails immediately on status transition. Email
    // delivery must not depend on signed-PDF rendering — if the
    // processor is down, recipients still need to know the envelope
    // completed. PDF can be rebuilt later (download path self-heals).
    await this.sendCompletionEmails(envelope);
    await this.queue.enqueue<FinalizeSignedPdfJob>(
      QUEUE_NAMES.SIGNING,
      JOB_NAMES.FINALIZE_SIGNED_PDF,
      { envelopeId: envelope.id },
    );
  }

  /**
   * Dispatch completion emails to every recipient + the envelope
   * owner. Idempotent at the driver level (NotificationsService
   * swallows errors). Safe to call multiple times — caller decides
   * whether duplicate sends are acceptable.
   */
  private async sendCompletionEmails(envelope: Envelope): Promise<void> {
    try {
      const recipients = await this.prisma.recipient.findMany({
        where: { envelopeId: envelope.id },
      });
      const sender = await this.prisma.user.findUnique({
        where: { id: envelope.userId },
      });
      for (const r of recipients) {
        await this.notifications.sendCompletion({
          to: r.email,
          name: r.name,
          envelopeTitle: envelope.title,
          envelopeId: envelope.id,
          signingToken: r.signingToken,
        });
      }
      if (sender) {
        await this.notifications.sendCompletion({
          to: sender.email,
          name: sender.name,
          envelopeTitle: envelope.title,
          envelopeId: envelope.id,
        });
      }
    } catch (err) {
      // Never let email failures block status finalization.
      this.logger.error(
        `sendCompletionEmails failed for ${envelope.id}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Worker entrypoint. Builds the final signed PDF + posts completion emails.
   * Made public so SigningWorker can invoke it; not for direct controller use.
   */
  async runFinalizeSignedPdf(envelopeId: string): Promise<void> {
    return this.buildSignedPdf(envelopeId);
  }

  /**
   * Worker entrypoint. Sends signing request to a recipient.
   */
  async runSendSigningRequest(recipientId: string): Promise<void> {
    return this.sendSigningEmail(recipientId);
  }

  private async buildSignedPdf(envelopeId: string): Promise<void> {
    try {
      const envelope = await this.prisma.envelope.findUnique({
        where: { id: envelopeId },
      });
      if (!envelope) return;

      const doc = await this.prisma.document.findUnique({
        where: { id: envelope.documentId },
      });
      if (!doc) return;

      const signedFields = await this.prisma.signatureField.findMany({
        where: { envelopeId, NOT: { value: null } },
        include: { recipient: true },
      });

      const pdfBuffer = await this.storage.load(doc.storageKey);
      const processResult = await this.processor.processDocument(pdfBuffer);

      // Build DocuSign-style decoration metadata for every signature
      // and initials field. Hash id is a deterministic, short
      // fingerprint of the recipient identity — purely visual; mirrors
      // the truncated hash shown in the reference design.
      const payload: SignedFieldData[] = signedFields.map((f) => {
        const isSig = f.fieldType === 'SIGNATURE';
        const isInit = f.fieldType === 'INITIALS';
        const decoration: Partial<SignedFieldData> =
          isSig || isInit
            ? {
                label: isSig ? 'Signed by:' : 'Initial',
                signer_name: f.recipient?.adoptedFullName ?? f.recipient?.name,
                hash_id: isSig ? this.recipientHash(f.recipient) : undefined,
              }
            : {};
        return {
          field_type: f.fieldType.toLowerCase(),
          page_number: f.pageNumber,
          x_pct: f.xPct,
          y_pct: f.yPct,
          width_pct: f.widthPct,
          height_pct: f.heightPct,
          value: f.value ?? '',
          ...decoration,
        };
      });

      const certificate = await this.buildCertificateData(
        envelopeId,
        envelope,
        signedFields,
        processResult.page_count ?? 0,
      );

      // Document and certificate persist as separate files so the
      // download surface can offer each independently (matches
      // DocuSign behaviour). Combined download is reconstructed
      // on demand by merging both.
      const signedPdf = await this.processor.applySignatures(
        pdfBuffer,
        payload,
        processResult.page_dimensions,
        undefined,
        false,
      );
      const certificatePdf = await this.processor.buildCertificate(
        certificate,
        payload,
      );

      const signedKey = await this.storage.saveSigned(envelopeId, signedPdf);
      const certificateKey = await this.storage.saveCertificate(
        envelopeId,
        certificatePdf,
      );
      await this.prisma.envelope.update({
        where: { id: envelopeId },
        data: {
          signedStorageKey: signedKey,
          certificateStorageKey: certificateKey,
          signedPdfVersion: SIGNED_PDF_RENDERER_VERSION,
        },
      });
      // Completion emails are dispatched separately from finalize().
      // PDF builder is now pure rendering — decoupling emails ensures
      // a processor outage doesn't suppress completion notifications.
    } catch (err) {
      this.logger.error(
        `buildSignedPdf failed for ${envelopeId}: ${(err as Error).message}`,
      );
      // Rethrow so BullMQ marks the job failed + applies retry policy.
      throw err;
    }
  }

  private async sendSigningEmail(recipientId: string): Promise<void> {
    const recipient = await this.prisma.recipient.findUnique({
      where: { id: recipientId },
    });
    if (!recipient) return;
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: recipient.envelopeId },
    });
    if (!envelope) return;

    await this.notifications.sendSigningRequest({
      to: recipient.email,
      name: recipient.name,
      envelopeTitle: envelope.title,
      signingToken: recipient.signingToken,
      message: envelope.message,
    });
  }

  private async validateRequiredFilled(
    recipientId: string,
    values: Record<string, string>,
  ): Promise<void> {
    const required = await this.prisma.signatureField.findMany({
      where: { recipientId, required: true },
    });
    const missing = required
      .filter((f) => !values[f.id] || values[f.id].trim() === '')
      .map((f) => f.id);
    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required field values: ${missing.join(', ')}`,
      );
    }
  }

  private async saveFieldValues(
    recipientId: string,
    values: Record<string, string>,
  ): Promise<void> {
    const now = new Date();
    const fields = await this.prisma.signatureField.findMany({
      where: { recipientId },
    });
    const validIds = new Set(fields.map((f) => f.id));

    await Promise.all(
      Object.entries(values)
        .filter(([id]) => validIds.has(id))
        .map(([id, value]) =>
          this.prisma.signatureField.update({
            where: { id },
            data: { value, signedAt: now },
          }),
        ),
    );
  }

  private assertSignable(recipient: Recipient): void {
    if (
      recipient.status === RecipientStatus.SIGNED ||
      recipient.status === RecipientStatus.DECLINED
    ) {
      throw new InvalidStateTransitionError(recipient.status, 'sign');
    }
  }

  /**
   * Short deterministic hash for the recipient. Drives the DocuSign-
   * style ID line shown beneath each stamped signature
   * (e.g. "17941BF901958D07…"). Truncated to the first 16 hex chars
   * so the renderer can fit it in the bracket footer.
   */
  private recipientHash(recipient: Recipient | null | undefined): string {
    if (!recipient) return '';
    const seed = `${recipient.id}:${recipient.signingToken}`;
    return createHash('sha1').update(seed).digest('hex').toUpperCase();
  }

  /**
   * Format a DocuSign-style envelope id from a UUID. DocuSign prints
   * the id in uppercase, hyphen-grouped form. Our UUIDs already match
   * that grouping; we only need uppercase.
   */
  private formatEnvelopeId(uuid: string): string {
    return uuid.toUpperCase();
  }

  /**
   * Assemble the Certificate of Completion payload from the envelope,
   * its recipients, and the audit trail. Pulled out of buildSignedPdf
   * so the data-shaping logic stays auditable in isolation.
   *
   * Timestamps + IPs are sourced from AuditEvent rows. Missing rows
   * degrade gracefully: the certificate renders blank cells rather
   * than failing the entire signed-PDF pipeline.
   */
  private async buildCertificateData(
    envelopeId: string,
    envelope: Envelope,
    signedFields: Array<{ fieldType: string; recipient: Recipient | null }>,
    documentPages: number,
  ): Promise<CertificateData> {
    const sender = await this.prisma.user.findUnique({
      where: { id: envelope.userId },
    });
    const recipients = await this.prisma.recipient.findMany({
      where: { envelopeId },
      orderBy: { orderIndex: 'asc' },
    });
    const auditEvents = await this.prisma.auditEvent.findMany({
      where: { envelopeId },
      orderBy: { createdAt: 'asc' },
    });

    const fmt = (d: Date | null | undefined) =>
      d ? d.toISOString().replace('T', ' ').replace(/\..*$/, ' UTC') : null;

    const findEvent = (
      type: AuditEventType,
      actor?: string,
    ): (typeof auditEvents)[number] | undefined =>
      auditEvents.find(
        (e) =>
          e.eventType === type &&
          (actor === undefined || e.actorEmail === actor),
      );

    const sentEvent = findEvent(AuditEventType.ENVELOPE_SENT);

    const recipientEntries: RecipientCertEntry[] = recipients.map((r) => {
      const viewedEvent = findEvent(AuditEventType.DOCUMENT_VIEWED, r.email);
      const signedEvent = findEvent(AuditEventType.RECIPIENT_SIGNED, r.email);
      const ipFromAudit =
        ((signedEvent?.metadata as { ip?: string } | null)?.ip ??
          (viewedEvent?.metadata as { ip?: string } | null)?.ip ??
          signedEvent?.ipAddress ??
          viewedEvent?.ipAddress) ||
        r.ipAddress ||
        '';
      return {
        name: r.adoptedFullName ?? r.name,
        email: r.email,
        signing_id: this.recipientHash(r),
        security_level: 'Email, Account Authentication (None)',
        sent_at: fmt(sentEvent?.createdAt ?? envelope.sentAt),
        viewed_at: fmt(viewedEvent?.createdAt),
        signed_at: fmt(signedEvent?.createdAt ?? r.signedAt),
        ip_address: ipFromAudit,
        signature_image: r.adoptedSignature,
        adoption_method: r.adoptedSignature
          ? 'Pre-selected Style'
          : 'Not adopted',
        disclosure_accepted_at: fmt(viewedEvent?.createdAt),
      };
    });

    const signatures = signedFields.filter(
      (f) => f.fieldType === 'SIGNATURE',
    ).length;
    const initials = signedFields.filter(
      (f) => f.fieldType === 'INITIALS',
    ).length;

    return {
      envelope_id: this.formatEnvelopeId(envelope.id),
      subject: `Complete with SignAble: ${envelope.title}`,
      status: envelope.status,
      document_pages: documentPages,
      certificate_pages: 0,
      signatures_count: signatures,
      initials_count: initials,
      autonav: 'Enabled',
      envelope_id_stamping: 'Enabled',
      time_zone: '(UTC) Coordinated Universal Time',
      envelope_originator_name: sender?.name ?? '',
      envelope_originator_email: sender?.email ?? '',
      envelope_originator_ip:
        (sentEvent?.ipAddress ??
          (sentEvent?.metadata as { ip?: string } | null)?.ip) ||
        '',
      record_holder_name: sender?.name ?? '',
      record_holder_email: sender?.email ?? '',
      record_status_timestamp: fmt(envelope.createdAt),
      location: 'SignAble',
      recipients: recipientEntries,
      envelope_sent_at: fmt(sentEvent?.createdAt ?? envelope.sentAt),
      envelope_completed_at: fmt(envelope.completedAt),
    };
  }

  private async getByToken(token: string): Promise<Recipient> {
    const recipient = await this.prisma.recipient.findUnique({
      where: { signingToken: token },
    });
    if (!recipient) {
      throw new NotFoundError('Signing session', token);
    }
    return recipient;
  }

  /**
   * Token-scoped file loader for public signing page. Validates token,
   * confirms file belongs to envelope document. Allows page PNGs +
   * signed PDF for this envelope only — blocks path traversal +
   * unrelated documents.
   *
   * Returns raw bytes for controller to stream.
   */
  async loadFileForToken(
    token: string,
    filePath: string,
  ): Promise<{ data: Buffer; contentType: string }> {
    const recipient = await this.getByToken(token);
    // Token holders can view document even after they've signed.
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: recipient.envelopeId },
      select: {
        id: true,
        documentId: true,
        status: true,
        signedPdfVersion: true,
      },
    });
    if (!envelope) throw new NotFoundError('Envelope', recipient.envelopeId);
    if (envelope.status === EnvelopeStatus.VOIDED) {
      throw new InvalidStateTransitionError(envelope.status, 'view');
    }

    // Allowed assets: page PNGs for this doc, signed PDF, cert PDF.
    const pagesPrefix = `pages/${envelope.documentId}/`;
    const signedKey = `signed/${envelope.id}/signed.pdf`;
    const certKey = `signed/${envelope.id}/certificate.pdf`;

    if (filePath.startsWith(pagesPrefix) && filePath.endsWith('.png')) {
      const data = await this.storage.load(filePath);
      return { data, contentType: 'image/png' };
    }
    if (filePath === certKey) {
      const stale =
        envelope.signedPdfVersion == null ||
        envelope.signedPdfVersion < SIGNED_PDF_RENDERER_VERSION;
      let cached: Buffer | null = null;
      try {
        cached = await this.storage.load(filePath);
      } catch {
        // missing
      }
      if (cached && !stale) {
        return { data: cached, contentType: 'application/pdf' };
      }
      if (envelope.status !== EnvelopeStatus.COMPLETED) {
        if (cached) {
          return { data: cached, contentType: 'application/pdf' };
        }
        throw new NotFoundError('File', filePath);
      }
      this.logger.warn(
        `loadFileForToken(${envelope.id}): rebuilding cert (cached=${!!cached} version=${envelope.signedPdfVersion})`,
      );
      try {
        await this.runFinalizeSignedPdf(envelope.id);
      } catch (err) {
        this.logger.error(
          `loadFileForToken(${envelope.id}) cert rebuild failed: ${(err as Error).message}`,
        );
        if (cached) {
          return { data: cached, contentType: 'application/pdf' };
        }
        throw err;
      }
      return {
        data: await this.storage.load(filePath),
        contentType: 'application/pdf',
      };
    }
    if (filePath === signedKey) {
      // Self-heal on two triggers:
      //   - file missing (finalize job failed earlier)
      //   - signedPdfVersion stale (PDF predates current renderer)
      const stale =
        envelope.signedPdfVersion == null ||
        envelope.signedPdfVersion < SIGNED_PDF_RENDERER_VERSION;
      let needsRebuild = stale;
      let cached: Buffer | null = null;
      try {
        cached = await this.storage.load(filePath);
      } catch {
        needsRebuild = true;
      }
      if (!needsRebuild && cached) {
        return { data: cached, contentType: 'application/pdf' };
      }
      if (envelope.status !== EnvelopeStatus.COMPLETED) {
        if (cached) {
          return { data: cached, contentType: 'application/pdf' };
        }
        throw new NotFoundError('File', filePath);
      }
      this.logger.warn(
        `loadFileForToken(${envelope.id}): rebuilding (cached=${!!cached} version=${envelope.signedPdfVersion})`,
      );
      try {
        await this.runFinalizeSignedPdf(envelope.id);
      } catch (err) {
        this.logger.error(
          `loadFileForToken(${envelope.id}) rebuild failed: ${(err as Error).message}`,
        );
        if (cached) {
          return { data: cached, contentType: 'application/pdf' };
        }
        throw err;
      }
      return {
        data: await this.storage.load(filePath),
        contentType: 'application/pdf',
      };
    }
    throw new NotFoundError('File', filePath);
  }

  /**
   * Public completion view. Returns minimal envelope info + signed PDF
   * URL once envelope completed. Used by standalone post-sign page so
   * recipients can view/download signed copy without auth.
   */
  async getCompletionForToken(token: string) {
    const recipient = await this.getByToken(token);
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: recipient.envelopeId },
      select: {
        id: true,
        title: true,
        status: true,
        completedAt: true,
      },
    });
    if (!envelope) throw new NotFoundError('Envelope', recipient.envelopeId);

    const base =
      process.env.STORAGE_URL_BASE?.replace(/\/files$/, '') ??
      'http://localhost:8000/api/v1';
    const signedKey = `signed/${envelope.id}/signed.pdf`;
    const certKey = `signed/${envelope.id}/certificate.pdf`;
    const completed = envelope.status === EnvelopeStatus.COMPLETED;
    const signedPdfUrl = completed
      ? `${base}/sign/${token}/files/${signedKey}`
      : null;
    const certificatePdfUrl = completed
      ? `${base}/sign/${token}/files/${certKey}`
      : null;

    return {
      envelopeId: envelope.id,
      envelopeTitle: envelope.title,
      envelopeStatus: envelope.status,
      completedAt: envelope.completedAt,
      recipientName: recipient.name,
      recipientStatus: recipient.status,
      signedPdfUrl,
      certificatePdfUrl,
    };
  }

  /**
   * Token-scoped combined download — merges signed document + cert
   * into a single PDF for the signer's email-driven view. Self-heals
   * missing/stale artifacts via runFinalizeSignedPdf, identical to
   * the dashboard path.
   */
  async combinedForToken(
    token: string,
  ): Promise<{ data: Buffer; filename: string }> {
    const recipient = await this.getByToken(token);
    let envelope = await this.prisma.envelope.findUnique({
      where: { id: recipient.envelopeId },
    });
    if (!envelope) throw new NotFoundError('Envelope', recipient.envelopeId);
    if (envelope.status !== EnvelopeStatus.COMPLETED) {
      throw new InvalidStateTransitionError(envelope.status, 'download');
    }

    const stale =
      envelope.signedPdfVersion == null ||
      envelope.signedPdfVersion < SIGNED_PDF_RENDERER_VERSION;
    if (stale || !envelope.signedStorageKey || !envelope.certificateStorageKey) {
      try {
        await this.runFinalizeSignedPdf(envelope.id);
      } catch (err) {
        this.logger.error(
          `combinedForToken(${envelope.id}) rebuild failed: ${(err as Error).message}`,
        );
      }
      const refreshed = await this.prisma.envelope.findUnique({
        where: { id: envelope.id },
      });
      if (refreshed) envelope = refreshed;
    }
    if (!envelope.signedStorageKey || !envelope.certificateStorageKey) {
      throw new NotFoundError('CombinedPdf', envelope.id);
    }
    const [doc, cert] = await Promise.all([
      this.storage.load(envelope.signedStorageKey),
      this.storage.load(envelope.certificateStorageKey),
    ]);
    const merged = await this.processor.mergePdfs([doc, cert]);
    const safeTitle = envelope.title.replace(/[^a-zA-Z0-9._-]+/g, '_');
    return { data: merged, filename: `${safeTitle}.combined.pdf` };
  }

  /**
   * Build token-scoped public URLs for the signer's document pages.
   * Replaces auth-protected `/files/*` paths with `/sign/:token/files/*`
   * so signers can fetch images without JWT.
   */
  publicPageUrls(token: string, documentId: string, pageCount: number): string[] {
    const base =
      process.env.STORAGE_URL_BASE?.replace(/\/files$/, '') ??
      'http://localhost:8000/api/v1';
    return Array.from({ length: pageCount }, (_, i) => {
      const key = `pages/${documentId}/page_${String(i + 1).padStart(4, '0')}.png`;
      return `${base}/sign/${token}/files/${key}`;
    });
  }

  /**
   * Mirror of EnvelopesService.ACTIVITY_RETENTION_LIMIT. Kept here to
   * avoid cross-service coupling. Update both if cap changes.
   */
  private static readonly ACTIVITY_RETENTION_LIMIT = 15;

  private async log(
    envelopeId: string,
    eventType: AuditEventType,
    actorEmail: string,
    metadata: Prisma.JsonObject = {},
    ipAddress: string | null = null,
  ): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        envelopeId,
        eventType,
        actorEmail,
        metadata,
        ipAddress: ipAddress ?? undefined,
      },
    });
    void this.fanOutWebhook(envelopeId, eventType, metadata, actorEmail);
    void this.pruneOldEvents(envelopeId);
  }

  /**
   * Cap audit events per envelope owner. Mirrors EnvelopesService prune
   * to keep recipient-driven events (sign/decline/view) bounded too.
   *
   * WARNING: Deletes legal audit data. Disable if regulatory retention
   * required.
   */
  private async pruneOldEvents(envelopeId: string): Promise<void> {
    try {
      const env = await this.prisma.envelope.findUnique({
        where: { id: envelopeId },
        select: { userId: true },
      });
      if (!env) return;

      const cap = SigningService.ACTIVITY_RETENTION_LIMIT;
      const stale = await this.prisma.auditEvent.findMany({
        where: { envelope: { userId: env.userId } },
        orderBy: { createdAt: 'desc' },
        skip: cap,
        select: { id: true },
      });
      if (stale.length === 0) return;

      await this.prisma.auditEvent.deleteMany({
        where: { id: { in: stale.map((e) => e.id) } },
      });
    } catch (err) {
      this.logger.warn(
        `audit prune failed for envelope ${envelopeId}: ${(err as Error).message}`,
      );
    }
  }

  private async fanOutWebhook(
    envelopeId: string,
    eventType: AuditEventType,
    metadata: Prisma.JsonObject,
    actorEmail: string,
  ): Promise<void> {
    try {
      const env = await this.prisma.envelope.findUnique({
        where: { id: envelopeId },
        select: { userId: true, status: true, title: true },
      });
      if (!env) return;
      await this.webhooks.fanOut(env.userId, eventType, envelopeId, {
        status: env.status,
        title: env.title,
        actorEmail,
        ...metadata,
      });
    } catch {
      /* swallow */
    }
  }
}
