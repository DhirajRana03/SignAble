import { Injectable } from '@nestjs/common';
import {
  Envelope,
  EnvelopeStatus,
  FieldType,
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

/**
 * Validate type-specific options. DROPDOWN must have a non-empty choices
 * array; CHECKBOX accepts optional label; SIGNATURE/INITIALS/DATE/TEXT
 * forbid options.
 */
function validateOptions(
  fieldType: FieldType,
  options: Record<string, unknown> | null | undefined,
): void {
  if (fieldType === FieldType.DROPDOWN) {
    const choices = options?.choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new ValidationError(
        'DROPDOWN fields require options.choices: non-empty string array',
      );
    }
    if (!choices.every((c) => typeof c === 'string' && c.trim().length > 0)) {
      throw new ValidationError(
        'DROPDOWN options.choices must contain only non-empty strings',
      );
    }
    return;
  }
  if (fieldType === FieldType.CHECKBOX) {
    if (options?.label !== undefined && typeof options.label !== 'string') {
      throw new ValidationError('CHECKBOX options.label must be a string');
    }
    return;
  }
  if (fieldType === FieldType.TEXT) {
    if (
      options?.placeholder !== undefined &&
      typeof options.placeholder !== 'string'
    ) {
      throw new ValidationError('TEXT options.placeholder must be a string');
    }
    return;
  }
  if (options !== undefined && options !== null) {
    throw new ValidationError(
      `Field type ${fieldType} does not accept options`,
    );
  }
}

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
    validateOptions(dto.fieldType, dto.options);

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
        label: dto.label ?? null,
        readOnly: dto.readOnly ?? false,
        options: (dto.options ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Partial update for auto-save and drag-reposition. Any subset of fields
   * may be provided. When fieldType or options change together they're
   * validated as a pair.
   */
  async update(
    userId: string,
    envelopeId: string,
    fieldId: string,
    dto: UpdateFieldDto,
  ): Promise<SignatureField> {
    const env = await this.getDraftEnvelope(userId, envelopeId);
    const field = await this.prisma.signatureField.findUnique({
      where: { id: fieldId },
    });
    if (!field || field.envelopeId !== envelopeId) {
      throw new NotFoundError('SignatureField', fieldId);
    }

    if (dto.recipientId !== undefined) {
      await this.assertRecipientInEnvelope(dto.recipientId, envelopeId);
    }
    if (dto.pageNumber !== undefined) {
      await this.assertPageWithinDocument(env.documentId, dto.pageNumber);
    }

    const nextType = dto.fieldType ?? field.fieldType;
    // If type changed but options not provided, drop existing options
    // unless the new type still accepts them.
    const nextOptions =
      dto.options !== undefined
        ? dto.options
        : dto.fieldType !== undefined && dto.fieldType !== field.fieldType
          ? null
          : undefined;
    if (nextOptions !== undefined) {
      validateOptions(
        nextType,
        nextOptions as Record<string, unknown> | null,
      );
    }

    return this.prisma.signatureField.update({
      where: { id: fieldId },
      data: {
        recipientId: dto.recipientId ?? undefined,
        pageNumber: dto.pageNumber ?? undefined,
        xPct: dto.xPct ?? undefined,
        yPct: dto.yPct ?? undefined,
        widthPct: dto.widthPct ?? undefined,
        heightPct: dto.heightPct ?? undefined,
        fieldType: dto.fieldType ?? undefined,
        required: dto.required ?? undefined,
        label: dto.label ?? undefined,
        readOnly: dto.readOnly ?? undefined,
        options:
          nextOptions === undefined
            ? undefined
            : nextOptions === null
              ? Prisma.JsonNull
              : (nextOptions as Prisma.InputJsonValue),
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
      validateOptions(f.fieldType, f.options);
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
            label: f.label ?? null,
            readOnly: f.readOnly ?? false,
            options: (f.options ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
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
