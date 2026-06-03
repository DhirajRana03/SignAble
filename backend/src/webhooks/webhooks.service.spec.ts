import { Test, TestingModule } from '@nestjs/testing';

import {
  ForbiddenError,
  NotFoundError,
} from '../common/exceptions/domain.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: any;

  const USER_ID = 'user-1';

  beforeEach(async () => {
    prisma = {
      webhookSubscription: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      webhookDelivery: { create: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WebhooksService);
  });

  describe('create', () => {
    it('generates secret + stores subscription', async () => {
      prisma.webhookSubscription.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'wh-1', ...data }),
      );

      const result = await service.create(USER_ID, {
        url: 'https://example.com/hook',
      });

      expect(result.id).toBe('wh-1');
      expect(prisma.webhookSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            url: 'https://example.com/hook',
            secret: expect.stringMatching(/^whsec_[a-f0-9]+$/),
          }),
        }),
      );
    });

    it('defaults events to empty array (subscribes to all)', async () => {
      prisma.webhookSubscription.create.mockImplementation(({ data }: any) =>
        Promise.resolve(data),
      );
      await service.create(USER_ID, { url: 'https://example.com' });
      expect(prisma.webhookSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ events: [] }),
        }),
      );
    });
  });

  describe('get', () => {
    it('throws NotFoundError when subscription missing', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue(null);
      await expect(service.get(USER_ID, 'missing')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('throws ForbiddenError when subscription owned by another user', async () => {
      prisma.webhookSubscription.findUnique.mockResolvedValue({
        id: 'wh-1',
        userId: 'other',
      });
      await expect(service.get(USER_ID, 'wh-1')).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('fanOut', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('no-op when no active subscriptions match', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      await service.fanOut(USER_ID, 'ENVELOPE_SENT', 'env-1');
      expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
    });

    it('queries subscriptions for matching event or empty events array', async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([]);
      await service.fanOut(USER_ID, 'ENVELOPE_COMPLETED', 'env-1');
      expect(prisma.webhookSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            isActive: true,
            OR: [
              { events: { isEmpty: true } },
              { events: { has: 'ENVELOPE_COMPLETED' } },
            ],
          }),
        }),
      );
    });
  });
});
