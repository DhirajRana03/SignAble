import { Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import type { EmailDriver, EmailMessage } from './email-driver.interface';

/**
 * SendGrid v3 Web API driver.
 * Set EMAIL_PROVIDER=sendgrid + SENDGRID_API_KEY.
 */
export class SendGridDriver implements EmailDriver {
  readonly name = 'sendgrid';
  private readonly logger = new Logger('Email/SendGrid');
  private readonly client: AxiosInstance;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('SENDGRID_API_KEY required');
    this.client = axios.create({
      baseURL: 'https://api.sendgrid.com/v3',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.client.post('/mail/send', {
      personalizations: [{ to: [{ email: message.to }] }],
      from: { email: message.from },
      subject: message.subject,
      content: [{ type: 'text/html', value: message.html }],
    });
    this.logger.log(`sent to=${message.to}`);
  }
}
