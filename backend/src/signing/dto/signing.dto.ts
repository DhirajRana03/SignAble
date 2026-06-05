import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SubmitSignatureDto {
  /**
   * Map of field id → value (base64 image for signature/initials, plain text for date/text).
   */
  @IsObject()
  fieldValues!: Record<string, string>;
}

export class SaveProgressDto {
  /**
   * Partial map of field id → draft value. Persisted without finalizing.
   * Used by the signer UI for debounced auto-save.
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

/**
 * DocuSign-style "Adopt Your Signature" payload. Captures the
 * recipient's chosen signature + initials representation once, then
 * reuses them across every SIGNATURE / INITIALS field in the envelope
 * (and across return visits, since persisted on the Recipient row).
 *
 * Both image fields accept base64 data URLs ("data:image/png;base64,…").
 * The size cap is generous enough for typed/drawn signatures (~1–2 MB
 * tops) but blocks malicious bloat payloads.
 */
export class AdoptSignatureDto {
  /** Base64 PNG data URL of the signature image. */
  @IsString()
  @MinLength(20)
  @MaxLength(5_000_000)
  signature!: string;

  /** Base64 PNG data URL of the initials image. */
  @IsString()
  @MinLength(20)
  @MaxLength(5_000_000)
  initials!: string;

  /**
   * Full name the recipient confirmed in the modal. Stored so the
   * adopted style preview can be reproduced server-side later (e.g.
   * audit trail rendering).
   */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  /** Two- or three-letter initials text. */
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  initialsText!: string;
}
