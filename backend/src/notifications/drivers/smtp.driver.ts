import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { EmailDriver, EmailMessage } from './email-driver.interface';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export class SmtpDriver implements EmailDriver {
  readonly name = 'smtp';
  private readonly logger = new Logger('Email/SMTP');
  private transporter: Transporter | null = null;

  constructor(private readonly config: SmtpConfig) {}

  async send(message: EmailMessage): Promise<void> {
    const t = this.getTransporter();
    await t.sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    this.logger.log(`sent to=${message.to}`);
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.port === 465,
      auth: this.config.user
        ? { user: this.config.user, pass: this.config.password }
        : undefined,
    });
    return this.transporter;
  }
}
