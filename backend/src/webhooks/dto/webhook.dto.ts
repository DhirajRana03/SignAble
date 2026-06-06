import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

const EVENT_TYPES = [
  'ENVELOPE_CREATED',
  'ENVELOPE_SENT',
  'ENVELOPE_RESENT',
  'DOCUMENT_VIEWED',
  'RECIPIENT_SIGNED',
  'RECIPIENT_DECLINED',
  'ENVELOPE_COMPLETED',
  'ENVELOPE_VOIDED',
] as const;

export type WebhookEventType = (typeof EVENT_TYPES)[number];

export class CreateWebhookDto {
  @IsUrl({ require_tld: false, require_protocol: true })
  @MaxLength(2000)
  url!: string;

  @IsArray()
  @ArrayUnique()
  @IsEnum(EVENT_TYPES, { each: true })
  @IsOptional()
  events?: WebhookEventType[];
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(EVENT_TYPES, { each: true })
  events?: WebhookEventType[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;
}
