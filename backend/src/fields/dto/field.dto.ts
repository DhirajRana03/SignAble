import { FieldType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
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
}

export class UpdateFieldDto {
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
  @IsBoolean()
  required?: boolean;
}

export class BulkSaveFieldsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CreateFieldDto)
  fields!: CreateFieldDto[];
}
