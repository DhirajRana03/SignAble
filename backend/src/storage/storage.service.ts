import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * Sole file I/O service. Every byte read from or written to disk goes
 * through here. Swap backend by setting `STORAGE_BACKEND=r2` — callers
 * unchanged.
 *
 * `local` writes to filesystem under `root`. Used for dev + when no
 * object store configured.
 *
 * `r2` uses Cloudflare R2 (S3-compatible). Required for any deploy
 * without persistent disk — files survive container restarts.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly backendKind: 'local' | 'r2';
  private readonly root: string;
  private readonly urlBase: string;
  private readonly bucket: string;
  private s3?: S3Client;

  constructor(private readonly config: ConfigService) {
    this.backendKind =
      (config.get<'local' | 'r2'>('storage.backend') as 'local' | 'r2') ??
      'local';
    this.root = config.get<string>('storage.root') ?? 'storage';
    this.urlBase =
      config.get<string>('storage.urlBase') ??
      'http://localhost:8000/api/v1/files';
    this.bucket = config.get<string>('storage.r2.bucket') ?? '';
  }

  onModuleInit(): void {
    if (this.backendKind !== 'r2') return;
    const accountId = this.config.get<string>('storage.r2.accountId');
    const accessKeyId = this.config.get<string>('storage.r2.accessKeyId');
    const secretAccessKey = this.config.get<string>(
      'storage.r2.secretAccessKey',
    );
    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      throw new Error(
        'STORAGE_BACKEND=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET',
      );
    }
    this.s3 = new S3Client({
      // R2 ignores region but SDK requires one. `auto` works.
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
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
    return this.save(key, data, 'image/png');
  }

  async saveSigned(envelopeId: string, data: Buffer): Promise<string> {
    const key = `signed/${envelopeId}/signed.pdf`;
    return this.save(key, data, 'application/pdf');
  }

  async saveCertificate(envelopeId: string, data: Buffer): Promise<string> {
    const key = `signed/${envelopeId}/certificate.pdf`;
    return this.save(key, data, 'application/pdf');
  }

  async load(key: string): Promise<Buffer> {
    if (this.backendKind === 'r2') return this.loadR2(key);
    return this.loadLocal(key);
  }

  async delete(key: string): Promise<void> {
    if (this.backendKind === 'r2') {
      await this.s3!.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      ).catch(() => undefined);
      return;
    }
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

  private async save(
    key: string,
    data: Buffer,
    contentType?: string,
  ): Promise<string> {
    if (this.backendKind === 'r2') {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
        }),
      );
      return key;
    }
    const fullPath = this.resolveSafe(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return key;
  }

  private async loadLocal(key: string): Promise<Buffer> {
    const fullPath = this.resolveSafe(key);
    try {
      return await fs.readFile(fullPath);
    } catch {
      throw new Error(`File not found: ${key}`);
    }
  }

  private async loadR2(key: string): Promise<Buffer> {
    try {
      const res = await this.s3!.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!res.Body) throw new Error('empty body');
      return await streamToBuffer(res.Body as Readable);
    } catch (err) {
      const name = (err as Error & { name?: string }).name ?? '';
      if (name === 'NoSuchKey' || name === 'NotFound') {
        throw new Error(`File not found: ${key}`);
      }
      throw err;
    }
  }

  /**
   * Resolves `key` inside the storage root. Rejects path-traversal
   * attempts by ensuring the resolved path stays under root.
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

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
