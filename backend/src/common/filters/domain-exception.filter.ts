import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';

import {
  ConflictError,
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  TooManyRequestsError,
  UnsupportedFormatError,
  ValidationError,
} from '../exceptions/domain.exceptions';

/**
 * Sole point where domain exceptions become HTTP responses.
 * Lookup by class name keeps this filter decoupled from instanceof chains.
 */
const STATUS_MAP: Record<string, number> = {
  NotFoundError: 404,
  ForbiddenError: 403,
  ConflictError: 409,
  InvalidStateTransitionError: 422,
  ValidationError: 400,
  UnsupportedFormatError: 415,
  TooManyRequestsError: 429,
};

@Catch(
  NotFoundError,
  ForbiddenError,
  ConflictError,
  InvalidStateTransitionError,
  ValidationError,
  UnsupportedFormatError,
  TooManyRequestsError,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = STATUS_MAP[exception.name] ?? 500;

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
