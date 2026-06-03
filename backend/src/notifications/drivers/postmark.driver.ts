import { Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

import type { EmailDriver, EmailMessage } from './email-driver.interface';

/**
 * Postmark API driver.
 * Set EMAIL_PROVIDER=postmark + POSTMARK_SERVER_TOKEN.
 */
export class PostmarkDriver implements EmailDriver {
  readonly name = 'postmark';
  private readonly logger = new Logger('Email/Postmark');
  private readonly client: AxiosInstance;

  constructor(serverToken: string) {
    if (!serverToken) throw new Error('POSTMARK_SERVER_TOKEN required');
    this.client = axios.create({
      baseURL: 'https://api.postmarkapp.com',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': serverToken,
      },
      timeout: 10_000,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.client.post('/email', {
      From: message.from,
      To: message.to,
      Subject: message.subject,
      HtmlBody: message.html,
    });
    this.logger.log(`sent to=${message.to}`);
  }
}
