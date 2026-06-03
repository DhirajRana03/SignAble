import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CreateEnvelopeDto,
  UpdateEnvelopeDto,
  VoidEnvelopeDto,
} from './dto/envelope.dto';
import { EnvelopesService } from './envelopes.service';

@Controller('envelopes')
@UseGuards(JwtAuthGuard)
export class EnvelopesController {
  constructor(private readonly envelopesService: EnvelopesService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateEnvelopeDto, @CurrentUser() user: User) {
    return this.envelopesService.create(user.id, user.email, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.envelopesService.list(user.id);
  }

  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.get(user.id, id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEnvelopeDto,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.update(user.id, id, dto);
  }

  @Post(':id/send')
  send(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.send(user.id, user.email, id);
  }

  @Post(':id/void')
  void(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: VoidEnvelopeDto,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.void(user.id, user.email, id, dto.reason);
  }

  @Get(':id/audit')
  audit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.getAudit(user.id, id);
  }

  @Get(':id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.envelopesService.download(user.id, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="signed-${id}.pdf"`,
    );
    res.send(data);
  }
}
