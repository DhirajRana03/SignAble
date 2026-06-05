import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sole file I/O service. Every byte read from or written to disk goes through here.
 * Swap `LocalBackend` for an `S3Backend` (matching public methods) to move to S3
 * without touching any caller.
 */
@Injectable()
export class StorageService {
  private readonly root: string;
  private readonly urlBase: string;

  constructor(config: ConfigService) {
    this.root = config.get<string>('storage.root') ?? 'storage';
    this.urlBase =
      config.get<string>('storage.urlBase') ??
      'http://localhost:8000/api/v1/files';
  }

  async saveDocument(
    userId: string,
    filename: string,
    data: Buffer,
  ): Promise<string> {
    const safeName = path.basename(filename);
    const key = `documents/${userId}/${randomUUID()}/${safeName}`;
    return this.save(key, data);
  }

  async savePage(
    documentId: string,
    pageNum: number,
    data: Buffer,
  ): Promise<string> {
    const key = `pages/${documentId}/page_${String(pageNum).padStart(4, '0')}.png`;
    return this.save(key, data);
  }

  async saveSigned(envelopeId: string, data: Buffer): Promise<string> {
    const key = `signed/${envelopeId}/signed.pdf`;
    return this.save(key, data);
  }

  async saveCertificate(envelopeId: string, data: Buffer): Promise<string> {
    const key = `signed/${envelopeId}/certificate.pdf`;
    return this.save(key, data);
  }

  async load(key: string): Promise<Buffer> {
    const fullPath = this.resolveSafe(key);
    try {
      return await fs.readFile(fullPath);
    } catch {
      throw new Error(`File not found: ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.resolveSafe(key);
    await fs.unlink(fullPath).catch(() => undefined);
  }

  urlFor(key: string): string {
    return `${this.urlBase}/${key}`;
  }

  pageUrls(documentId: string, pageCount: number): string[] {
    return Array.from({ length: pageCount }, (_, i) =>
      this.urlFor(
        `pages/${documentId}/page_${String(i + 1).padStart(4, '0')}.png`,
      ),
    );
  }

  private async save(key: string, data: Buffer): Promise<string> {
    const fullPath = this.resolveSafe(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return key;
  }

  /**
   * Resolves `key` inside the storage root. Rejects path-traversal attempts
   * by ensuring the resolved path stays under root.
   */
  private resolveSafe(key: string): string {
    const root = path.resolve(this.root);
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep) && full !== root) {
      throw new Error('Invalid storage key');
    }
    return full;
  }
}
