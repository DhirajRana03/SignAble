import {
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

import { VerifyService } from './verify.service';

/**
 * Public envelope verification.
 *
 * GET /verify/:envelopeId
 *   Returns chain metadata + recomputed MAC check. Lets anyone with
 *   an envelope ID validate completion against the canonical record.
 *
 * POST /verify/:envelopeId/pdf
 *   Accepts an uploaded signed PDF and confirms its embedded
 *   integrity hash matches the stored chain — proves the file
 *   bytes have not been altered since signing.
 *
 * Public endpoints. No auth — envelope IDs are UUIDs and the chain
 * alone is not sensitive. Reveals envelope title + recipient emails
 * (already visible to anyone with the signing link).
 */
@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Get(':envelopeId')
  async verify(@Param('envelopeId') envelopeId: string) {
    return this.verifyService.verifyEnvelope(envelopeId);
  }

  @Get(':envelopeId/audit-certificate')
  async downloadCertificate(
    @Param('envelopeId') envelopeId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { data, filename } =
        await this.verifyService.loadAuditCertificate(envelopeId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${filename}"`,
      );
      res.send(data);
    } catch (err) {
      throw new HttpException(
        (err as Error).message ?? 'Not found',
        404,
      );
    }
  }

  @Post(':envelopeId/pdf')
  @UseInterceptors(FileInterceptor('pdf'))
  async verifyUploadedPdf(
    @Param('envelopeId') envelopeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() _req: Request,
  ) {
    if (!file) throw new HttpException('No PDF uploaded', 400);
    return this.verifyService.verifyUploadedPdf(envelopeId, file.buffer);
  }
}
