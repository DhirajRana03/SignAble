import { ConfigService } from '@nestjs/config';

import { QUEUE_NAMES } from './queue-names';
import { QueueService } from './queue.service';

/**
 * Inline mode tests — exercise dispatcher without requiring Redis.
 */
describe('QueueService (inline mode)', () => {
  let service: QueueService;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'redis.inline': true,
          'redis.host': 'localhost',
          'redis.port': 6379,
          'redis.password': '',
          'redis.db': 0,
          'bull.completedRetention': 500,
          'bull.failedRetention': 5000,
        };
        return values[key];
      }),
    } as unknown as ConfigService;
    service = new QueueService(config);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('isInline reports true when configured', () => {
    expect(service.isInline()).toBe(true);
  });

  it('getConnectionOptions returns null in inline mode', () => {
    expect(service.getConnectionOptions()).toBeNull();
  });

  it('enqueue runs registered inline handler with payload', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    service.registerInlineHandler(QUEUE_NAMES.DOCUMENTS, 'process-doc', handler);

    await service.enqueue(QUEUE_NAMES.DOCUMENTS, 'process-doc', { x: 1 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ x: 1 });
  });

  it('enqueue drops payload silently when no handler registered', async () => {
    await expect(
      service.enqueue(QUEUE_NAMES.DOCUMENTS, 'nope', { x: 1 }),
    ).resolves.toBeUndefined();
  });

  it('inline handler errors are swallowed (not surfaced to producer)', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('boom'));
    service.registerInlineHandler(
      QUEUE_NAMES.WEBHOOKS,
      'deliver-webhook',
      handler,
    );

    await expect(
      service.enqueue(QUEUE_NAMES.WEBHOOKS, 'deliver-webhook', {}),
    ).resolves.toBeUndefined();
  });
});
