import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SubmitSignatureDto {
  /**
   * Map of field id → value (base64 image for signature/initials, plain text for date/text).
   */
  @IsObject()
  fieldValues!: Record<string, string>;
}

export class DeclineDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
