'use client';

import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AuditTrail } from '@/components/features/envelopes/AuditTrail';
import { DownloadDialog } from '@/components/features/envelopes/DownloadDialog';
import { EnvelopeDocumentPreview } from '@/components/features/envelopes/EnvelopeDocumentPreview';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  useDeleteEnvelope,
  useEnvelope,
  useEnvelopeAudit,
  useSendEnvelope,
  useVoidEnvelope,
} from '@/hooks/useEnvelopes';
import { cn, formatDate, recipientColor } from '@/lib/utils';
import { envelopeService } from '@/services/envelope.service';

export default function EnvelopeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const envelope = useEnvelope(id);
  const send = useSendEnvelope();
  const voidIt = useVoidEnvelope();
  const del = useDeleteEnvelope();
  const [showDocument, setShowDocument] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  // Drafts finalize via prepare workspace. Redirect on load.
  useEffect(() => {
    if (envelope.data?.status === 'DRAFT') {
      router.replace(`/envelopes/${envelope.data.id}/edit`);
    }
  }, [envelope.data?.status, envelope.data?.id, router]);

  if (
    envelope.isLoading ||
    !envelope.data ||
    envelope.data.status === 'DRAFT'
  ) {
    return (
      <DashboardShell eyebrow="Envelope" title="Loading…">
        <div className="label-mono">loading…</div>
      </DashboardShell>
    );
  }

  const env = envelope.data;
  const recipients = env.recipients ?? [];
  const isVoided = env.status === 'VOIDED';
  const isDraft = env.status === 'DRAFT';
  const isCompleted = env.status === 'COMPLETED';

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSelection = async (selection: {
    document: boolean;
    certificate: boolean;
    combine: boolean;
  }) => {
    setDownloadBusy(true);
    try {
      if (selection.combine && selection.document && selection.certificate) {
        const blob = await envelopeService.download(env.id, 'combined');
        triggerBlobDownload(blob, `${env.title}.combined.pdf`);
      } else {
        const jobs: Promise<unknown>[] = [];
        if (selection.document) {
          jobs.push(
            envelopeService
              .download(env.id, 'document')
              .then((blob) =>
                triggerBlobDownload(blob, `${env.title}.signed.pdf`),
              ),
          );
        }
        if (selection.certificate) {
          jobs.push(
            envelopeService
              .download(env.id, 'certificate')
              .then((blob) =>
                triggerBlobDownload(
                  blob,
                  `${env.title}.certificate.pdf`,
                ),
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

  return (
    <DashboardShell
      eyebrow={
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-deep shadow-sm hover:bg-accent hover:text-accent-fg hover:border-accent hover:shadow-glow active:scale-[0.97] transition-all duration-150"
          aria-label="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      }
      title=""
      wide
      actions={
        <>
          {isDraft ? (
            <>
              <Button
                variant="secondary"
                onClick={() => router.push(`/envelopes/${env.id}/prepare`)}
              >
                Edit fields
              </Button>
              <Button
                variant="accent"
                loading={send.isPending}
                onClick={() => send.mutate(env.id)}
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </>
          ) : null}
          {isCompleted ? (
            <Button variant="accent" onClick={() => setDownloadOpen(true)}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {isVoided ? <VoidReasonBanner envelopeId={env.id} /> : null}

          <div className="glass p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="label-mono mb-1">Summary</p>
                <h2 className="font-display text-2xl tracking-tight">
                  {env.title}
                </h2>
                {env.message ? (
                  <p className="mt-2 text-sm text-ink-soft text-pretty">
                    {env.message}
                  </p>
                ) : null}
              </div>
              <StatusBadge status={env.status} />
            </div>

            <div className="rule" />

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="label-mono mb-0.5">Created</dt>
                <dd>{formatDate(env.createdAt)}</dd>
              </div>
              <div>
                <dt className="label-mono mb-0.5">Sent</dt>
                <dd>{formatDate(env.sentAt)}</dd>
              </div>
              <div>
                <dt className="label-mono mb-0.5">Completed</dt>
                <dd>{formatDate(env.completedAt)}</dd>
              </div>
              <div>
                <dt className="label-mono mb-0.5">Order</dt>
                <dd>{env.signingOrder.toLowerCase()}</dd>
              </div>
            </dl>
          </div>

          <div className="glass p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="label-mono mb-0.5">Document</p>
              <p className="text-[13.5px] font-medium text-ink truncate">
                {(env.fields ?? []).length} field
                {(env.fields ?? []).length === 1 ? '' : 's'} placed
              </p>
            </div>
            <Button
              variant="accent"
              size="sm"
              className="!rounded-full px-4"
              onClick={() => setShowDocument(true)}
            >
              <Eye className="h-3.5 w-3.5" /> View document
            </Button>
          </div>

          <div className="glass p-6">
            <p className="label-mono mb-4">Signers</p>
            <ul className="divide-y divide-border -mx-2">
              {recipients.map((r, i) => {
                const color = recipientColor(i);
                return (
                  <li key={r.id} className="flex items-center gap-3 py-3 px-2">
                    <span
                      className={cn(
                        'h-7 w-7 rounded-sm border flex items-center justify-center text-xs font-mono uppercase',
                        color.bg,
                        color.fg,
                        'border-current',
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-ink-soft truncate">
                        {r.email}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                    {r.signingToken ? (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/sign/${r.signingToken}`,
                          );
                          toast.success('Signing link copied');
                        }}
                        className="p-1.5 rounded-sm text-ink-faint hover:text-ink hover:bg-paper-dim"
                        title="Copy signing link"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <AuditTrail envelopeId={env.id} />

          {!isCompleted && env.status !== 'VOIDED' ? (
            <div className="glass p-5 space-y-2">
              <p className="label-mono mb-1">Danger zone</p>
              {isDraft ? (
                <Button
                  variant="danger"
                  className="w-full"
                  loading={del.isPending}
                  onClick={() => {
                    if (!confirm('Delete this draft permanently?')) return;
                    del.mutate(env.id, {
                      onSuccess: () => router.push('/envelopes'),
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete draft
                </Button>
              ) : (
                <Button
                  variant="danger"
                  className="w-full"
                  loading={voidIt.isPending}
                  onClick={() => {
                    const reason = prompt('Reason for voiding?');
                    if (reason) voidIt.mutate({ id: env.id, reason });
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" /> Void envelope
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {showDocument ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-up"
          onClick={() => setShowDocument(false)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl glass-strong overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowDocument(false)}
              aria-label="Close document"
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 shadow-sm hover:bg-danger/10 hover:text-danger hover:border-danger active:scale-[0.97] transition-all duration-150"
            >
              <X className="h-3.5 w-3.5" /> Close
            </button>
            <div className="flex-1 overflow-y-auto">
              <EnvelopeDocumentPreview envelope={env} />
            </div>
          </div>
        </div>
      ) : null}

      {downloadOpen ? (
        <DownloadDialog
          busy={downloadBusy}
          onClose={() => {
            if (!downloadBusy) setDownloadOpen(false);
          }}
          onDownload={handleDownloadSelection}
        />
      ) : null}
    </DashboardShell>
  );
}

/**
 * Voiding reason banner. Reads ENVELOPE_VOIDED audit event metadata
 * to surface why envelope killed + who voided + when.
 */
function VoidReasonBanner({ envelopeId }: { envelopeId: string }) {
  const { data, isLoading } = useEnvelopeAudit(envelopeId, {
    eventType: 'ENVELOPE_VOIDED',
    limit: 1,
  });
  if (isLoading) return null;

  const evt = data?.items?.[0];
  if (!evt) return null;

  const reason =
    typeof evt.metadata === 'object' &&
    evt.metadata !== null &&
    'reason' in evt.metadata
      ? String((evt.metadata as { reason?: unknown }).reason ?? '')
      : '';

  return (
    <div className="glass p-6 space-y-2">
      <p className="label-mono">Voided</p>
      <p className="text-sm text-ink font-medium">
        {reason || 'No reason provided'}
      </p>
      <p className="text-xs text-ink-soft">
        By {evt.actorEmail} · {formatDate(evt.createdAt)}
      </p>
    </div>
  );
}
