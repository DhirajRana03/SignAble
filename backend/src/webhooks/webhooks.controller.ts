import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateWebhookDto, @CurrentUser() user: User) {
    return this.webhooks.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.webhooks.list(user.id);
  }

  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.webhooks.get(user.id, id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: User,
  ) {
    return this.webhooks.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.webhooks.delete(user.id, id);
  }

  @Get(':id/deliveries')
  deliveries(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.webhooks.listDeliveries(user.id, id);
  }
}
