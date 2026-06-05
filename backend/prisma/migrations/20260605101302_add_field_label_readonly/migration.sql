-- Add label + readOnly columns to signature_fields.
--
-- label    : palette tile label (Name, Email, ...). Metadata only,
--            preserves the user's original tile choice on draft reload.
-- readOnly : disables signer interaction. Chip still renders + value
--            (pre-filled by sender) is preserved on submit.
ALTER TABLE "signature_fields"
  ADD COLUMN "label" TEXT,
  ADD COLUMN "readOnly" BOOLEAN NOT NULL DEFAULT false;
