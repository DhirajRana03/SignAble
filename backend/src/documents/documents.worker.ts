import { Injectable } from '@nestjs/common';

import { JOB_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import { QueueWorkerBase } from '../queues/queue-worker';
import { QueueService } from '../queues/queue.service';
import type { ProcessDocumentJob } from '../queues/queue.types';
import { DocumentsService } from './documents.service';

/**
 * BullMQ worker for the documents queue. Delegates to DocumentsService for
 * actual work — worker only handles the queue lifecycle.
 */
@Injectable()
export class DocumentsWorker extends QueueWorkerBase<ProcessDocumentJob> {
  constructor(
    queue: QueueService,
    private readonly documentsService: DocumentsService,
  ) {
    super(
      queue,
      QUEUE_NAMES.DOCUMENTS,
      JOB_NAMES.PROCESS_DOCUMENT,
      'DocumentsWorker',
    );
  }

  protected concurrency(): number {
    // PDF rendering is CPU-bound. Keep concurrency modest.
    return 2;
  }

  async handle(payload: ProcessDocumentJob): Promise<void> {
    await this.documentsService.runProcessDocument(payload.documentId);
  }
}
