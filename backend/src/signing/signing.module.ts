import { Module } from '@nestjs/common';

import { NotificationsWorker } from '../notifications/notifications.worker';
import { AuditCertificateService } from './audit-certificate.service';
import { IntegrityService } from './integrity.service';
import { SigningController } from './signing.controller';
import { SigningService } from './signing.service';
import { SigningWorker } from './signing.worker';

@Module({
  controllers: [SigningController],
  providers: [
    SigningService,
    SigningWorker,
    NotificationsWorker,
    IntegrityService,
    AuditCertificateService,
  ],
  exports: [SigningService, IntegrityService],
})
export class SigningModule {}
