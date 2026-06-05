import { createHash, createHmac, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Envelope,
  Recipient,
  SignatureField,
} from '@prisma/client';

/**
 * Inputs to the integrity hash. Order is canonical — any change to
 * field order, recipient order, or value order will produce a
 * different hash. Server treats this as opaque domain data, so the
 * canonical form must be stable across runs.
 */
interface IntegrityPayload {
  envelopeId: string;
  title: string;
  completedAt: string;
  recipients: Array<{
    id: string;
    email: string;
    name: string;
    orderIndex: number;
    status: string;
    signedAt: string | null;
  }>;
  fields: Array<{
    id: string;
    recipientId: string;
    pageNumber: number;
    fieldType: string;
    value: string;
    signedAt: string | null;
  }>;
}

export interface IntegrityResult {
  payload: IntegrityPayload;
  /** Canonical JSON of payload — what the hash digests over. */
  canonical: string;
  /** SHA-256 hex of canonical payload. */
  hash: string;
  /** HMAC-SHA256 hex of hash, signed with SIGNING_INTEGRITY_SECRET. */
  mac: string;
}

/**
 * Cryptographic integrity chain for completed envelopes.
 *
 * Workflow:
 *   1. Envelope completes → compute IntegrityPayload from DB state.
 *   2. SHA-256 over canonical payload → integrity hash.
 *   3. HMAC-SHA256(hash, secret) → tamper-evident MAC.
 *   4. Both persisted on envelope row + embedded in signed PDF metadata.
 *
 * Verification: caller recomputes hash from current DB state, then
 * recomputes MAC. Compare MAC byte-equal with stored MAC. Mismatch =
 * tampering OR secret rotation.
 *
 * Security note: secret must be stored outside the database. Anyone
 * with both DB access AND secret access can forge a valid chain. The
 * MAC protects against DB-only tampering and against modifications to
 * the signed PDF after completion.
 */
@Injectable()
export class IntegrityService {
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret =
      this.config.get<string>('signing.integritySecret') ??
      'dev-only-insecure';
  }

  /**
   * Build canonical payload + hash + MAC from envelope state.
   *
   * Inputs already loaded by caller (avoids extra Prisma round-trip
   * inside hot path). Recipients/fields ordered by (orderIndex, id) /
   * (pageNumber, id) for stability.
   */
  compute(
    envelope: Envelope,
    recipients: Recipient[],
    fields: SignatureField[],
  ): IntegrityResult {
    const payload: IntegrityPayload = {
      envelopeId: envelope.id,
      title: envelope.title,
      completedAt:
        envelope.completedAt?.toISOString() ?? new Date(0).toISOString(),
      recipients: [...recipients]
        .sort((a, b) =>
          a.orderIndex !== b.orderIndex
            ? a.orderIndex - b.orderIndex
            : a.id.localeCompare(b.id),
        )
        .map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          orderIndex: r.orderIndex,
          status: r.status,
          signedAt: r.signedAt?.toISOString() ?? null,
        })),
      fields: [...fields]
        .sort((a, b) =>
          a.pageNumber !== b.pageNumber
            ? a.pageNumber - b.pageNumber
            : a.id.localeCompare(b.id),
        )
        .map((f) => ({
          id: f.id,
          recipientId: f.recipientId,
          pageNumber: f.pageNumber,
          fieldType: f.fieldType,
          value: f.value ?? '',
          signedAt: f.signedAt?.toISOString() ?? null,
        })),
    };

    const canonical = stableStringify(payload);
    const hash = createHash('sha256').update(canonical, 'utf8').digest('hex');
    const mac = createHmac('sha256', this.secret)
      .update(hash, 'utf8')
      .digest('hex');

    return { payload, canonical, hash, mac };
  }

  /**
   * Recompute MAC for an existing hash + verify byte-equal against
   * stored MAC. Constant-time comparison resists timing attacks.
   */
  verifyMac(hash: string, storedMac: string): boolean {
    const expected = createHmac('sha256', this.secret)
      .update(hash, 'utf8')
      .digest();
    let provided: Buffer;
    try {
      provided = Buffer.from(storedMac, 'hex');
    } catch {
      return false;
    }
    if (provided.length !== expected.length) return false;
    return timingSafeEqual(expected, provided);
  }
}

/**
 * Deterministic JSON.stringify that sorts object keys. Required so
 * `compute()` always produces identical canonical bytes for identical
 * logical input — different key orderings would silently break the
 * verification chain.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) =>
      `${JSON.stringify(k)}:${stableStringify(
        (value as Record<string, unknown>)[k],
      )}`,
  );
  return `{${parts.join(',')}}`;
}
