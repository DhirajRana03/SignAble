import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';

import {
  DeclineDto,
  SaveProgressDto,
  SubmitSignatureDto,
} from './dto/signing.dto';
import { SigningService } from './signing.service';

/**
 * Public signing endpoints — no JWT auth. Access controlled via
 * cryptographic signing token in the URL.
 */
@Controller('sign')
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Get(':token')
  getView(@Param('token') token: string) {
    return this.signingService.getForSigner(token);
  }

  /**
   * Public completion view — returns signed PDF URL once envelope
   * completed. Drives standalone post-sign confirmation page so
   * recipients see only the document, not the platform shell.
   */
  @Get(':token/completion')
  getCompletion(@Param('token') token: string) {
    return this.signingService.getCompletionForToken(token);
  }

  /**
   * Token-scoped public file route. Signer fetches page PNGs without
   * JWT. Wildcard `0` captures everything after `/files/`.
   */
  @Get(':token/files/*')
  async serveFile(
    @Param('token') token: string,
    @Param('0') filePath: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { data, contentType } = await this.signingService.loadFileForToken(
        token,
        filePath,
      );
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(data);
    } catch (err) {
      const msg = (err as Error).message ?? 'File not found';
      throw new HttpException(msg, 404);
    }
  }

  @Post(':token/viewed')
  @HttpCode(204)
  markViewed(@Param('token') token: string, @Req() req: Request) {
    return this.signingService.markViewed(token, this.clientIp(req));
  }

  @Post(':token/save-progress')
  @HttpCode(200)
  saveProgress(
    @Param('token') token: string,
    @Body() dto: SaveProgressDto,
  ) {
    return this.signingService.saveProgress(token, dto.fieldValues);
  }

  @Post(':token/submit')
  @HttpCode(204)
  submit(
    @Param('token') token: string,
    @Body() dto: SubmitSignatureDto,
    @Req() req: Request,
  ) {
    return this.signingService.submit(
      token,
      dto.fieldValues,
      this.clientIp(req),
    );
  }

  @Post(':token/decline')
  @HttpCode(204)
  decline(
    @Param('token') token: string,
    @Body() dto: DeclineDto,
    @Req() req: Request,
  ) {
    return this.signingService.decline(
      token,
      dto.reason ?? '',
      this.clientIp(req),
    );
  }

  private clientIp(req: Request): string | null {
    return req.ip ?? req.socket?.remoteAddress ?? null;
  }
}
