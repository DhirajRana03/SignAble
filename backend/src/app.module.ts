import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { DocumentsModule } from './documents/documents.module';
import { EnvelopesModule } from './envelopes/envelopes.module';
import { FieldsModule } from './fields/fields.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
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
    // Rate limit. Two tiers: short burst + sustained.
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60_000, limit: 200 },
    ]),
    PrismaModule,
    StorageModule,
    ProcessorModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    DocumentsModule,
    FilesModule,
    EnvelopesModule,
    RecipientsModule,
    FieldsModule,
    SigningModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
