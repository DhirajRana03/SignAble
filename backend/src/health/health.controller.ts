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
 *
 * GET /api/v1/health/live — process responsive, zero deps. Used by
 *   Render's autoscaler health check. Must stay fast + dependency-free
 *   so a downstream cold start cannot trigger a restart loop.
 *
 * GET /api/v1/health — readiness, DB only. Frontend dashboard polls
 *   this for the status indicator. DB check is cheap and reflects
 *   whether the API can serve user-facing reads. Processor health was
 *   removed because (a) it caused poll-driven 429s on free-tier hosts
 *   that throttle traffic, and (b) processor cold-starts produced false
 *   negatives that made the whole app appear down even when uploads
 *   weren't in flight.
 *
 * GET /api/v1/health/full — readiness, all deps including processor.
 *   Use this from ops dashboards / uptime monitors when you actually
 *   want to verify the processor is warm. Not polled by the app.
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
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
    ]);
  }

  @Get('full')
  @HealthCheck()
  checkFull() {
    const processorUrl = this.config.get<string>('processorUrl');
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      () => this.http.pingCheck('processor', `${processorUrl}/health`),
    ]);
  }
}
