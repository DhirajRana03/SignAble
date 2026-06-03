import { Test, TestingModule } from '@nestjs/testing';
import {
  EnvelopeStatus,
  RecipientStatus,
  SigningOrder,
} from '@prisma/client';

import {
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '../common/exceptions/domain.exceptions';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessorService } from '../processor/processor.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queues/queue.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SigningService } from './signing.service';

describe('SigningService', () => {
  let service: SigningService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      recipient: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      envelope: { findUnique: jest.fn(), update: jest.fn() },
      document: { findUnique: jest.fn() },
      signatureField: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      auditEvent: { create: jest.fn() },
    };
    notifications = {
      sendSigningRequest: jest.fn(),
      sendCompletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SigningService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { load: jest.fn(), saveSigned: jest.fn(), pageUrls: jest.fn(() => []) } },
        { provide: ProcessorService, useValue: { processDocument: jest.fn(), applySignatures: jest.fn() } },
        { provide: NotificationsService, useValue: notifications },
        {
          provide: WebhooksService,
          useValue: { fanOut: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: QueueService,
          useValue: { enqueue: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(SigningService);
  });

  describe('getForSigner', () => {
    it('throws NotFoundError when token invalid', async () => {
      prisma.recipient.findUnique.mockResolvedValue(null);
      await expect(service.getForSigner('bad-token')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('rejects already-signed recipient', async () => {
      prisma.recipient.findUnique.mockResolvedValue({
        id: 'r1',
        envelopeId: 'env-1',
        status: RecipientStatus.SIGNED,
      });
      await expect(service.getForSigner('t')).rejects.toBeInstanceOf(
        InvalidStateTransitionError,
      );
    });

    it('rejects when envelope voided', async () => {
      prisma.recipient.findUnique.mockResolvedValue({
        id: 'r1',
        envelopeId: 'env-1',
        status: RecipientStatus.PENDING,
        orderIndex: 0,
      });
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        status: EnvelopeStatus.VOIDED,
      });

      await expect(service.getForSigner('t')).rejects.toBeInstanceOf(
        InvalidStateTransitionError,
      );
    });

    it('blocks signer waiting on earlier recipient in SEQUENTIAL', async () => {
      prisma.recipient.findUnique.mockResolvedValue({
        id: 'r2',
        envelopeId: 'env-1',
        orderIndex: 1,
        status: RecipientStatus.PENDING,
      });
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        status: EnvelopeStatus.SENT,
        signingOrder: SigningOrder.SEQUENTIAL,
      });
      prisma.recipient.findFirst.mockResolvedValue({
        id: 'r1',
        orderIndex: 0,
        status: RecipientStatus.PENDING,
      });

      await expect(service.getForSigner('t')).rejects.toBeInstanceOf(
        InvalidStateTransitionError,
      );
    });
  });

  describe('submit — validation', () => {
    it('rejects submit missing required field values', async () => {
      prisma.recipient.findUnique.mockResolvedValue({
        id: 'r1',
        envelopeId: 'env-1',
        status: RecipientStatus.PENDING,
      });
      prisma.signatureField.findMany.mockResolvedValueOnce([
        { id: 'f1', required: true },
        { id: 'f2', required: true },
      ]);

      await expect(
        service.submit('t', { f1: 'data:image/png;base64,xxx' }, '127.0.0.1'),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
