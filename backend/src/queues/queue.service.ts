import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Queue,
  type ConnectionOptions,
  type JobsOptions,
  type QueueOptions,
} from 'bullmq';

import { QUEUE_NAMES, type QueueName } from './queue-names';

/**
 * Single ioredis connection shared by all queue producers, and a Queue
 * instance per logical queue. When `QUEUES_INLINE=true`, jobs are executed
 * synchronously in-process via registered inline handlers — useful for tests
 * and Redis-less dev runs.
 *
 * Producers call `enqueue(QUEUE_NAME, JOB_NAME, payload, opts)` and never
 * touch BullMQ directly.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connectionOptions: ConnectionOptions | null;
  private readonly queues = new Map<QueueName, Queue>();
  private readonly inline: boolean;
  private readonly inlineHandlers = new Map<
    string,
    (payload: unknown) => Promise<void>
  >();
  private readonly defaultJobOptions: JobsOptions;

  constructor(private readonly config: ConfigService) {
    this.inline = this.config.get<boolean>('redis.inline') === true;
    this.defaultJobOptions = {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: {
        count: this.config.get<number>('bull.completedRetention') ?? 500,
      },
      removeOnFail: {
        count: this.config.get<number>('bull.failedRetention') ?? 5000,
      },
    };

    if (this.inline) {
      this.connectionOptions = null;
      this.logger.warn(
        'Queues running in INLINE mode — jobs execute synchronously (no Redis).',
      );
      return;
    }

    this.connectionOptions = {
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      password: this.config.get<string>('redis.password') || undefined,
      db: this.config.get<number>('redis.db'),
      // BullMQ requires this when using ioredis options directly
      maxRetriesPerRequest: null,
    };

    for (const name of Object.values(QUEUE_NAMES)) {
      const queueOpts: QueueOptions = {
        connection: this.connectionOptions,
        defaultJobOptions: this.defaultJobOptions,
      };
      this.queues.set(name, new Queue(name, queueOpts));
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const q of this.queues.values()) {
      await q.close();
    }
  }

  /**
   * Producer entrypoint. Enqueues a job to the named queue. In inline mode,
   * runs the registered handler immediately and returns when it resolves.
   */
  async enqueue<T extends object>(
    queueName: QueueName,
    jobName: string,
    payload: T,
    options?: JobsOptions,
  ): Promise<void> {
    if (this.inline) {
      const key = `${queueName}:${jobName}`;
      const handler = this.inlineHandlers.get(key);
      if (!handler) {
        this.logger.warn(
          `inline mode: no handler registered for ${key}; payload dropped`,
        );
        return;
      }
      try {
        await handler(payload);
      } catch (err) {
        this.logger.error(
          `inline ${key} failed: ${(err as Error).message}`,
        );
      }
      return;
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not initialized`);
    }
    await queue.add(jobName, payload, options);
  }

  /**
   * Register an inline handler. Workers call this on init so that inline
   * mode preserves end-to-end behavior. No-op when not in inline mode.
   */
  registerInlineHandler<T>(
    queueName: QueueName,
    jobName: string,
    handler: (payload: T) => Promise<void>,
  ): void {
    if (!this.inline) return;
    this.inlineHandlers.set(
      `${queueName}:${jobName}`,
      handler as (p: unknown) => Promise<void>,
    );
  }

  /** Exposed for Bull Board mount + queue introspection. */
  getQueue(name: QueueName): Queue | undefined {
    return this.queues.get(name);
  }

  /** All queues — used by Bull Board adapter. */
  getAllQueues(): Queue[] {
    return [...this.queues.values()];
  }

  /** True when running in inline mode. Workers should skip subscribing. */
  isInline(): boolean {
    return this.inline;
  }

  /** Returns Redis connection options for Worker setup (null in inline mode). */
  getConnectionOptions(): ConnectionOptions | null {
    return this.connectionOptions;
  }
}
