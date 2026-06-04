import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuditEventType, EnvelopeStatus, User } from '@prisma/client';
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
  list(
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ) {
    // status query accepts comma-separated list (e.g. "VOIDED,EXPIRED")
    // for combined buckets like Archive.
    if (!status) return this.envelopesService.list(user.id);
    const validStatuses = Object.values(EnvelopeStatus);
    const parsed = status
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is EnvelopeStatus =>
        validStatuses.includes(s as EnvelopeStatus),
      );
    if (parsed.length === 0) return this.envelopesService.list(user.id);
    return this.envelopesService.list(
      user.id,
      parsed.length === 1 ? parsed[0] : parsed,
    );
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

  @Delete(':id')
  @HttpCode(204)
  deleteDraft(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.deleteDraft(user.id, id);
  }

  @Get(':id/documents')
  listDocuments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.listAttachedDocuments(user.id, id);
  }

  @Post(':id/documents/:documentId')
  @HttpCode(201)
  attachDocument(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.attachDocument(user.id, id, documentId);
  }

  @Delete(':id/documents/:documentId')
  @HttpCode(204)
  detachDocument(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @CurrentUser() user: User,
  ) {
    return this.envelopesService.detachDocument(user.id, id, documentId);
  }

  @Get(':id/audit')
  audit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(50), new ParseIntPipe())
    limit?: number,
    @Query(
      'eventType',
      new ParseEnumPipe(AuditEventType, { optional: true }),
    )
    eventType?: AuditEventType,
  ) {
    return this.envelopesService.getAudit(user.id, id, {
      cursor,
      limit,
      eventType,
    });
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
