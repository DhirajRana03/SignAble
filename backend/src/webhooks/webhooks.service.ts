import { createHmac, randomBytes } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import {
  ForbiddenError,
  NotFoundError,
} from '../common/exceptions/domain.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { JOB_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import { QueueService } from '../queues/queue.service';
import type { DeliverWebhookJob } from '../queues/queue.types';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookEventType,
} from './dto/webhook.dto';

interface WebhookPayload {
  event: string;
  envelopeId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async create(userId: string, dto: CreateWebhookDto) {
    return this.prisma.webhookSubscription.create({
      data: {
        userId,
        url: dto.url,
        events: dto.events ?? [],
        secret: this.generateSecret(),
      },
    });
  }

  async list(userId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, id: string) {
    const sub = await this.prisma.webhookSubscription.findUnique({
      where: { id },
    });
    if (!sub) throw new NotFoundError('Webhook', id);
    if (sub.userId !== userId) throw new ForbiddenError();
    return sub;
  }

  async update(userId: string, id: string, dto: UpdateWebhookDto) {
    await this.get(userId, id);
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        url: dto.url ?? undefined,
        events: dto.events ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.get(userId, id);
    await this.prisma.webhookSubscription.delete({ where: { id } });
  }

  async listDeliveries(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.webhookDelivery.findMany({
      where: { subscriptionId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Fan-out to all active webhooks subscribed to this event for the envelope owner.
   * Called from envelope/signing services after state changes.
   * Errors logged, never thrown — callers do not depend on delivery.
   */
  async fanOut(
    ownerUserId: string,
    eventType: WebhookEventType,
    envelopeId: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const subs = await this.prisma.webhookSubscription.findMany({
      where: {
        userId: ownerUserId,
        isActive: true,
        OR: [{ events: { isEmpty: true } }, { events: { has: eventType } }],
      },
    });

    if (subs.length === 0) return;

    const timestamp = new Date().toISOString();

    // Enqueue one delivery job per subscription. Each retries independently
    // with exponential backoff (configured in QueueService defaults).
    await Promise.all(
      subs.map((s) =>
        this.queue.enqueue<DeliverWebhookJob>(
          QUEUE_NAMES.WEBHOOKS,
          JOB_NAMES.DELIVER_WEBHOOK,
          {
            subscriptionId: s.id,
            url: s.url,
            secret: s.secret,
            eventType,
            envelopeId,
            data,
            timestamp,
          },
        ),
      ),
    );
  }

  /**
   * Worker entrypoint. Performs the HTTP POST + records delivery row.
   * Throws on non-2xx to trigger BullMQ retry; persistent failure rows
   * accumulate per subscription.
   */
  async runDeliver(payload: DeliverWebhookJob): Promise<void> {
    const webhookPayload: WebhookPayload = {
      event: String(payload.eventType),
      envelopeId: payload.envelopeId,
      data: payload.data,
      timestamp: payload.timestamp,
    };
    await this.deliver(
      payload.subscriptionId,
      payload.url,
      payload.secret,
      webhookPayload,
    );
  }

  private async deliver(
    subscriptionId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
  ): Promise<void> {
    const body = JSON.stringify(payload);
    const signature = this.sign(secret, body);

    let status = 0;
    let responseBody = '';
    let succeeded = false;

    try {
      const res = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-SignAble-Event': payload.event,
          'X-SignAble-Signature': signature,
          'X-SignAble-Delivery': randomBytes(8).toString('hex'),
        },
        timeout: 10_000,
        validateStatus: () => true,
      });
      status = res.status;
      responseBody = typeof res.data === 'string'
        ? res.data.slice(0, 2000)
        : JSON.stringify(res.data).slice(0, 2000);
      succeeded = res.status >= 200 && res.status < 300;
    } catch (err) {
      responseBody = (err as Error).message.slice(0, 2000);
    }

    await this.prisma.webhookDelivery.create({
      data: {
        subscriptionId,
        eventType: payload.event,
        payload: payload as unknown as object,
        responseStatus: status || null,
        responseBody,
        succeeded,
      },
    });

    if (succeeded) {
      await this.prisma.webhookSubscription.update({
        where: { id: subscriptionId },
        data: { lastFiredAt: new Date(), failureCount: 0 },
      });
      return;
    }

    await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { failureCount: { increment: 1 } },
    });
    this.logger.warn(
      `webhook delivery failed sub=${subscriptionId} status=${status}`,
    );
    // Throw so BullMQ retries with backoff. Delivery row already persisted
    // with the failure status; retries create additional rows.
    throw new Error(
      `Webhook delivery failed: sub=${subscriptionId} status=${status}`,
    );
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }

  private sign(secret: string, body: string): string {
    return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  }
}
