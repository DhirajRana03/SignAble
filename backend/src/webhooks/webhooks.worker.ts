import { Injectable } from '@nestjs/common';

import { JOB_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import { QueueWorkerBase } from '../queues/queue-worker';
import { QueueService } from '../queues/queue.service';
import type { DeliverWebhookJob } from '../queues/queue.types';
import { WebhooksService } from './webhooks.service';

/**
 * BullMQ worker for the webhooks queue. One job = one HTTP delivery to a
 * single subscription. Exponential-backoff retries handled by BullMQ.
 */
@Injectable()
export class WebhooksWorker extends QueueWorkerBase<DeliverWebhookJob> {
  constructor(
    queue: QueueService,
    private readonly webhooksService: WebhooksService,
  ) {
    super(
      queue,
      QUEUE_NAMES.WEBHOOKS,
      JOB_NAMES.DELIVER_WEBHOOK,
      'WebhooksWorker',
    );
  }

  protected concurrency(): number {
    // Outbound HTTP — can run many in parallel
    return 10;
  }

  async handle(payload: DeliverWebhookJob): Promise<void> {
    await this.webhooksService.runDeliver(payload);
  }
}
