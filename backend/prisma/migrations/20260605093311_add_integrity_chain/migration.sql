-- Add tamper-evident integrity chain columns to envelopes.
--
-- integrityHash  : SHA-256 hex digest of canonical envelope state
-- integrityMac   : HMAC-SHA256 hex of integrityHash using server secret
-- auditCertKey   : storage key for the audit-trail certificate PDF
ALTER TABLE "envelopes"
  ADD COLUMN "integrityHash" TEXT,
  ADD COLUMN "integrityMac" TEXT,
  ADD COLUMN "auditCertKey" TEXT;
