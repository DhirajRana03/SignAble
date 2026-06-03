export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
}

/**
 * Common interface for email provider drivers.
 * Implementations: SMTP, SendGrid, Postmark.
 * Selected at boot via EMAIL_PROVIDER env var.
 */
export interface EmailDriver {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}
