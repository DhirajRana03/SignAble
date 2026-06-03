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
import { StorageService } from '../storage/storage.service';

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly processor: ProcessorService,
    private readonly notifications: NotificationsService,
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
      pageUrls: this.storage.pageUrls(doc.id, doc.pageCount),
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
        setImmediate(() => {
          void this.sendSigningEmail(next.id);
        });
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
    setImmediate(() => {
      void this.buildSignedPdf(envelope.id);
    });
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
  }
}
