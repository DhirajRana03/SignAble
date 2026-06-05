import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

export interface PageDimension {
  width: number;
  height: number;
}

export interface ProcessResult {
  page_count: number;
  content_markdown: string;
  page_dimensions: PageDimension[];
}

export interface SignedFieldData {
  field_type: string;
  page_number: number;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  value: string;
  /**
   * DocuSign-style decoration metadata. Optional — processor falls
   * back to plain rendering when absent.
   *
   * - `label`: "Signed by:" / "Initial" header shown inside the
   *   bracket frame.
   * - `signer_name`: recipient display name (currently informational;
   *   the signature image already encodes it).
   * - `hash_id`: short, deterministic recipient identifier shown
   *   beneath the signature. Mirrors the truncated hash in the
   *   reference mockup.
   */
  label?: string;
  signer_name?: string;
  hash_id?: string;
}

/**
 * One recipient row on the Certificate of Completion. Mirrors the
 * DocuSign certificate layout — signer identity + timestamped event
 * trail + adopted signature image.
 */
export interface RecipientCertEntry {
  name: string;
  email: string;
  signing_id: string;
  security_level?: string;
  sent_at?: string | null;
  viewed_at?: string | null;
  signed_at?: string | null;
  ip_address?: string | null;
  signature_image?: string | null;
  adoption_method?: string;
  disclosure_accepted_at?: string | null;
}

/**
 * Audit payload sent to the processor for the Certificate of Completion
 * page set. Optional — processor renders a minimal fallback when absent.
 */
export interface CertificateData {
  envelope_id: string;
  subject: string;
  status?: string;
  document_pages?: number;
  certificate_pages?: number;
  signatures_count?: number;
  initials_count?: number;
  autonav?: string;
  envelope_id_stamping?: string;
  time_zone?: string;
  envelope_originator_name?: string;
  envelope_originator_email?: string;
  envelope_originator_ip?: string;
  record_holder_name?: string;
  record_holder_email?: string;
  record_status_timestamp?: string | null;
  location?: string;
  recipients?: RecipientCertEntry[];
  envelope_sent_at?: string | null;
  envelope_completed_at?: string | null;
}

/**
 * Sole HTTP client for the Python processor.
 * No other service may make HTTP calls to processor.
 */
@Injectable()
export class ProcessorService {
  private readonly logger = new Logger(ProcessorService.name);
  private readonly client: AxiosInstance;

  constructor(config: ConfigService) {
    this.client = axios.create({
      baseURL: config.get<string>('processorUrl'),
      timeout: 120_000,
    });
  }

  async processDocument(pdfBuffer: Buffer): Promise<ProcessResult> {
    const form = this.makeForm(pdfBuffer);
    try {
      const { data } = await this.client.post<ProcessResult>('/process', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      return data;
    } catch (err) {
      this.logger.error(`processDocument failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Document processor unavailable');
    }
  }

  async renderPages(pdfBuffer: Buffer): Promise<string[]> {
    const form = this.makeForm(pdfBuffer);
    try {
      const { data } = await this.client.post<{ pages: string[] }>(
        '/render-pages',
        form,
        {
          headers: form.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );
      return data.pages;
    } catch (err) {
      this.logger.error(`renderPages failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Page renderer unavailable');
    }
  }

  async applySignatures(
    pdfBuffer: Buffer,
    fields: SignedFieldData[],
    pageDimensions: PageDimension[],
    certificate?: CertificateData,
    includeCertificate = false,
  ): Promise<Buffer> {
    try {
      const { data } = await this.client.post<{ signed_pdf_base64: string }>(
        '/apply-signatures',
        {
          pdf_base64: pdfBuffer.toString('base64'),
          fields,
          page_dimensions: pageDimensions,
          certificate,
          include_certificate: includeCertificate,
        },
        { maxContentLength: Infinity, maxBodyLength: Infinity },
      );
      return Buffer.from(data.signed_pdf_base64, 'base64');
    } catch (err) {
      this.logger.error(`applySignatures failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Signature applier unavailable');
    }
  }

  async buildCertificate(
    certificate: CertificateData,
    fields: SignedFieldData[] = [],
  ): Promise<Buffer> {
    try {
      const { data } = await this.client.post<{
        certificate_pdf_base64: string;
      }>(
        '/build-certificate',
        { certificate, fields },
        { maxContentLength: Infinity, maxBodyLength: Infinity },
      );
      return Buffer.from(data.certificate_pdf_base64, 'base64');
    } catch (err) {
      this.logger.error(`buildCertificate failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Certificate builder unavailable');
    }
  }

  async mergePdfs(pdfs: Buffer[]): Promise<Buffer> {
    try {
      const { data } = await this.client.post<{ merged_pdf_base64: string }>(
        '/merge-pdfs',
        { pdfs_base64: pdfs.map((b) => b.toString('base64')) },
        { maxContentLength: Infinity, maxBodyLength: Infinity },
      );
      return Buffer.from(data.merged_pdf_base64, 'base64');
    } catch (err) {
      this.logger.error(`mergePdfs failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('PDF merge unavailable');
    }
  }

  private makeForm(pdfBuffer: Buffer): FormData {
    const form = new FormData();
    form.append('file', pdfBuffer, {
      filename: 'document.pdf',
      contentType: 'application/pdf',
    });
    return form;
  }
}
