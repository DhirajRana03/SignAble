import { Injectable } from '@nestjs/common';

import { JOB_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import { QueueWorkerBase } from '../queues/queue-worker';
import { QueueService } from '../queues/queue.service';
import type { FinalizeSignedPdfJob } from '../queues/queue.types';
import { SigningService } from './signing.service';

/**
 * Worker for finalize-signed-pdf jobs. Heavy: pulls PDF, calls processor,
 * stamps signatures, fans out completion emails. Concurrency capped low.
 */
@Injectable()
export class SigningWorker extends QueueWorkerBase<FinalizeSignedPdfJob> {
  constructor(
    queue: QueueService,
    private readonly signingService: SigningService,
  ) {
    super(
      queue,
      QUEUE_NAMES.SIGNING,
      JOB_NAMES.FINALIZE_SIGNED_PDF,
      'SigningWorker',
    );
  }

  protected concurrency(): number {
    return 2;
  }

  async handle(payload: FinalizeSignedPdfJob): Promise<void> {
    await this.signingService.runFinalizeSignedPdf(payload.envelopeId);
  }
}
