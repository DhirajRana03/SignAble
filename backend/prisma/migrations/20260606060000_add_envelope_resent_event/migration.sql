-- Add ENVELOPE_RESENT to AuditEventType for resend-invite tracking.
ALTER TYPE "AuditEventType" ADD VALUE 'ENVELOPE_RESENT';
