import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Structured per-request log. method path status duration_ms ip.
 * Skips noisy paths (health, files).
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { method, originalUrl } = req;

    if (this.skip(originalUrl)) {
      next();
      return;
    }

    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      const ip = req.ip ?? '-';
      const line = `${method} ${originalUrl} ${status} ${ms}ms ${ip}`;
      if (status >= 500) this.logger.error(line);
      else if (status >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }

  private skip(url: string): boolean {
    return url.startsWith('/api/v1/health') || url.startsWith('/api/v1/files');
  }
}
