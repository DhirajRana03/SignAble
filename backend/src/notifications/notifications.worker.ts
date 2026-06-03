import { Injectable } from '@nestjs/common';

import { JOB_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import { QueueWorkerBase } from '../queues/queue-worker';
import { QueueService } from '../queues/queue.service';
import type { SendSigningRequestJob } from '../queues/queue.types';
import { SigningService } from '../signing/signing.service';

/**
 * Worker for send-signing-request jobs. Delegates to SigningService which
 * already owns the email-dispatch path.
 */
@Injectable()
export class NotificationsWorker extends QueueWorkerBase<SendSigningRequestJob> {
  constructor(
    queue: QueueService,
    private readonly signingService: SigningService,
  ) {
    super(
      queue,
      QUEUE_NAMES.NOTIFICATIONS,
      JOB_NAMES.SEND_SIGNING_REQUEST,
      'NotificationsWorker',
    );
  }

  async handle(payload: SendSigningRequestJob): Promise<void> {
    await this.signingService.runSendSigningRequest(payload.recipientId);
  }
}
