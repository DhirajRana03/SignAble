'use client';

import { Download, FileText } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { DownloadDialog } from '@/components/features/envelopes/DownloadDialog';
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
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const downloadFromUrl = async (url: string, filename: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
  };

  const handleDownload = async (selection: {
    document: boolean;
    certificate: boolean;
    combine: boolean;
  }) => {
    if (!data) return;
    setDownloadBusy(true);
    try {
      if (selection.combine && selection.document && selection.certificate) {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        await downloadFromUrl(
          `${apiBase}/sign/${token}/combined`,
          `${data.envelopeTitle}.combined.pdf`,
        );
      } else {
        const jobs: Promise<void>[] = [];
        if (selection.document && data.signedPdfUrl) {
          jobs.push(
            downloadFromUrl(
              data.signedPdfUrl,
              `${data.envelopeTitle}.signed.pdf`,
            ),
          );
        }
        if (selection.certificate && data.certificatePdfUrl) {
          jobs.push(
            downloadFromUrl(
              data.certificatePdfUrl,
              `${data.envelopeTitle}.certificate.pdf`,
            ),
          );
        }
        await Promise.all(jobs);
      }
      setDownloadOpen(false);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadBusy(false);
    }
  };

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
            <Button
              variant="accent"
              size="sm"
              className="!rounded-full px-4"
              onClick={() => setDownloadOpen(true)}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
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

      {downloadOpen ? (
        <DownloadDialog
          busy={downloadBusy}
          onClose={() => {
            if (!downloadBusy) setDownloadOpen(false);
          }}
          onDownload={handleDownload}
        />
      ) : null}
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
