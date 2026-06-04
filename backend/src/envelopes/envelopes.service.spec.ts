import { Test, TestingModule } from '@nestjs/testing';
import { AuditEventType, EnvelopeStatus, SigningOrder } from '@prisma/client';

import {
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '../common/exceptions/domain.exceptions';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queues/queue.service';
import { StorageService } from '../storage/storage.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { EnvelopesService } from './envelopes.service';

describe('EnvelopesService', () => {
  let service: EnvelopesService;
  let prisma: any;

  const USER_ID = 'user-1';
  const USER_EMAIL = 'user@test.dev';

  beforeEach(async () => {
    prisma = {
      envelope: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      document: { findUnique: jest.fn() },
      recipient: { findMany: jest.fn() },
      auditEvent: { create: jest.fn(), findMany: jest.fn() },
      envelopeDocument: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
    prisma.envelope.delete = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvelopesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { load: jest.fn() } },
        {
          provide: NotificationsService,
          useValue: { sendSigningRequest: jest.fn() },
        },
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

    service = module.get(EnvelopesService);
  });

  describe('create', () => {
    it('throws NotFoundError when document missing', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(
        service.create(USER_ID, USER_EMAIL, {
          documentId: 'd1',
          title: 'X',
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects document not in READY status', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'd1',
        userId: USER_ID,
        status: 'PENDING',
      });
      await expect(
        service.create(USER_ID, USER_EMAIL, {
          documentId: 'd1',
          title: 'X',
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('creates envelope + audit event when document READY', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'd1',
        userId: USER_ID,
        status: 'READY',
      });
      prisma.envelope.create.mockResolvedValue({
        id: 'env-1',
        title: 'X',
        status: 'DRAFT',
      });

      const result = await service.create(USER_ID, USER_EMAIL, {
        documentId: 'd1',
        title: 'X',
      });

      expect(result.id).toBe('env-1');
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            envelopeId: 'env-1',
            eventType: 'ENVELOPE_CREATED',
          }),
        }),
      );
    });
  });

  describe('send', () => {
    const mockBg = { addTask: jest.fn() } as any;

    it('rejects transition from COMPLETED', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
        status: EnvelopeStatus.COMPLETED,
      });
      prisma.recipient.findMany.mockResolvedValue([]);

      await expect(
        service.send(USER_ID, USER_EMAIL, 'env-1'),
      ).rejects.toThrow();
    });

    it('rejects send with no recipients', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
        status: EnvelopeStatus.DRAFT,
        signingOrder: SigningOrder.SEQUENTIAL,
      });
      prisma.recipient.findMany.mockResolvedValue([]);

      await expect(
        service.send(USER_ID, USER_EMAIL, 'env-1'),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('rejects when recipient has no required fields', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
        status: EnvelopeStatus.DRAFT,
        signingOrder: SigningOrder.SEQUENTIAL,
      });
      prisma.recipient.findMany.mockResolvedValue([
        { id: 'r1', email: 'a@b.com', fields: [] },
      ]);

      await expect(
        service.send(USER_ID, USER_EMAIL, 'env-1'),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('transitions DRAFT → SENT when recipients + required fields present', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
        status: EnvelopeStatus.DRAFT,
        signingOrder: SigningOrder.SEQUENTIAL,
        title: 'X',
        message: null,
        recipients: [{ id: 'r1', email: 'a@b.com', name: 'A', signingToken: 't' }],
      });
      prisma.recipient.findMany.mockResolvedValue([
        {
          id: 'r1',
          email: 'a@b.com',
          fields: [{ required: true }],
        },
      ]);
      prisma.envelope.update.mockResolvedValue({
        id: 'env-1',
        status: EnvelopeStatus.SENT,
      });

      const result = await service.send(USER_ID, USER_EMAIL, 'env-1');
      expect(result.status).toBe(EnvelopeStatus.SENT);
      expect(prisma.envelope.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: EnvelopeStatus.SENT }),
        }),
      );
    });
  });

  describe('getAudit (pagination + filter)', () => {
    it('returns items with nextCursor when more rows exist', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
      });
      // Service requests `take: limit + 1` to detect more rows
      const rows = Array.from({ length: 51 }, (_, i) => ({
        id: `evt-${i}`,
        envelopeId: 'env-1',
        eventType: AuditEventType.DOCUMENT_VIEWED,
      }));
      prisma.auditEvent.findMany.mockResolvedValue(rows);

      const result = await service.getAudit(USER_ID, 'env-1');

      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe('evt-49');
    });

    it('returns nextCursor=null when no more rows', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
      });
      prisma.auditEvent.findMany.mockResolvedValue([
        { id: 'evt-0', envelopeId: 'env-1' },
      ]);

      const result = await service.getAudit(USER_ID, 'env-1');

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('passes eventType filter to prisma query', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
      });
      prisma.auditEvent.findMany.mockResolvedValue([]);

      await service.getAudit(USER_ID, 'env-1', {
        eventType: AuditEventType.RECIPIENT_SIGNED,
        limit: 10,
      });

      expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            envelopeId: 'env-1',
            eventType: AuditEventType.RECIPIENT_SIGNED,
          },
          take: 11,
        }),
      );
    });
  });

  describe('void', () => {
    it('rejects void of already-voided envelope', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
        status: EnvelopeStatus.VOIDED,
      });

      await expect(
        service.void(USER_ID, USER_EMAIL, 'env-1', 'reason'),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);
    });

    it('transitions DRAFT → VOIDED', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
        status: EnvelopeStatus.DRAFT,
      });
      prisma.envelope.update.mockResolvedValue({
        id: 'env-1',
        status: EnvelopeStatus.VOIDED,
      });

      const result = await service.void(USER_ID, USER_EMAIL, 'env-1', 'r');
      expect(result.status).toBe(EnvelopeStatus.VOIDED);
    });
  });

  describe('attachDocument', () => {
    const baseEnv = {
      id: 'env-1',
      userId: USER_ID,
      documentId: 'doc-primary',
      status: EnvelopeStatus.DRAFT,
    };

    it('rejects on non-DRAFT envelope', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        ...baseEnv,
        status: EnvelopeStatus.SENT,
      });
      await expect(
        service.attachDocument(USER_ID, 'env-1', 'doc-2'),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);
    });

    it('rejects when document is envelope primary', async () => {
      prisma.envelope.findUnique.mockResolvedValue(baseEnv);
      await expect(
        service.attachDocument(USER_ID, 'env-1', 'doc-primary'),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('rejects unprocessed document', async () => {
      prisma.envelope.findUnique.mockResolvedValue(baseEnv);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-2',
        userId: USER_ID,
        status: 'PROCESSING',
      });
      await expect(
        service.attachDocument(USER_ID, 'env-1', 'doc-2'),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('rejects duplicate attachment', async () => {
      prisma.envelope.findUnique.mockResolvedValue(baseEnv);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-2',
        userId: USER_ID,
        status: 'READY',
      });
      prisma.envelopeDocument.findUnique.mockResolvedValue({
        envelopeId: 'env-1',
        documentId: 'doc-2',
      });
      await expect(
        service.attachDocument(USER_ID, 'env-1', 'doc-2'),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('creates attachment with sequential orderIndex', async () => {
      prisma.envelope.findUnique.mockResolvedValue(baseEnv);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-2',
        userId: USER_ID,
        status: 'READY',
      });
      prisma.envelopeDocument.findUnique.mockResolvedValue(null);
      prisma.envelopeDocument.count.mockResolvedValue(2);
      prisma.envelopeDocument.create.mockResolvedValue({
        envelopeId: 'env-1',
        documentId: 'doc-2',
        orderIndex: 2,
      });

      const result = await service.attachDocument(USER_ID, 'env-1', 'doc-2');

      expect(prisma.envelopeDocument.create).toHaveBeenCalledWith({
        data: { envelopeId: 'env-1', documentId: 'doc-2', orderIndex: 2 },
      });
      expect(result.orderIndex).toBe(2);
    });
  });

  describe('deleteDraft', () => {
    it('deletes DRAFT envelope', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
        status: EnvelopeStatus.DRAFT,
      });
      (prisma.envelope.delete as jest.Mock).mockResolvedValue({});

      await service.deleteDraft(USER_ID, 'env-1');

      expect(prisma.envelope.delete).toHaveBeenCalledWith({
        where: { id: 'env-1' },
      });
    });

    it('rejects non-DRAFT envelope', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        id: 'env-1',
        userId: USER_ID,
        status: EnvelopeStatus.SENT,
      });

      await expect(
        service.deleteDraft(USER_ID, 'env-1'),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);
      expect(prisma.envelope.delete).not.toHaveBeenCalled();
    });
  });
});
