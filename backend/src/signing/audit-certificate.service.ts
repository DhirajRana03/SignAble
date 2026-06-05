import { Injectable, Logger } from '@nestjs/common';
import type {
  AuditEvent,
  Envelope,
  Recipient,
  SignatureField,
} from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import type { IntegrityResult } from './integrity.service';

/**
 * Generates a tamper-evident audit certificate PDF for completed
 * envelopes. The cert lists:
 *   - Envelope identity (id, title, completed time)
 *   - Integrity hash + HMAC for cryptographic anchoring
 *   - Every recipient with status, IP, timestamps
 *   - Every field with placement + signed value summary
 *   - Full audit event log
 *
 * Output is a standalone PDF stored alongside the signed PDF. Public
 * verification endpoint consumes the same data; cert serves as the
 * human-readable export.
 */
@Injectable()
export class AuditCertificateService {
  private readonly logger = new Logger(AuditCertificateService.name);

  async generate(args: {
    envelope: Envelope;
    recipients: Recipient[];
    fields: SignatureField[];
    events: AuditEvent[];
    integrity: IntegrityResult;
  }): Promise<Buffer> {
    const { envelope, recipients, fields, events, integrity } = args;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Embed integrity metadata so a downstream parser can extract the
    // hash without re-parsing rendered text.
    pdfDoc.setTitle(`Audit Certificate · ${envelope.title}`);
    pdfDoc.setAuthor('SignAble');
    pdfDoc.setSubject(`Envelope ${envelope.id}`);
    pdfDoc.setProducer(`SignAble integrity=${integrity.hash}`);
    pdfDoc.setKeywords([
      `envelopeId:${envelope.id}`,
      `integrityHash:${integrity.hash}`,
      `integrityMac:${integrity.mac}`,
    ]);

    const writer = new PageWriter(pdfDoc, { font, fontBold, fontMono });

    // ── Header ────────────────────────────────────────────────────
    writer.title('Audit Certificate');
    writer.muted(
      `Issued ${new Date().toISOString()} · SignAble`,
    );
    writer.gap(12);

    writer.section('Envelope');
    writer.kv('ID', envelope.id);
    writer.kv('Title', envelope.title);
    writer.kv('Status', envelope.status);
    writer.kv(
      'Completed',
      envelope.completedAt?.toISOString() ?? '—',
    );
    writer.gap(8);

    // ── Integrity chain ───────────────────────────────────────────
    writer.section('Cryptographic Integrity');
    writer.kvMono('SHA-256', integrity.hash);
    writer.kvMono('HMAC-SHA256', integrity.mac);
    writer.muted(
      'Hash digests envelope state at completion. MAC binds hash to a server-held secret.',
    );
    writer.muted(
      'Recompute via GET /verify/' + envelope.id + ' to validate.',
    );
    writer.gap(8);

    // ── Recipients ────────────────────────────────────────────────
    writer.section('Recipients');
    for (const r of recipients) {
      writer.text(
        `${String(r.orderIndex + 1).padStart(2, '0')}. ${r.name} <${r.email}>`,
        { bold: true },
      );
      writer.muted(
        `   role=${r.role} · status=${r.status} · signed=${r.signedAt?.toISOString() ?? '—'}`,
      );
    }
    writer.gap(8);

    // ── Fields ────────────────────────────────────────────────────
    writer.section(`Signature Fields (${fields.length})`);
    for (const f of fields) {
      const placement = `pg${f.pageNumber} · x=${f.xPct.toFixed(3)} y=${f.yPct.toFixed(3)}`;
      const signed = f.signedAt
        ? f.signedAt.toISOString()
        : 'unsigned';
      writer.text(`${f.fieldType} · ${placement}`, { bold: true });
      writer.muted(
        `   recipient=${shortId(f.recipientId)} · signed=${signed} · valueLen=${(f.value ?? '').length}`,
      );
    }
    writer.gap(8);

    // ── Event log ─────────────────────────────────────────────────
    writer.section(`Event Log (${events.length})`);
    for (const e of events) {
      const reason = readReason(e.metadata);
      writer.text(
        `${e.createdAt.toISOString()} · ${e.eventType}`,
        { bold: true },
      );
      writer.muted(
        `   actor=${e.actorEmail}${e.ipAddress ? ` · ip=${e.ipAddress}` : ''}${reason ? ` · reason="${reason}"` : ''}`,
      );
    }

    writer.flush();
    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  /**
   * Embed the integrity hash + MAC into the signed PDF metadata so
   * verifiers can extract it from the file alone. pdf-lib writes
   * the Info dict; consumers read it via standard PDF metadata APIs.
   */
  async embedIntegrityIntoSignedPdf(
    signedPdf: Buffer,
    integrity: IntegrityResult,
    envelopeId: string,
  ): Promise<Buffer> {
    try {
      const doc = await PDFDocument.load(signedPdf);
      doc.setProducer(`SignAble integrity=${integrity.hash}`);
      doc.setKeywords([
        `envelopeId:${envelopeId}`,
        `integrityHash:${integrity.hash}`,
        `integrityMac:${integrity.mac}`,
      ]);
      const out = await doc.save();
      return Buffer.from(out);
    } catch (err) {
      this.logger.warn(
        `embedIntegrityIntoSignedPdf failed for ${envelopeId}: ${(err as Error).message}`,
      );
      // Return original — embedding is best-effort; DB still holds chain.
      return signedPdf;
    }
  }
}

/* ────────────────────── PDF layout helper ────────────────────── */

interface Fonts {
  font: ReturnType<PDFDocument['embedFont']> extends Promise<infer T>
    ? T
    : never;
  fontBold: ReturnType<PDFDocument['embedFont']> extends Promise<infer T>
    ? T
    : never;
  fontMono: ReturnType<PDFDocument['embedFont']> extends Promise<infer T>
    ? T
    : never;
}

/**
 * Minimal flow-layout writer. Auto-creates new pages when content
 * exceeds bottom margin. Avoids hauling a full PDF layout engine for
 * a single document type.
 */
class PageWriter {
  private page: ReturnType<PDFDocument['addPage']>;
  private y = 740;
  private readonly margin = 50;
  private readonly lineH = 13;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: Fonts,
  ) {
    this.page = this.doc.addPage([612, 792]);
  }

