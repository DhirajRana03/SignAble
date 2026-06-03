import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@prisma/client';

import {
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  UnsupportedFormatError,
  ValidationError,
} from '../common/exceptions/domain.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessorService } from '../processor/processor.service';
import { StorageService } from '../storage/storage.service';

/**
 * Allowed upload extensions. Mirrors `processor/src/format_converter.SUPPORTED_EXTS`.
 * Processor coerces non-PDF inputs to PDF before downstream processing.
 */
const SUPPORTED_EXTS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.bmp',
  '.gif',
  '.heic',
  '.heif',
]);

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly processor: ProcessorService,
    private readonly config: ConfigService,
  ) {}

  async upload(
    userId: string,
    file: Express.Multer.File,
  ): Promise<Document> {
    if (!file) {
      throw new ValidationError('No file provided');
    }
    const maxBytes = this.config.get<number>('maxUploadBytes') ?? 0;
    if (file.size > maxBytes) {
      throw new ValidationError(
        `File exceeds size limit (${Math.floor(maxBytes / 1024 / 1024)}MB)`,
      );
    }
    const ext = file.originalname.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
    if (!SUPPORTED_EXTS.has(ext)) {
      throw new UnsupportedFormatError(
        `Unsupported format: ${ext || 'unknown'}. Allowed: ${[...SUPPORTED_EXTS].join(', ')}`,
      );
    }

    const storageKey = await this.storage.saveDocument(
      userId,
      file.originalname,
      file.buffer,
    );

    const doc = await this.prisma.document.create({
      data: {
        userId,
        filename: file.originalname,
        storageKey,
      },
    });

    // Fire-and-forget processing. setImmediate keeps response fast.
    // Upgrade path: swap with Bull queue without touching callers.
    setImmediate(() => {
      void this.processInBackground(doc.id);
    });

    return doc;
  }

  async listDocuments(userId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocument(userId: string, docId: string): Promise<Document> {
    const doc = await this.prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc) {
      throw new NotFoundError('Document', docId);
    }
    if (doc.userId !== userId) {
      throw new ForbiddenError();
    }
    return doc;
  }

  async getPageUrls(userId: string, docId: string): Promise<string[]> {
    const doc = await this.getDocument(userId, docId);
    if (doc.status !== 'READY') {
      throw new InvalidStateTransitionError(doc.status, 'page_access');
    }
    return this.storage.pageUrls(docId, doc.pageCount);
  }

  async delete(userId: string, docId: string): Promise<void> {
    const doc = await this.getDocument(userId, docId);
    await this.storage.delete(doc.storageKey);
    await this.prisma.document.delete({ where: { id: docId } });
  }

  private async processInBackground(docId: string): Promise<void> {
    try {
      await this.prisma.document.update({
        where: { id: docId },
        data: { status: 'PROCESSING' },
      });

      const doc = await this.prisma.document.findUnique({
        where: { id: docId },
      });
      if (!doc) return;

      const pdfBuffer = await this.storage.load(doc.storageKey);

      const result = await this.processor.processDocument(pdfBuffer);
      const pageImages = await this.processor.renderPages(pdfBuffer);

      for (let i = 0; i < pageImages.length; i++) {
        const imgBuffer = Buffer.from(pageImages[i], 'base64');
        await this.storage.savePage(docId, i + 1, imgBuffer);
      }

      await this.prisma.document.update({
        where: { id: docId },
        data: {
          status: 'READY',
          pageCount: result.page_count,
        },
      });
    } catch (err) {
      const message = (err as Error).message ?? 'unknown error';
      this.logger.error(`Background processing failed for ${docId}: ${message}`);
      await this.prisma.document
        .update({
          where: { id: docId },
          data: {
            status: 'FAILED',
            errorMessage: message.slice(0, 1000),
          },
        })
        .catch(() => undefined);
    }
  }
}
