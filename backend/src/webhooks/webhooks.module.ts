import { Global, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
