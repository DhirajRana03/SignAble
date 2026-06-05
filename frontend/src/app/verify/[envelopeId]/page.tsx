'use client';

import {
  CheckCircle2,
  Download,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useVerifyEnvelope } from '@/hooks/useVerify';
import { cn } from '@/lib/utils';
import { verifyService } from '@/services/verify.service';
import type { PdfVerifyResponse } from '@/types/verify.types';

/**
 * Public envelope verification page. No auth required. Anyone with
 * an envelope ID can:
 *   1. Confirm the canonical signing chain validates (MAC + hash recompute).
 *   2. Upload a downloaded signed PDF to verify its embedded hash
 *      matches the canonical record (proves bytes untampered).
 *   3. Download the audit certificate PDF.
 */
export default function VerifyEnvelopePage() {
  const { envelopeId } = useParams<{ envelopeId: string }>();
  const { data, isLoading, error } = useVerifyEnvelope(envelopeId);
  const [uploadResult, setUploadResult] =
    useState<PdfVerifyResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-paper-dim">
        <span className="label-mono animate-pulse">verifying envelope…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center p-8 bg-paper-dim">
        <div className="glass p-10 max-w-md text-center">
          <h2 className="font-display text-2xl mb-2">Envelope not found</h2>
          <p className="text-sm text-ink-soft">
            Verification ID is invalid or the envelope no longer exists.
          </p>
        </div>
      </div>
    );
  }

  const verified = data.integrity.verified;
  const chainPresent =
    !!data.integrity.hash && !!data.integrity.mac;

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await verifyService.verifyUploadedPdf(envelopeId, file);
      setUploadResult(res);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-dim">
      {/* Header */}
      <header className="bg-paper/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center gap-4">
          <Logo />
          <div className="flex-1 min-w-0">
            <p className="label-mono">Envelope verification</p>
            <p className="text-sm font-medium truncate">
              {data.envelopeTitle}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        {/* Verification status banner */}
        <section
          className={cn(
            'glass p-6 flex items-start gap-4 animate-fade-up',
            verified
              ? 'border-success/40'
              : chainPresent
                ? 'border-danger/40'
                : 'border-border-strong',
          )}
        >
          <span
            className={cn(
              'h-12 w-12 rounded-full grid place-items-center shrink-0',
              verified
                ? 'bg-success/10 text-success'
                : chainPresent
                  ? 'bg-danger/10 text-danger'
                  : 'bg-surface-sunken text-ink-3',
            )}
          >
            {verified ? (
              <ShieldCheck className="h-6 w-6" strokeWidth={2} />
            ) : (
              <ShieldAlert className="h-6 w-6" strokeWidth={2} />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <p className="label-mono">Integrity</p>
            <h1 className="font-display text-2xl tracking-tight mt-1">
              {verified
                ? 'Verified · chain intact'
                : chainPresent
                  ? 'Tamper detected'
                  : 'Not yet completed'}
            </h1>
            <p className="text-sm text-ink-soft mt-2">
              {verified
                ? 'Stored MAC matches the recomputed hash. Envelope state at completion is canonical and unaltered.'
                : data.integrity.reason || 'Chain unavailable.'}
            </p>
          </div>
        </section>

        {/* Envelope summary */}
        <section className="glass p-6 space-y-4">
          <p className="label-mono">Envelope</p>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="label-mono mb-0.5">ID</dt>
              <dd className="font-mono text-[12px] truncate">
                {data.envelopeId}
              </dd>
            </div>
            <div>
              <dt className="label-mono mb-0.5">Status</dt>
              <dd>{data.status}</dd>
            </div>
            <div>
              <dt className="label-mono mb-0.5">Completed</dt>
              <dd>
                {data.completedAt
                  ? new Date(data.completedAt).toLocaleString(undefined, { hour12: true })
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="label-mono mb-0.5">Fields</dt>
              <dd>{data.fieldCount}</dd>
            </div>
          </dl>
        </section>

        {/* Chain */}
        {chainPresent ? (
          <section className="glass p-6 space-y-3">
            <p className="label-mono">Cryptographic chain</p>
            <KvMono label="SHA-256" value={data.integrity.hash!} />
            <KvMono label="HMAC-SHA256" value={data.integrity.mac!} />
            <p className="text-[11px] text-ink-soft">
              Hash digests envelope state at completion. MAC binds the
              hash to a server-held secret.
            </p>
          </section>
        ) : null}

        {/* Recipients */}
        <section className="glass p-6 space-y-3">
          <p className="label-mono">Recipients ({data.recipients.length})</p>
          <ul className="divide-y divide-border">
            {data.recipients.map((r, i) => (
              <li
                key={`${r.email}-${i}`}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="font-mono text-[11px] text-ink-3 w-6">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[12px] text-ink-3 truncate">
                    {r.email}
                  </p>
                </div>
                <span className="label-mono shrink-0">{r.status}</span>
                <span className="text-[11px] text-ink-3 shrink-0 w-32 text-right">
                  {r.signedAt
                    ? new Date(r.signedAt).toLocaleString(undefined, { hour12: true })
                    : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Upload PDF verification */}
        {chainPresent ? (
          <section className="glass p-6 space-y-4">
            <div className="flex items-start gap-3">
              <FileCheck className="h-5 w-5 text-accent-deep shrink-0 mt-0.5" />
              <div>
                <p className="label-mono">Verify a downloaded PDF</p>
                <p className="text-sm text-ink-soft mt-1">
                  Upload the signed PDF to confirm its embedded hash
                  matches the canonical record. Detects byte-level
                  tampering.
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
            <Button
              variant="accent"
              className="!rounded-full px-5"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> Upload PDF to verify
            </Button>

            {uploadResult ? (
              <div
                className={cn(
                  'mt-3 rounded-lg border p-4 flex items-start gap-3',
                  uploadResult.matchesStoredChain
                    ? 'border-success/40 bg-success/5'
                    : 'border-danger/40 bg-danger/5',
                )}
              >
                {uploadResult.matchesStoredChain ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-medium">
                    {uploadResult.matchesStoredChain
                      ? 'PDF matches canonical record'
                      : 'PDF does NOT match canonical record'}
                  </p>
                  {uploadResult.reason ? (
                    <p className="text-[12px] text-ink-soft">
                      {uploadResult.reason}
                    </p>
                  ) : null}
                  {uploadResult.pdfEmbeddedHash ? (
                    <KvMono
                      label="PDF hash"
                      value={uploadResult.pdfEmbeddedHash}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Audit certificate */}
        {data.hasAuditCertificate ? (
          <section className="glass p-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="label-mono">Audit certificate</p>
              <p className="text-sm text-ink-soft mt-1">
                Human-readable summary of the signing chain, recipient
                activity, and event log.
              </p>
            </div>
            <a
              href={verifyService.auditCertUrl(envelopeId)}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                variant="accent"
                size="sm"
                className="!rounded-full px-4"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </a>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function KvMono({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
      <span className="label-mono shrink-0 w-28">{label}</span>
      <span className="font-mono text-[11px] text-ink-2 break-all">
        {value}
      </span>
    </div>
  );
}
