/**
 * Domain exceptions — thrown by services to indicate business rule violations.
 *
 * RULE: These exceptions contain NO HTTP status codes. Mapping to HTTP
 * happens exclusively in `DomainExceptionFilter`. Services have no
 * awareness of HTTP transport.
 */

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot transition from '${from}' to '${to}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnsupportedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

export class TooManyRequestsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TooManyRequestsError';
  }
}
