import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ConsoleDriver } from './drivers/console.driver';
import type { EmailDriver } from './drivers/email-driver.interface';
import { PostmarkDriver } from './drivers/postmark.driver';
import { SendGridDriver } from './drivers/sendgrid.driver';
import { SmtpDriver } from './drivers/smtp.driver';

export interface SigningRequestPayload {
  to: string;
  name: string;
  envelopeTitle: string;
  signingToken: string;
  message?: string | null;
}

export interface CompletionPayload {
  to: string;
  name: string;
  envelopeTitle: string;
  envelopeId: string;
}

type ProviderName = 'console' | 'smtp' | 'sendgrid' | 'postmark';

/**
 * Sole email dispatcher. Selects driver per EMAIL_PROVIDER env at boot.
 * Fails open: errors logged, never throw to caller (signing flow must not
 * fail because email broke).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly driver: EmailDriver;

  constructor(private readonly config: ConfigService) {
    this.driver = this.selectDriver();
    this.logger.log(`email driver: ${this.driver.name}`);
  }

  async sendSigningRequest(payload: SigningRequestPayload): Promise<void> {
    const url = `${this.frontendUrl()}/sign/${payload.signingToken}`;
    const html = this.renderSigningHtml(
      payload.name,
      payload.envelopeTitle,
      url,
      payload.message ?? undefined,
    );
    await this.dispatch(
      payload.to,
      `Please sign: ${payload.envelopeTitle}`,
      html,
    );
  }

  async sendCompletion(payload: CompletionPayload): Promise<void> {
    const url = `${this.frontendUrl()}/envelopes/${payload.envelopeId}`;
    const html = this.renderCompletionHtml(
      payload.name,
      payload.envelopeTitle,
      url,
    );
    await this.dispatch(payload.to, `Signed: ${payload.envelopeTitle}`, html);
  }

  private async dispatch(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.driver.send({
        to,
        from: this.config.get<string>('email.from') ?? 'noreply@signable.com',
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(
        `email failed via ${this.driver.name}: ${(err as Error).message}`,
      );
    }
  }

  private selectDriver(): EmailDriver {
    if (!this.config.get<boolean>('email.enabled')) {
      return new ConsoleDriver();
    }
    const provider = (this.config.get<string>('email.provider') ?? 'smtp') as ProviderName;
    switch (provider) {
      case 'sendgrid':
        return new SendGridDriver(
          this.config.get<string>('email.sendgridApiKey') ?? '',
        );
      case 'postmark':
        return new PostmarkDriver(
          this.config.get<string>('email.postmarkToken') ?? '',
        );
      case 'console':
        return new ConsoleDriver();
      case 'smtp':
      default:
        return new SmtpDriver({
          host: this.config.get<string>('email.host') ?? 'localhost',
          port: this.config.get<number>('email.port') ?? 25,
          user: this.config.get<string>('email.user') ?? '',
          password: this.config.get<string>('email.password') ?? '',
        });
    }
  }

  private frontendUrl(): string {
    return this.config.get<string>('frontendUrl') ?? 'http://localhost:3000';
  }

  private renderSigningHtml(
    name: string,
    title: string,
    url: string,
    message?: string,
  ): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hello ${this.escape(name)},</h2>
        <p>You have been requested to sign: <strong>${this.escape(title)}</strong></p>
        ${message ? `<p>${this.escape(message)}</p>` : ''}
        <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">Sign document</a></p>
        <p style="color:#666;font-size:12px;">If the button doesn't work, copy this link: ${url}</p>
      </div>
    `;
  }

  private renderCompletionHtml(name: string, title: string, url: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hello ${this.escape(name)},</h2>
        <p><strong>${this.escape(title)}</strong> has been fully signed by all parties.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:white;text-decoration:none;border-radius:6px">View signed document</a></p>
      </div>
    `;
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
