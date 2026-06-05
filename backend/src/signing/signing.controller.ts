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
  AdoptSignatureDto,
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
   * Token-scoped combined download — document + Certificate of
   * Completion merged into a single PDF. Mirrors the dashboard's
   * `?type=combined` flow for signers landing from the completion
   * email.
   */
  @Get(':token/combined')
  async downloadCombined(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { data, filename } =
        await this.signingService.combinedForToken(token);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(data);
    } catch (err) {
      const msg = (err as Error).message ?? 'Combined download failed';
      throw new HttpException(msg, 404);
    }
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

  /**
   * Persist the recipient's adopted signature + initials. Called once
   * by the "Adopt Your Signature" modal before the signer touches any
   * field. Subsequent SIGNATURE/INITIALS clicks reuse this image
   * directly without re-prompting.
   */
  @Post(':token/adopt')
  @HttpCode(200)
  adopt(
    @Param('token') token: string,
    @Body() dto: AdoptSignatureDto,
    @Req() req: Request,
  ) {
    return this.signingService.adoptSignature(
      token,
      dto,
      this.clientIp(req),
    );
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

  /**
   * Resolve the real client IP.
   *
   * Priority: `X-Forwarded-For` (first hop, set by upstream proxies) →
   * `X-Real-IP` (nginx convention) → Express-resolved `req.ip` (which
   * respects `trust proxy`) → raw socket address fallback. Strips the
   * IPv6 `::ffff:` prefix that Node attaches to dual-stack sockets so
   * the audit log reads "1.2.3.4" rather than "::ffff:1.2.3.4".
   */
  private clientIp(req: Request): string | null {
    const stripV6 = (raw: string | null | undefined): string | null => {
      if (!raw) return null;
      const trimmed = raw.trim();
      if (!trimmed) return null;
      return trimmed.startsWith('::ffff:')
        ? trimmed.slice('::ffff:'.length)
        : trimmed;
    };
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      const first = xff.split(',')[0];
      const ip = stripV6(first);
      if (ip) return ip;
    } else if (Array.isArray(xff) && xff[0]) {
      const ip = stripV6(xff[0]);
      if (ip) return ip;
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      const ip = stripV6(realIp);
      if (ip) return ip;
    }
    return stripV6(req.ip ?? req.socket?.remoteAddress ?? null);
  }
}
