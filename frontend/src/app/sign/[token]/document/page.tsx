'use client';

import { Download, FileText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useSigningCompletion } from '@/hooks/useSigning';
import { cn } from '@/lib/utils';

/**
 * Standalone post-sign completion view.
 *
 * No platform shell — recipients land here from the completion email
 * and see only their signed document. Token-scoped, no JWT required.
 */
export default function SignedDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useSigningCompletion(token);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-paper-dim">
        <span className="label-mono animate-pulse">loading document…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center p-8 bg-paper-dim">
        <div className="glass p-10 max-w-md text-center">
          <h2 className="font-display text-2xl mb-2">Document unavailable</h2>
          <p className="text-sm text-ink-soft">
            This link is invalid or has expired. Contact the sender for help.
          </p>
        </div>
      </div>
    );
  }

  const completed = data.envelopeStatus === 'COMPLETED' && data.signedPdfUrl;

  return (
    <div className="h-screen flex flex-col bg-paper-dim">
      {/* Minimal header — no nav, no app shell */}
      <header className="shrink-0 bg-paper/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-4">
          <Logo />
          <div className="flex-1 min-w-0">
            <p className="label-mono">Signed document</p>
            <p
              className="text-sm font-medium truncate"
              title={data.envelopeTitle}
            >
              {data.envelopeTitle}
            </p>
          </div>
          {completed ? (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/verify/${data.envelopeId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="!rounded-full px-4"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Verify
                </Button>
              </Link>
              <a
                href={data.signedPdfUrl!}
                download={`${data.envelopeTitle}.signed.pdf`}
              >
                <Button
                  variant="accent"
                  size="sm"
                  className="!rounded-full px-4"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </a>
            </div>
          ) : null}
        </div>
      </header>

      {/* Document area */}
      <main className="flex-1 overflow-hidden">
        {completed ? (
          <iframe
            src={data.signedPdfUrl!}
            title="Signed document"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <PendingNotice
            status={data.envelopeStatus}
            recipientStatus={data.recipientStatus}
          />
        )}
      </main>
    </div>
  );
}

function PendingNotice({
  status,
  recipientStatus,
}: {
  status: string;
  recipientStatus: string;
}) {
  const declined =
    status === 'VOIDED' || recipientStatus === 'DECLINED';

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div
        className={cn(
          'glass p-10 max-w-md text-center',
        )}
      >
        <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-accent-soft border border-accent/30 flex items-center justify-center">
          <FileText className="h-6 w-6 text-accent-deep" />
        </div>
        <p className="label-mono mb-2">
          {declined ? 'Document closed' : 'Awaiting other signers'}
        </p>
        <h1 className="font-display text-2xl tracking-tight mb-3">
          {declined ? 'No signed copy available' : 'Not ready yet'}
        </h1>
        <p className="text-sm text-ink-soft">
          {declined
            ? 'This envelope was voided or declined. A signed copy will not be produced.'
            : 'The signed document will appear here once every signer has completed their portion. You will receive an email when ready.'}
        </p>
      </div>
    </div>
  );
}
