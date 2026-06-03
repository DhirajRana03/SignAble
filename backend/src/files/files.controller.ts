import {
  Controller,
  Get,
  HttpException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';

/**
 * Serves locally-stored files (page PNGs, signed PDFs) over HTTP.
 *
 * Auth-protected. Production deploys can replace this with pre-signed S3
 * URLs returned by StorageService — controller stays identical, only the
 * backend implementation changes.
 */
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get('*')
  async serve(
    @Param('0') filePath: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const data = await this.storage.load(filePath);
      const contentType = filePath.endsWith('.png')
        ? 'image/png'
        : filePath.endsWith('.pdf')
          ? 'application/pdf'
          : 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(data);
    } catch {
      throw new HttpException('File not found', 404);
    }
  }
}
