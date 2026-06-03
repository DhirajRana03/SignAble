import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { DeclineDto, SubmitSignatureDto } from './dto/signing.dto';
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

  @Post(':token/viewed')
  @HttpCode(204)
  markViewed(@Param('token') token: string, @Req() req: Request) {
    return this.signingService.markViewed(token, this.clientIp(req));
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
