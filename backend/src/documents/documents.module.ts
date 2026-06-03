import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsWorker } from './documents.worker';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsWorker],
  exports: [DocumentsService],
})
export class DocumentsModule {}
