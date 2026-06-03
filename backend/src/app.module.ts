import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { EnvelopesModule } from './envelopes/envelopes.module';
import { FieldsModule } from './fields/fields.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProcessorModule } from './processor/processor.module';
import { RecipientsModule } from './recipients/recipients.module';
import { SigningModule } from './signing/signing.module';
import { StorageModule } from './storage/storage.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    StorageModule,
    ProcessorModule,
    NotificationsModule,
    AuthModule,
    DocumentsModule,
    FilesModule,
    EnvelopesModule,
    RecipientsModule,
    FieldsModule,
    SigningModule,
  ],
})
export class AppModule {}
