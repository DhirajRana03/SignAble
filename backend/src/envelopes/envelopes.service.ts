import { Injectable, Logger } from '@nestjs/common';
import {
  AuditEvent,
  AuditEventType,
  DocumentStatus,
  Envelope,
  EnvelopeStatus,
  Prisma,
  RecipientStatus,
  SigningOrder,
} from '@prisma/client';

import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from '../common/exceptions/domain.exceptions';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessorService } from '../processor/processor.service';
import { JOB_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import { QueueService } from '../queues/queue.service';
import type { SendSigningRequestJob } from '../queues/queue.types';
import {
  SIGNED_PDF_RENDERER_VERSION,
  SigningService,
} from '../signing/signing.service';
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
  private readonly logger = new Logger(EnvelopesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly webhooks: WebhooksService,
    private readonly queue: QueueService,
    private readonly signing: SigningService,
    private readonly processor: ProcessorService,
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

  /**
   * List envelopes owned by user. Optional status filter accepts single
   * status or array (for Archive bucket combining VOIDED + EXPIRED).
   */
  async list(
    userId: string,
    status?: EnvelopeStatus | EnvelopeStatus[],
  ): Promise<Envelope[]> {
    const statusFilter = Array.isArray(status)
      ? { in: status }
      : status
        ? { equals: status }
        : undefined;
    return this.prisma.envelope.findMany({
      where: { userId, ...(statusFilter ? { status: statusFilter } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { recipients: true },
    });
  }

  /**
   * Inbox: envelopes where the current user is listed as a recipient
   * pending action. Excludes envelopes the user owns (those belong to
   * Sent for Signature). Matches recipient.email to user.email.
   */
  async inbox(userId: string, userEmail: string): Promise<Envelope[]> {
    return this.prisma.envelope.findMany({
      where: {
        userId: { not: userId },
        status: { in: [EnvelopeStatus.SENT, EnvelopeStatus.IN_PROGRESS] },
        recipients: {
          some: {
            email: userEmail,
            status: { in: [RecipientStatus.PENDING, RecipientStatus.VIEWED] },
          },
        },
      },
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
    // Validate primary document swap if requested.
    if (dto.documentId && dto.documentId !== env.documentId) {
      const doc = await this.prisma.document.findUnique({
        where: { id: dto.documentId },
      });
      if (!doc) throw new NotFoundError('Document', dto.documentId);
      if (doc.userId !== userId) throw new ForbiddenError();
      if (doc.status !== DocumentStatus.READY) {
        throw new ValidationError(
          'Document must finish processing before use as primary',
        );
      }
      // Detach from join table if previously attached as extra.
      await this.prisma.envelopeDocument
        .delete({
          where: {
            envelopeId_documentId: {
              envelopeId,
              documentId: dto.documentId,
            },
          },
        })
        .catch(() => undefined);
    }
    return this.prisma.envelope.update({
      where: { id: envelopeId },
      data: {
        title: dto.title ?? undefined,
        message: dto.message ?? undefined,
        signingOrder: dto.signingOrder ?? undefined,
        documentId: dto.documentId ?? undefined,
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

  /**
   * Resend signing invites to recipients still pending action. Used when
   * the original notification was missed, lost, or filtered. Only emails
   * recipients with status PENDING or VIEWED — signed/declined are
   * intentionally skipped to avoid confusing completed signers.
   *
   * Rate-limited to once per 2 hours per envelope (tracked via the most
   * recent ENVELOPE_RESENT audit event) so an impatient sender cannot
   * spam recipients into marking the address as junk.
   */
  async resend(
    userId: string,
    userEmail: string,
    envelopeId: string,
  ): Promise<Envelope> {
    const env = await this.get(userId, envelopeId);

    if (
      env.status !== EnvelopeStatus.SENT &&
      env.status !== EnvelopeStatus.IN_PROGRESS
    ) {
      throw new InvalidStateTransitionError(env.status, 'resend');
    }

    const lastResend = await this.prisma.auditEvent.findFirst({
      where: { envelopeId, eventType: AuditEventType.ENVELOPE_RESENT },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (lastResend) {
      const ageMs = Date.now() - lastResend.createdAt.getTime();
      const cooldownMs = EnvelopesService.RESEND_COOLDOWN_MS;
      if (ageMs < cooldownMs) {
        const minsLeft = Math.ceil((cooldownMs - ageMs) / 60_000);
        throw new TooManyRequestsError(
          `Reminders were already sent. Try again in ${minsLeft} minutes.`,
        );
      }
    }

    const pending = await this.prisma.recipient.findMany({
      where: {
        envelopeId,
        status: {
          in: [RecipientStatus.PENDING, RecipientStatus.VIEWED],
        },
      },
      orderBy: { orderIndex: 'asc' },
      select: { id: true },
    });

    if (pending.length === 0) {
      throw new ValidationError(
        'No pending recipients — all have signed or declined.',
      );
    }

    for (const r of pending) {
      await this.queue.enqueue<SendSigningRequestJob>(
        QUEUE_NAMES.NOTIFICATIONS,
        JOB_NAMES.SEND_SIGNING_REQUEST,
        { recipientId: r.id },
      );
    }

    await this.log(envelopeId, AuditEventType.ENVELOPE_RESENT, userEmail, {
      recipientCount: pending.length,
    });

    return env;
  }

  /** Cooldown between resends per envelope. 2h chosen to balance
   *  sender impatience against recipient-side spam complaints. */
  private static readonly RESEND_COOLDOWN_MS = 2 * 60 * 60 * 1000;

  /**
   * Hard-delete draft envelope. Cascades through recipients, fields,
   * attachments, audit events via schema FK rules. Sent envelopes must
   * use void() — deletion would break audit chain.
   */
  async deleteDraft(userId: string, envelopeId: string): Promise<void> {
    const env = await this.get(userId, envelopeId);
    if (env.status !== EnvelopeStatus.DRAFT) {
      throw new InvalidStateTransitionError(env.status, 'delete');
    }
    await this.prisma.envelope.delete({ where: { id: envelopeId } });
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
   * Recent activity across all envelopes owned by user. Hydrates each
   * event with envelope title so frontend can render a self-contained
   * feed without N+1 fetches. Default 10 events, max 50.
   */
  async recentActivity(
    userId: string,
    limit = 10,
  ): Promise<
    Array<{
      id: string;
      envelopeId: string;
      envelopeTitle: string;
      eventType: AuditEventType;
      actorEmail: string;
      metadata: Prisma.JsonValue;
      createdAt: Date;
    }>
  > {
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.prisma.auditEvent.findMany({
      where: { envelope: { userId } },
      orderBy: { createdAt: 'desc' },
      take,
      include: { envelope: { select: { id: true, title: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      envelopeId: r.envelope.id,
      envelopeTitle: r.envelope.title,
      eventType: r.eventType,
      actorEmail: r.actorEmail,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }));
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

  /**
   * Download a finalized envelope artifact. `type` selects which file:
   *   - "document"    — signed pages only (default; matches legacy behaviour).
   *   - "certificate" — Certificate of Completion only.
   *   - "combined"    — document followed by certificate, merged on demand.
   *
   * Self-heals stale or missing artifacts:
   *   - Rebuilds when signedStorageKey or certificateStorageKey missing.
   *   - Rebuilds when signedPdfVersion < current renderer.
   *   - Older PDFs that pre-date the split (no certificateStorageKey)
   *     trigger a rebuild so the certificate file gets created.
   */
  async download(
    userId: string,
    envelopeId: string,
    type: 'document' | 'certificate' | 'combined' = 'document',
  ): Promise<Buffer> {
    let env = await this.get(userId, envelopeId);
    if (env.status !== EnvelopeStatus.COMPLETED) {
      throw new InvalidStateTransitionError(env.status, 'download');
    }

    const stale =
      env.signedPdfVersion == null ||
      env.signedPdfVersion < SIGNED_PDF_RENDERER_VERSION;
    const certMissing =
      type !== 'document' && !env.certificateStorageKey;
    const docMissing = !env.signedStorageKey;

    if (stale || docMissing || certMissing) {
      this.logger.warn(
        `download(${envelopeId}): rebuilding (doc=${!docMissing} cert=${!!env.certificateStorageKey} version=${env.signedPdfVersion})`,
      );
      try {
        await this.signing.runFinalizeSignedPdf(envelopeId);
      } catch (err) {
        this.logger.error(
          `download(${envelopeId}) rebuild failed: ${(err as Error).message}`,
        );
        if (docMissing) {
          throw new InvalidStateTransitionError(env.status, 'download');
        }
        // Document still readable — fall through with stale copy.
      }
      env = await this.get(userId, envelopeId);
    }

    if (type === 'document') {
      if (!env.signedStorageKey) {
        throw new InvalidStateTransitionError(env.status, 'download');
      }
      return this.storage.load(env.signedStorageKey);
    }

    if (type === 'certificate') {
      if (!env.certificateStorageKey) {
        throw new InvalidStateTransitionError(env.status, 'download');
      }
      return this.storage.load(env.certificateStorageKey);
    }

    // combined
    if (!env.signedStorageKey || !env.certificateStorageKey) {
      throw new InvalidStateTransitionError(env.status, 'download');
    }
    const [doc, cert] = await Promise.all([
      this.storage.load(env.signedStorageKey),
      this.storage.load(env.certificateStorageKey),
    ]);
    return this.processor.mergePdfs([doc, cert]);
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

  /**
   * Maximum audit events retained per envelope-owning user. Older events
   * beyond this cap are pruned after each new event write to keep the
   * recent-activity feed bounded.
   *
   * WARNING: Audit events form the legal signing trail. Pruning weakens
   * post-hoc verification of completed envelopes. If long-term audit
   * retention is required, raise this cap or remove the prune step.
   */
  private static readonly ACTIVITY_RETENTION_LIMIT = 15;

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
    // Best-effort prune. Failures must not break the write path.
    void this.pruneOldEvents(envelopeId);
  }

  /**
   * Cap audit events per envelope owner to ACTIVITY_RETENTION_LIMIT.
   * Resolves owner from envelope, finds events beyond the cap (oldest
   * first), deletes them.
   */
  private async pruneOldEvents(envelopeId: string): Promise<void> {
    try {
      const env = await this.prisma.envelope.findUnique({
        where: { id: envelopeId },
        select: { userId: true },
      });
      if (!env) return;

      const cap = EnvelopesService.ACTIVITY_RETENTION_LIMIT;
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
      // Swallow — prune is best-effort housekeeping, never block main flow.
      this.logger.warn(
        `audit prune failed for envelope ${envelopeId}: ${(err as Error).message}`,
      );
    }
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
