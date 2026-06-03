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
  ): Promise<Buffer> {
    try {
      const { data } = await this.client.post<{ signed_pdf_base64: string }>(
        '/apply-signatures',
        {
          pdf_base64: pdfBuffer.toString('base64'),
          fields,
          page_dimensions: pageDimensions,
        },
        { maxContentLength: Infinity, maxBodyLength: Infinity },
      );
      return Buffer.from(data.signed_pdf_base64, 'base64');
    } catch (err) {
      this.logger.error(`applySignatures failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Signature applier unavailable');
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
