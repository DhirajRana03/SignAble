import { Module } from '@nestjs/common';

import { NotificationsWorker } from '../notifications/notifications.worker';
import { SigningController } from './signing.controller';
import { SigningService } from './signing.service';
import { SigningWorker } from './signing.worker';

@Module({
  controllers: [SigningController],
  providers: [SigningService, SigningWorker, NotificationsWorker],
  exports: [SigningService],
})
export class SigningModule {}