  private ensure(spaceNeeded: number): void {
    if (this.y - spaceNeeded < this.margin) {
      this.page = this.doc.addPage([612, 792]);
      this.y = 740;
    }
  }

  title(text: string): void {
    this.ensure(36);
    this.page.drawText(text, {
      x: this.margin,
      y: this.y,
      size: 22,
      font: this.fonts.fontBold,
      color: rgb(0.08, 0.1, 0.18),
    });
    this.y -= 28;
  }

  section(text: string): void {
    this.ensure(28);
    this.y -= 6;
    this.page.drawText(text.toUpperCase(), {
      x: this.margin,
      y: this.y,
      size: 9,
      font: this.fonts.fontBold,
      color: rgb(0.35, 0.4, 0.5),
    });
    this.y -= this.lineH;
    this.page.drawLine({
      start: { x: this.margin, y: this.y + 4 },
      end: { x: 562, y: this.y + 4 },
      thickness: 0.5,
      color: rgb(0.85, 0.87, 0.92),
    });
    this.y -= 6;
  }

  text(s: string, opts: { bold?: boolean; mono?: boolean } = {}): void {
    this.ensure(this.lineH);
    const font = opts.mono
      ? this.fonts.fontMono
      : opts.bold
        ? this.fonts.fontBold
        : this.fonts.font;
    this.page.drawText(truncate(s, 92), {
      x: this.margin,
      y: this.y,
      size: 10,
      font,
      color: rgb(0.1, 0.12, 0.2),
    });
    this.y -= this.lineH;
  }

  muted(s: string): void {
    this.ensure(this.lineH);
    this.page.drawText(truncate(s, 100), {
      x: this.margin,
      y: this.y,
      size: 9,
      font: this.fonts.font,
      color: rgb(0.45, 0.5, 0.6),
    });
    this.y -= this.lineH;
  }

  kv(label: string, value: string): void {
    this.ensure(this.lineH);
    this.page.drawText(`${label}:`, {
      x: this.margin,
      y: this.y,
      size: 10,
      font: this.fonts.fontBold,
      color: rgb(0.25, 0.3, 0.4),
    });
    this.page.drawText(truncate(value, 75), {
      x: this.margin + 90,
      y: this.y,
      size: 10,
      font: this.fonts.font,
      color: rgb(0.1, 0.12, 0.2),
    });
    this.y -= this.lineH;
  }

  kvMono(label: string, value: string): void {
    this.ensure(this.lineH);
    this.page.drawText(`${label}:`, {
      x: this.margin,
      y: this.y,
      size: 10,
      font: this.fonts.fontBold,
      color: rgb(0.25, 0.3, 0.4),
    });
    this.page.drawText(value, {
      x: this.margin + 90,
      y: this.y,
      size: 8,
      font: this.fonts.fontMono,
      color: rgb(0.1, 0.12, 0.2),
    });
    this.y -= this.lineH;
  }

  gap(n: number): void {
    this.y -= n;
  }

  flush(): void {
    // No-op — pages already attached. Kept for symmetry / future buffer.
  }
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function readReason(metadata: unknown): string {
  if (
    typeof metadata === 'object' &&
    metadata !== null &&
    'reason' in metadata
  ) {
    const v = (metadata as { reason?: unknown }).reason;
    return typeof v === 'string' ? v : '';
  }
  return '';
}
