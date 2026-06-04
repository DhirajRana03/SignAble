import { SigningOrder } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEnvelopeDto {
  @IsUUID()
  documentId!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsEnum(SigningOrder)
  @IsOptional()
  signingOrder?: SigningOrder;
}

export class UpdateEnvelopeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsEnum(SigningOrder)
  signingOrder?: SigningOrder;

  /**
   * Swap envelope primary document. Allowed only on DRAFT envelopes;
   * must point to a READY document owned by the same user.
   */
  @IsOptional()
  @IsUUID()
  documentId?: string;
}

export class VoidEnvelopeDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
