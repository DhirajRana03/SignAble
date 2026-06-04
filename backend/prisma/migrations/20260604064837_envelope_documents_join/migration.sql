-- CreateTable
CREATE TABLE "envelope_documents" (
    "envelopeId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envelope_documents_pkey" PRIMARY KEY ("envelopeId","documentId")
);

-- CreateIndex
CREATE INDEX "envelope_documents_envelopeId_idx" ON "envelope_documents"("envelopeId");

-- CreateIndex
CREATE INDEX "envelope_documents_documentId_idx" ON "envelope_documents"("documentId");

-- AddForeignKey
ALTER TABLE "envelope_documents" ADD CONSTRAINT "envelope_documents_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envelope_documents" ADD CONSTRAINT "envelope_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
