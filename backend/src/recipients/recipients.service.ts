import { Injectable } from '@nestjs/common';
import { Envelope, EnvelopeStatus, Recipient } from '@prisma/client';

import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
} from '../common/exceptions/domain.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRecipientDto,
  UpdateRecipientDto,
} from './dto/recipient.dto';

@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    envelopeId: string,
  ): Promise<Recipient[]> {
    await this.getOwnedEnvelope(userId, envelopeId);
    return this.prisma.recipient.findMany({
      where: { envelopeId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async add(
    userId: string,
    envelopeId: string,
    dto: CreateRecipientDto,
  ): Promise<Recipient> {
    const env = await this.getDraftEnvelope(userId, envelopeId);
    return this.prisma.recipient.create({
      data: {
        envelopeId: env.id,
        email: dto.email.toLowerCase(),
        name: dto.name,
        orderIndex: dto.orderIndex,
        role: dto.role ?? undefined,
      },
    });
  }

  async update(
    userId: string,
    envelopeId: string,
    recipientId: string,
    dto: UpdateRecipientDto,
  ): Promise<Recipient> {
    await this.getDraftEnvelope(userId, envelopeId);
    const recipient = await this.prisma.recipient.findUnique({
      where: { id: recipientId },
    });
    if (!recipient || recipient.envelopeId !== envelopeId) {
      throw new NotFoundError('Recipient', recipientId);
    }
    return this.prisma.recipient.update({
      where: { id: recipientId },
      data: {
        email: dto.email?.toLowerCase() ?? undefined,
        name: dto.name ?? undefined,
        orderIndex: dto.orderIndex ?? undefined,
        role: dto.role ?? undefined,
      },
    });
  }

  async delete(
    userId: string,
    envelopeId: string,
    recipientId: string,
  ): Promise<void> {
    await this.getDraftEnvelope(userId, envelopeId);
    const recipient = await this.prisma.recipient.findUnique({
      where: { id: recipientId },
    });
    if (!recipient || recipient.envelopeId !== envelopeId) {
      throw new NotFoundError('Recipient', recipientId);
    }
    // Cascade delete fields belonging to this recipient via FK ondelete.
    await this.prisma.recipient.delete({ where: { id: recipientId } });
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
      throw new InvalidStateTransitionError(
        env.status,
        'recipient_modification',
      );
    }
    return env;
  }
}
