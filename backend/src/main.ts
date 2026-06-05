import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  // Trust first reverse proxy so req.ip reflects the real client IP
  // when behind nginx / load balancer. Required for audit-trail IPs
  // on the Certificate of Completion to read the X-Forwarded-For
  // address rather than the local socket address.
  app.set('trust proxy', 1);
  const config = app.get(ConfigService);

  // Security headers. crossOriginResourcePolicy relaxed for file serving cross-origin.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());

  app.enableCors({
    origin: config.get<string[]>('allowedOrigins'),
    credentials: true,
  });

  const port = config.get<number>('port') ?? 8000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`SignAble API listening on :${port}`);
}

void bootstrap();
