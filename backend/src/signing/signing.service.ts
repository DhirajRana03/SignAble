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
  ProcessorService,
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
    await this.queue.enqueue<FinalizeSignedPdfJob>(
      QUEUE_NAMES.SIGNING,
      JOB_NAMES.FINALIZE_SIGNED_PDF,
      { envelopeId: envelope.id },
    );
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
      });

      const pdfBuffer = await this.storage.load(doc.storageKey);
      const processResult = await this.processor.processDocument(pdfBuffer);

      const payload: SignedFieldData[] = signedFields.map((f) => ({
        field_type: f.fieldType.toLowerCase(),
        page_number: f.pageNumber,
        x_pct: f.xPct,
        y_pct: f.yPct,
        width_pct: f.widthPct,
        height_pct: f.heightPct,
        value: f.value ?? '',
      }));

      const signedPdf = await this.processor.applySignatures(
        pdfBuffer,
        payload,
        processResult.page_dimensions,
      );

      const key = await this.storage.saveSigned(envelopeId, signedPdf);
      await this.prisma.envelope.update({
        where: { id: envelopeId },
        data: { signedStorageKey: key },
      });

      // Send completion emails
      const recipients = await this.prisma.recipient.findMany({
        where: { envelopeId },
      });
      const sender = await this.prisma.user.findUnique({
        where: { id: envelope.userId },
      });

      for (const r of recipients) {
        await this.notifications.sendCompletion({
          to: r.email,
          name: r.name,
          envelopeTitle: envelope.title,
          envelopeId,
          signingToken: r.signingToken,
        });
      }
      if (sender) {
        await this.notifications.sendCompletion({
          to: sender.email,
          name: sender.name,
          envelopeTitle: envelope.title,
          envelopeId,
        });
      }
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
      select: { id: true, documentId: true, status: true },
    });
    if (!envelope) throw new NotFoundError('Envelope', recipient.envelopeId);
    if (envelope.status === EnvelopeStatus.VOIDED) {
      throw new InvalidStateTransitionError(envelope.status, 'view');
    }

    // Allowed assets: page PNGs for this doc, or signed PDF for this envelope.
    const pagesPrefix = `pages/${envelope.documentId}/`;
    const signedKey = `signed/${envelope.id}/signed.pdf`;

    if (filePath.startsWith(pagesPrefix) && filePath.endsWith('.png')) {
      const data = await this.storage.load(filePath);
      return { data, contentType: 'image/png' };
    }
    if (filePath === signedKey) {
      const data = await this.storage.load(filePath);
      return { data, contentType: 'application/pdf' };
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
    const signedPdfUrl =
      envelope.status === EnvelopeStatus.COMPLETED
        ? `${base}/sign/${token}/files/${signedKey}`
        : null;

    return {
      envelopeId: envelope.id,
      envelopeTitle: envelope.title,
      envelopeStatus: envelope.status,
      completedAt: envelope.completedAt,
      recipientName: recipient.name,
      recipientStatus: recipient.status,
      signedPdfUrl,
    };
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
