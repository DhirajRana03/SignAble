'use client';

import { Copy, Download, Send, Trash2, XCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { AuditTrail } from '@/components/features/envelopes/AuditTrail';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  useDeleteEnvelope,
  useEnvelope,
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
  const isDraft = env.status === 'DRAFT';
  const isCompleted = env.status === 'COMPLETED';

  const onDownload = async () => {
    try {
      const blob = await envelopeService.download(env.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${env.title}.signed.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <DashboardShell
      eyebrow="Envelope"
      title={env.title}
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
            <Button variant="accent" onClick={onDownload}>
              <Download className="h-3.5 w-3.5" /> Download signed PDF
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3 max-w-7xl">
        <div className="lg:col-span-2 space-y-6">
          <div className="sheet p-6 space-y-5">
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

          <div className="sheet p-6">
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
                      <p className="text-xs text-ink-soft truncate">{r.email}</p>
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
            <div className="sheet p-5 space-y-2">
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
    </DashboardShell>
  );
}
