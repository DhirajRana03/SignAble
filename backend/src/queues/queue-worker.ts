import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';

import type { QueueService } from './queue.service';

/**
 * Base class for queue workers. Subclasses register an inline handler so
 * the same code path runs in both BullMQ and inline modes.
 *
 * Lifecycle:
 *   onModuleInit  -> register inline handler + start BullMQ worker (if real)
 *   onModuleDestroy -> close worker cleanly
 */
export abstract class QueueWorkerBase<TPayload extends object>
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;
  private worker: Worker | null = null;

  constructor(
    protected readonly queue: QueueService,
    protected readonly queueName: string,
    protected readonly jobName: string,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  abstract handle(payload: TPayload, job?: Job): Promise<void>;

  /** Override to tune concurrency. */
  protected concurrency(): number {
    return 5;
  }

  async onModuleInit(): Promise<void> {
    // Always register inline handler — no-op when not inline
    this.queue.registerInlineHandler<TPayload>(
      this.queueName as never,
      this.jobName,
      (p) => this.handle(p),
    );

    if (this.queue.isInline()) return;

    const connection = this.queue.getConnectionOptions();
    if (!connection) {
      this.logger.warn('No Redis connection options available — worker not started');
      return;
    }

    this.worker = new Worker(
      this.queueName,
      async (job: Job) => {
        if (job.name !== this.jobName) {
          // Multiple job types per queue are routed by separate workers;
          // ignore foreign job names instead of failing.
          return;
        }
        this.logger.log(
          `processing ${this.jobName} id=${job.id} attempt=${job.attemptsMade + 1}`,
        );
        await this.handle(job.data as TPayload, job);
      },
      {
        connection,
        concurrency: this.concurrency(),
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `${this.jobName} job=${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`,
      );
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`${this.jobName} id=${job.id} completed`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
