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
  BulkSaveFieldsDto,
  CreateFieldDto,
  UpdateFieldDto,
} from './dto/field.dto';
import { FieldsService } from './fields.service';

@Controller('envelopes/:envelopeId/fields')
@UseGuards(JwtAuthGuard)
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get()
  list(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @CurrentUser() user: User,
  ) {
    return this.fieldsService.list(user.id, envelopeId);
  }

  @Post()
  @HttpCode(201)
  add(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @Body() dto: CreateFieldDto,
    @CurrentUser() user: User,
  ) {
    return this.fieldsService.add(user.id, envelopeId, dto);
  }

  @Put('bulk')
  bulkSave(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @Body() dto: BulkSaveFieldsDto,
    @CurrentUser() user: User,
  ) {
    return this.fieldsService.bulkSave(user.id, envelopeId, dto.fields);
  }

  @Put(':fieldId')
  update(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @Param('fieldId', new ParseUUIDPipe()) fieldId: string,
    @Body() dto: UpdateFieldDto,
    @CurrentUser() user: User,
  ) {
    return this.fieldsService.update(user.id, envelopeId, fieldId, dto);
  }

  @Delete(':fieldId')
  @HttpCode(204)
  delete(
    @Param('envelopeId', new ParseUUIDPipe()) envelopeId: string,
    @Param('fieldId', new ParseUUIDPipe()) fieldId: string,
    @CurrentUser() user: User,
  ) {
    return this.fieldsService.delete(user.id, envelopeId, fieldId);
  }
}
