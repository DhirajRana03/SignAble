import { FieldType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateFieldDto {
  @IsUUID()
  recipientId!: string;

  @IsInt()
  @Min(1)
  pageNumber!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  xPct!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  yPct!: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  widthPct!: number;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  heightPct!: number;

  @IsEnum(FieldType)
  fieldType!: FieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  /**
   * Palette tile label (e.g. "Name", "Email"). Metadata only — backend
   * doesn't validate it against tile names; the frontend uses it to
   * re-display the user's original choice on draft reload.
   */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsBoolean()
  readOnly?: boolean;

  /**
   * Type-specific config:
   * - DROPDOWN: { choices: string[] }
   * - CHECKBOX: { label?: string }
   * - TEXT: { placeholder?: string }
   * - others: null/omitted
   */
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class UpdateFieldDto {
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageNumber?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  xPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  yPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  widthPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  heightPct?: number;

  @IsOptional()
  @IsEnum(FieldType)
  fieldType?: FieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsBoolean()
  readOnly?: boolean;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class BulkSaveFieldsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CreateFieldDto)
  fields!: CreateFieldDto[];
}
