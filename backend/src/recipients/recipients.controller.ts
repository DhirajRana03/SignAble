import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CreateRecipientDto,
  UpdateRecipientDto,
} from './dto/recipient.dto';
import { RecipientsService } from './recipients.service';

@Controller('envelopes/:envelopeId/recipients')
@UseGuards(JwtAuthGuard)
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Get()
  list(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @CurrentUser() user: User,
  ) {
    return this.recipientsService.list(user.id, envelopeId);
  }

  @Post()
  @HttpCode(201)
  add(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @Body() dto: CreateRecipientDto,
    @CurrentUser() user: User,
  ) {
    return this.recipientsService.add(user.id, envelopeId, dto);
  }

  @Put(':recipientId')
  update(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @Param('recipientId', new ParseUUIDPipe()) recipientId: string,
    @Body() dto: UpdateRecipientDto,
    @CurrentUser() user: User,
  ) {
    return this.recipientsService.update(
      user.id,
      envelopeId,
      recipientId,
      dto,
    );
  }

  @Delete(':recipientId')
  @HttpCode(204)
  delete(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @Param('recipientId', new ParseUUIDPipe()) recipientId: string,
    @CurrentUser() user: User,
  ) {
    return this.recipientsService.delete(user.id, envelopeId, recipientId);
  }
}
