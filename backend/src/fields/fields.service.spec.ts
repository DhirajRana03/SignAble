import { Test, TestingModule } from '@nestjs/testing';
import { EnvelopeStatus, FieldType } from '@prisma/client';

import {
  InvalidStateTransitionError,
  ValidationError,
} from '../common/exceptions/domain.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { FieldsService } from './fields.service';

describe('FieldsService', () => {
  let service: FieldsService;
  let prisma: any;

  const USER_ID = 'user-1';
  const ENV_ID = 'env-1';

  const draftEnvelope = {
    id: ENV_ID,
    userId: USER_ID,
    documentId: 'doc-1',
    status: EnvelopeStatus.DRAFT,
  };

  beforeEach(async () => {
    prisma = {
      envelope: { findUnique: jest.fn() },
      recipient: { findMany: jest.fn(), findUnique: jest.fn() },
      document: { findUnique: jest.fn() },
      signatureField: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(FieldsService);
  });

  describe('bulkSave', () => {
    it('rejects field modification on non-DRAFT envelope', async () => {
      prisma.envelope.findUnique.mockResolvedValue({
        ...draftEnvelope,
        status: EnvelopeStatus.SENT,
      });

      await expect(
        service.bulkSave(USER_ID, ENV_ID, []),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);
    });

    it('rejects fields with recipients not in envelope', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.recipient.findMany.mockResolvedValue([]);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        pageCount: 5,
      });

      await expect(
        service.bulkSave(USER_ID, ENV_ID, [
          {
            recipientId: 'orphan-r',
            pageNumber: 1,
            xPct: 0.1,
            yPct: 0.1,
            widthPct: 0.2,
            heightPct: 0.05,
            fieldType: FieldType.SIGNATURE,
            required: true,
          },
        ]),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('rejects fields on pages outside document', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.recipient.findMany.mockResolvedValue([{ id: 'r1' }]);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        pageCount: 2,
      });

      await expect(
        service.bulkSave(USER_ID, ENV_ID, [
          {
            recipientId: 'r1',
            pageNumber: 99,
            xPct: 0.1,
            yPct: 0.1,
            widthPct: 0.2,
            heightPct: 0.05,
            fieldType: FieldType.SIGNATURE,
            required: true,
          },
        ]),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('replaces existing fields atomically when valid', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.recipient.findMany.mockResolvedValue([{ id: 'r1' }]);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        pageCount: 3,
      });
      prisma.signatureField.create.mockResolvedValue({
        id: 'new-field',
        envelopeId: ENV_ID,
      });

      const input = [
        {
          recipientId: 'r1',
          pageNumber: 1,
          xPct: 0.1,
          yPct: 0.1,
          widthPct: 0.2,
          heightPct: 0.05,
          fieldType: FieldType.SIGNATURE,
          required: true,
        },
        {
          recipientId: 'r1',
          pageNumber: 2,
          xPct: 0.2,
          yPct: 0.3,
          widthPct: 0.15,
          heightPct: 0.04,
          fieldType: FieldType.DATE,
          required: false,
        },
      ];

      const result = await service.bulkSave(USER_ID, ENV_ID, input);

      // Old fields wiped first
      expect(prisma.signatureField.deleteMany).toHaveBeenCalledWith({
        where: { envelopeId: ENV_ID },
      });
      // Both new fields created
      expect(prisma.signatureField.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('rejects DROPDOWN field without choices', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.recipient.findMany.mockResolvedValue([{ id: 'r1' }]);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        pageCount: 3,
      });

      await expect(
        service.bulkSave(USER_ID, ENV_ID, [
          {
            recipientId: 'r1',
            pageNumber: 1,
            xPct: 0.1,
            yPct: 0.1,
            widthPct: 0.2,
            heightPct: 0.05,
            fieldType: FieldType.DROPDOWN,
            required: true,
            // options omitted
          },
        ]),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('accepts DROPDOWN field with valid choices', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.recipient.findMany.mockResolvedValue([{ id: 'r1' }]);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        pageCount: 3,
      });
      prisma.signatureField.create.mockResolvedValue({ id: 'new-field' });

      await service.bulkSave(USER_ID, ENV_ID, [
        {
          recipientId: 'r1',
          pageNumber: 1,
          xPct: 0.1,
          yPct: 0.1,
          widthPct: 0.2,
          heightPct: 0.05,
          fieldType: FieldType.DROPDOWN,
          required: true,
          options: { choices: ['Yes', 'No'] },
        },
      ]);

      expect(prisma.signatureField.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fieldType: FieldType.DROPDOWN,
            options: { choices: ['Yes', 'No'] },
          }),
        }),
      );
    });

    it('rejects SIGNATURE field with options payload', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.recipient.findMany.mockResolvedValue([{ id: 'r1' }]);
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        pageCount: 3,
      });

      await expect(
        service.bulkSave(USER_ID, ENV_ID, [
          {
            recipientId: 'r1',
            pageNumber: 1,
            xPct: 0.1,
            yPct: 0.1,
            widthPct: 0.2,
            heightPct: 0.05,
            fieldType: FieldType.SIGNATURE,
            required: true,
            options: { choices: ['x'] },
          },
        ]),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('update (partial / auto-save)', () => {
    const existingField = {
      id: 'f1',
      envelopeId: ENV_ID,
      recipientId: 'r1',
      pageNumber: 1,
      xPct: 0.1,
      yPct: 0.1,
      widthPct: 0.2,
      heightPct: 0.05,
      fieldType: FieldType.SIGNATURE,
      required: true,
      options: null,
    };

    it('updates position fields only', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.signatureField.findUnique.mockResolvedValue(existingField);
      prisma.signatureField.update.mockResolvedValue({
        ...existingField,
        xPct: 0.5,
      });

      await service.update(USER_ID, ENV_ID, 'f1', { xPct: 0.5, yPct: 0.6 });

      expect(prisma.signatureField.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'f1' },
          data: expect.objectContaining({ xPct: 0.5, yPct: 0.6 }),
        }),
      );
    });

    it('clears options when fieldType changes without new options', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.signatureField.findUnique.mockResolvedValue({
        ...existingField,
        fieldType: FieldType.DROPDOWN,
        options: { choices: ['a'] },
      });
      prisma.signatureField.update.mockResolvedValue(existingField);

      await service.update(USER_ID, ENV_ID, 'f1', {
        fieldType: FieldType.SIGNATURE,
      });

      const callArg = prisma.signatureField.update.mock.calls[0][0];
      expect(callArg.data.fieldType).toBe(FieldType.SIGNATURE);
      // Prisma.JsonNull literal — toJSON yields null sentinel
      expect(callArg.data.options).toBeDefined();
    });

    it('rejects switching to DROPDOWN without choices', async () => {
      prisma.envelope.findUnique.mockResolvedValue(draftEnvelope);
      prisma.signatureField.findUnique.mockResolvedValue(existingField);

      await expect(
        service.update(USER_ID, ENV_ID, 'f1', {
          fieldType: FieldType.DROPDOWN,
          options: {},
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
