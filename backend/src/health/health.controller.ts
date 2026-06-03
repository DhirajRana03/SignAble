import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Liveness + readiness probes.
 * GET /api/v1/health — db + processor reachable
 * GET /api/v1/health/live — process responsive (no deps)
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get()
  @HealthCheck()
  check() {
    const processorUrl = this.config.get<string>('processorUrl');
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      () => this.http.pingCheck('processor', `${processorUrl}/health`),
    ]);
  }
}
