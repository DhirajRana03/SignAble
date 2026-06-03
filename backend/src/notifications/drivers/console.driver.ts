import { Logger } from '@nestjs/common';

import type { EmailDriver, EmailMessage } from './email-driver.interface';

/**
 * Dev driver. Logs message instead of sending. Selected when
 * EMAIL_PROVIDER=console or EMAIL_ENABLED=false.
 */
export class ConsoleDriver implements EmailDriver {
  readonly name = 'console';
  private readonly logger = new Logger('Email/Console');

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `[EMAIL] to=${message.to} subject="${message.subject}" len=${message.html.length}`,
    );
  }
}
