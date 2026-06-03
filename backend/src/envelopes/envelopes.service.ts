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

    // Notify first recipient(s) without blocking the response.
    setImmediate(() => {
      void this.notifyInitial(envelopeId);
    });

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

  async getAudit(userId: string, envelopeId: string): Promise<AuditEvent[]> {
    await this.get(userId, envelopeId); // ownership check
    return this.prisma.auditEvent.findMany({
      where: { envelopeId },
      orderBy: { createdAt: 'asc' },
    });
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
      await this.notifications.sendSigningRequest({
        to: r.email,
        name: r.name,
        envelopeTitle: envelope.title,
        signingToken: r.signingToken,
        message: envelope.message,
      });
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
