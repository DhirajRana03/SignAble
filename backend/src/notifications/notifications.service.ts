import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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

/**
 * Sole email dispatcher. All outbound mail goes through here.
 * When EMAIL_ENABLED=false, emails are logged instead of sent (dev mode).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async sendSigningRequest(payload: SigningRequestPayload): Promise<void> {
    const url = `${this.frontendUrl()}/sign/${payload.signingToken}`;

    if (!this.isEmailEnabled()) {
      this.logger.log(
        `[EMAIL MOCK] Signing request → ${payload.to} | ${payload.envelopeTitle} | ${url}`,
      );
      return;
    }

    const html = this.renderSigningHtml(
      payload.name,
      payload.envelopeTitle,
      url,
      payload.message ?? undefined,
    );
    await this.send(payload.to, `Please sign: ${payload.envelopeTitle}`, html);
  }

  async sendCompletion(payload: CompletionPayload): Promise<void> {
    const url = `${this.frontendUrl()}/envelopes/${payload.envelopeId}`;

    if (!this.isEmailEnabled()) {
      this.logger.log(
        `[EMAIL MOCK] Completion → ${payload.to} | ${payload.envelopeTitle} | ${url}`,
      );
      return;
    }

    const html = this.renderCompletionHtml(
      payload.name,
      payload.envelopeTitle,
      url,
    );
    await this.send(payload.to, `Signed: ${payload.envelopeTitle}`, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.config.get<string>('email.from') ?? 'noreply@sinable.com',
      to,
      subject,
      html,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const user = this.config.get<string>('email.user');
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('email.host'),
      port: this.config.get<number>('email.port'),
      secure: false,
      auth: user
        ? { user, pass: this.config.get<string>('email.password') ?? '' }
        : undefined,
    });
    return this.transporter;
  }

  private isEmailEnabled(): boolean {
    return this.config.get<boolean>('email.enabled') === true;
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

  private renderCompletionHtml(
    name: string,
    title: string,
    url: string,
  ): string {
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
