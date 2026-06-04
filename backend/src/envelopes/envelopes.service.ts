import { Injectable } from '@nestjs/common';
import {
  AuditEvent,
  AuditEventType,
  DocumentStatus,
  Envelope,
  EnvelopeStatus,
  Prisma,
  SigningOrder,
} from '@prisma/client';

import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '../common/exceptions/domain.exceptions';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { JOB_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import { QueueService } from '../queues/queue.service';
import type { SendSigningRequestJob } from '../queues/queue.types';
import { StorageService } from '../storage/storage.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CreateEnvelopeDto, UpdateEnvelopeDto } from './dto/envelope.dto';

const ALLOWED_TRANSITIONS: Record<EnvelopeStatus, EnvelopeStatus[]> = {
  DRAFT: ['SENT', 'VOIDED'],
  SENT: ['IN_PROGRESS', 'VOIDED'],
  IN_PROGRESS: ['COMPLETED', 'VOIDED'],
  COMPLETED: [],
  VOIDED: [],
  EXPIRED: [],
};

@Injectable()
export class EnvelopesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
    private readonly queue: QueueService,
  ) {}

  async create(
    userId: string,
    userEmail: string,
    dto: CreateEnvelopeDto,
  ): Promise<Envelope> {
    const doc = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
    });
    if (!doc) {
      throw new NotFoundError('Document', dto.documentId);
    }
    if (doc.userId !== userId) {
      throw new ForbiddenError();
    }
    if (doc.status !== DocumentStatus.READY) {
      throw new ValidationError(
        'Document must be fully processed before creating an envelope',
      );
    }

    const envelope = await this.prisma.envelope.create({
      data: {
        userId,
        documentId: dto.documentId,
        title: dto.title,
        message: dto.message,
        signingOrder: dto.signingOrder ?? SigningOrder.SEQUENTIAL,
      },
    });

    await this.log(
      envelope.id,
      AuditEventType.ENVELOPE_CREATED,
      userEmail,
    );

    return envelope;
  }

  async get(userId: string, envelopeId: string): Promise<Envelope> {
    const env = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
      include: { recipients: true, fields: true },
    });
    if (!env) {
      throw new NotFoundError('Envelope', envelopeId);
    }
    if (env.userId !== userId) {
      throw new ForbiddenError();
    }
    return env;
  }

  async list(userId: string): Promise<Envelope[]> {
    return this.prisma.envelope.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { recipients: true },
    });
  }

  async update(
    userId: string,
    envelopeId: string,
    dto: UpdateEnvelopeDto,
  ): Promise<Envelope> {
    const env = await this.get(userId, envelopeId);
    if (env.status !== EnvelopeStatus.DRAFT) {
      throw new InvalidStateTransitionError(env.status, 'update');
    }
    return this.prisma.envelope.update({
      where: { id: envelopeId },
      data: {
        title: dto.title ?? undefined,
        message: dto.message ?? undefined,
        signingOrder: dto.signingOrder ?? undefined,
      },
    });
  }

  /**
   * Attach extra document to envelope. Primary documentId stays as set
   * on create. Attachments are sender-side reference material today;
   * future bundling may merge them into final signed PDF.
   * Rejects on non-DRAFT envelope to prevent post-send tampering.
   */
  async attachDocument(
    userId: string,
    envelopeId: string,
    documentId: string,
  ): Promise<{ envelopeId: string; documentId: string; orderIndex: number }> {
    const env = await this.get(userId, envelopeId);
    if (env.status !== EnvelopeStatus.DRAFT) {
      throw new InvalidStateTransitionError(env.status, 'attach_document');
    }
    if (env.documentId === documentId) {
      throw new ValidationError(
        'Document already attached as primary document',
      );
    }
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundError('Document', documentId);
    if (doc.userId !== userId) throw new ForbiddenError();
    if (doc.status !== DocumentStatus.READY) {
      throw new ValidationError(
        'Document must finish processing before attachment',
      );
    }
    const existing = await this.prisma.envelopeDocument.findUnique({
      where: {
        envelopeId_documentId: { envelopeId, documentId },
      },
    });
    if (existing) {
      throw new ValidationError('Document already attached to envelope');
    }
    const count = await this.prisma.envelopeDocument.count({
      where: { envelopeId },
    });
    return this.prisma.envelopeDocument.create({
      data: { envelopeId, documentId, orderIndex: count },
    });
  }

  async detachDocument(
    userId: string,
    envelopeId: string,
    documentId: string,
  ): Promise<void> {
    const env = await this.get(userId, envelopeId);
    if (env.status !== EnvelopeStatus.DRAFT) {
      throw new InvalidStateTransitionError(env.status, 'detach_document');
    }
    await this.prisma.envelopeDocument.delete({
      where: {
        envelopeId_documentId: { envelopeId, documentId },
      },
    });
  }

  async listAttachedDocuments(
    userId: string,
    envelopeId: string,
  ): Promise<
    Array<{
      documentId: string;
      orderIndex: number;
      attachedAt: Date;
      filename: string;
      pageCount: number;
      status: DocumentStatus;
    }>
  > {
    await this.get(userId, envelopeId); // ownership check
    const rows = await this.prisma.envelopeDocument.findMany({
      where: { envelopeId },
      orderBy: { orderIndex: 'asc' },
      include: { document: true },
    });
    return rows.map((r) => ({
      documentId: r.documentId,
      orderIndex: r.orderIndex,
      attachedAt: r.attachedAt,
      filename: r.document.filename,
      pageCount: r.document.pageCount,
      status: r.document.status,
    }));
  }

  async send(
    userId: string,
    userEmail: string,
    envelopeId: string,
  ): Promise<Envelope> {
    const env = await this.get(userId, envelopeId);
    this.assertTransition(env.status, EnvelopeStatus.SENT);
    await this.validateReadyToSend(envelopeId);

    const updated = await this.prisma.envelope.update({
      where: { id: envelopeId },
      data: { status: EnvelopeStatus.SENT, sentAt: new Date() },
    });

    await this.log(envelopeId, AuditEventType.ENVELOPE_SENT, userEmail);

    // Enqueue per-recipient signing-request jobs. BullMQ handles retries
    // + backoff; inline mode dispatches immediately via registered handler.
    await this.notifyInitial(envelopeId);

    return updated;
  }

  async void(
    userId: string,
    userEmail: string,
    envelopeId: string,
    reason: string,
  ): Promise<Envelope> {
    const env = await this.get(userId, envelopeId);
    this.assertTransition(env.status, EnvelopeStatus.VOIDED);

    const updated = await this.prisma.envelope.update({
      where: { id: envelopeId },
      data: { status: EnvelopeStatus.VOIDED },
    });

    await this.log(envelopeId, AuditEventType.ENVELOPE_VOIDED, userEmail, {
      reason,
    });

    return updated;
  }

  /**
   * Paginated audit log. Cursor-based on AuditEvent.id (uuid) so callers
   * can fetch next page deterministically without offset drift. Optional
   * eventType filter narrows to one event class. Default page size 50,
   * capped at 200 to bound payload size.
   */
  async getAudit(
    userId: string,
    envelopeId: string,
    options: {
      cursor?: string;
      limit?: number;
      eventType?: AuditEventType;
    } = {},
  ): Promise<{ items: AuditEvent[]; nextCursor: string | null }> {
    await this.get(userId, envelopeId); // ownership check
    const take = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const where: Prisma.AuditEventWhereInput = { envelopeId };
    if (options.eventType) where.eventType = options.eventType;

    const items = await this.prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: take + 1,
      ...(options.cursor
        ? { skip: 1, cursor: { id: options.cursor } }
        : {}),
    });

    const hasMore = items.length > take;
    const trimmed = hasMore ? items.slice(0, take) : items;
    return {
      items: trimmed,
      nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null,
    };
  }

  async download(userId: string, envelopeId: string): Promise<Buffer> {
    const env = await this.get(userId, envelopeId);
    if (env.status !== EnvelopeStatus.COMPLETED || !env.signedStorageKey) {
      throw new InvalidStateTransitionError(env.status, 'download');
    }
    return this.storage.load(env.signedStorageKey);
  }

  private async validateReadyToSend(envelopeId: string): Promise<void> {
    const recipients = await this.prisma.recipient.findMany({
      where: { envelopeId },
      include: { fields: true },
    });
    if (recipients.length === 0) {
      throw new ValidationError(
        'Add at least one recipient before sending',
      );
    }
    for (const r of recipients) {
      const required = r.fields.filter((f) => f.required);
      if (required.length === 0) {
        throw new ValidationError(
          `Recipient ${r.email} has no required signature fields`,
        );
      }
    }
  }

  private assertTransition(
    current: EnvelopeStatus,
    next: EnvelopeStatus,
  ): void {
    if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
      throw new InvalidStateTransitionError(current, next);
    }
  }

  private async notifyInitial(envelopeId: string): Promise<void> {
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
      include: { recipients: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!envelope) return;

    const targets =
      envelope.signingOrder === SigningOrder.SEQUENTIAL
        ? envelope.recipients.slice(0, 1)
        : envelope.recipients;

    for (const r of targets) {
      await this.queue.enqueue<SendSigningRequestJob>(
        QUEUE_NAMES.NOTIFICATIONS,
        JOB_NAMES.SEND_SIGNING_REQUEST,
        { recipientId: r.id },
      );
    }
  }

  private async log(
    envelopeId: string,
    eventType: AuditEventType,
    actorEmail: string,
    metadata: Prisma.JsonObject = {},
    ipAddress?: string,
  ): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        envelopeId,
        eventType,
        actorEmail,
        metadata,
        ipAddress,
      },
    });
    // Webhook fan-out runs after audit row commits; resolves envelope owner
    // for routing. Errors swallowed inside service — never block audit path.
    void this.fanOutWebhook(envelopeId, eventType, metadata);
  }

  private async fanOutWebhook(
    envelopeId: string,
    eventType: AuditEventType,
    metadata: Prisma.JsonObject,
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
        ...metadata,
      });
    } catch {
      /* never throw out of webhook fan-out */
    }
  }
}
