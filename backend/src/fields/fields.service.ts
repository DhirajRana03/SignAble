import { Injectable } from '@nestjs/common';
import {
  Envelope,
  EnvelopeStatus,
  Prisma,
  Recipient,
  SignatureField,
} from '@prisma/client';

import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '../common/exceptions/domain.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFieldDto,
  UpdateFieldDto,
} from './dto/field.dto';

@Injectable()
export class FieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    envelopeId: string,
  ): Promise<SignatureField[]> {
    await this.getOwnedEnvelope(userId, envelopeId);
    return this.prisma.signatureField.findMany({
      where: { envelopeId },
      orderBy: [{ pageNumber: 'asc' }, { yPct: 'asc' }],
    });
  }

  async add(
    userId: string,
    envelopeId: string,
    dto: CreateFieldDto,
  ): Promise<SignatureField> {
    const env = await this.getDraftEnvelope(userId, envelopeId);
    await this.assertRecipientInEnvelope(dto.recipientId, envelopeId);
    await this.assertPageWithinDocument(env.documentId, dto.pageNumber);

    return this.prisma.signatureField.create({
      data: {
        envelopeId,
        recipientId: dto.recipientId,
        pageNumber: dto.pageNumber,
        xPct: dto.xPct,
        yPct: dto.yPct,
        widthPct: dto.widthPct,
        heightPct: dto.heightPct,
        fieldType: dto.fieldType,
        required: dto.required ?? true,
      },
    });
  }

  async update(
    userId: string,
    envelopeId: string,
    fieldId: string,
    dto: UpdateFieldDto,
  ): Promise<SignatureField> {
    await this.getDraftEnvelope(userId, envelopeId);
    const field = await this.prisma.signatureField.findUnique({
      where: { id: fieldId },
    });
    if (!field || field.envelopeId !== envelopeId) {
      throw new NotFoundError('SignatureField', fieldId);
    }
    return this.prisma.signatureField.update({
      where: { id: fieldId },
      data: {
        xPct: dto.xPct ?? undefined,
        yPct: dto.yPct ?? undefined,
        widthPct: dto.widthPct ?? undefined,
        heightPct: dto.heightPct ?? undefined,
        required: dto.required ?? undefined,
      },
    });
  }

  async delete(
    userId: string,
    envelopeId: string,
    fieldId: string,
  ): Promise<void> {
    await this.getDraftEnvelope(userId, envelopeId);
    const field = await this.prisma.signatureField.findUnique({
      where: { id: fieldId },
    });
    if (!field || field.envelopeId !== envelopeId) {
      throw new NotFoundError('SignatureField', fieldId);
    }
    await this.prisma.signatureField.delete({ where: { id: fieldId } });
  }

  /**
   * Replace all fields atomically. Used by the field placer "Save" button.
   * Wrapped in a transaction so a failure leaves DB consistent.
   */
  async bulkSave(
    userId: string,
    envelopeId: string,
    fields: CreateFieldDto[],
  ): Promise<SignatureField[]> {
    const env = await this.getDraftEnvelope(userId, envelopeId);

    // Pre-validate everything before mutating
    const recipientIds = [...new Set(fields.map((f) => f.recipientId))];
    const recipients = await this.prisma.recipient.findMany({
      where: { id: { in: recipientIds }, envelopeId },
    });
    if (recipients.length !== recipientIds.length) {
      throw new ValidationError(
        'One or more recipientIds do not belong to this envelope',
      );
    }

    const doc = await this.prisma.document.findUnique({
      where: { id: env.documentId },
    });
    for (const f of fields) {
      if (!doc || f.pageNumber > doc.pageCount) {
        throw new ValidationError(
          `Page ${f.pageNumber} does not exist in document`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.signatureField.deleteMany({ where: { envelopeId } });
      const created: SignatureField[] = [];
      for (const f of fields) {
        const row = await tx.signatureField.create({
          data: {
            envelopeId,
            recipientId: f.recipientId,
            pageNumber: f.pageNumber,
            xPct: f.xPct,
            yPct: f.yPct,
            widthPct: f.widthPct,
            heightPct: f.heightPct,
            fieldType: f.fieldType,
            required: f.required ?? true,
          },
        });
        created.push(row);
      }
      return created;
    });
  }

  private async getOwnedEnvelope(
    userId: string,
    envelopeId: string,
  ): Promise<Envelope> {
    const env = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
    });
    if (!env) throw new NotFoundError('Envelope', envelopeId);
    if (env.userId !== userId) throw new ForbiddenError();
    return env;
  }

  private async getDraftEnvelope(
    userId: string,
    envelopeId: string,
  ): Promise<Envelope> {
    const env = await this.getOwnedEnvelope(userId, envelopeId);
    if (env.status !== EnvelopeStatus.DRAFT) {
      throw new InvalidStateTransitionError(env.status, 'field_modification');
    }
    return env;
  }

  private async assertRecipientInEnvelope(
    recipientId: string,
    envelopeId: string,
  ): Promise<Recipient> {
    const r = await this.prisma.recipient.findUnique({
      where: { id: recipientId },
    });
    if (!r || r.envelopeId !== envelopeId) {
      throw new NotFoundError('Recipient', recipientId);
    }
    return r;
  }

  private async assertPageWithinDocument(
    documentId: string,
    pageNumber: number,
  ): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc || pageNumber > doc.pageCount) {
      throw new ValidationError(
        `Page ${pageNumber} does not exist in document`,
      );
    }
  }
}
