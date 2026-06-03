'use client';

import { Check, Send, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DocumentViewer } from '@/components/features/document-viewer/DocumentViewer';
import { SignaturePad } from '@/components/features/signature-pad/SignaturePad';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { useSigning } from '@/hooks/useSigning';
import { cn } from '@/lib/utils';
import type { SignatureField } from '@/types/envelope.types';

import { SigningFieldOverlay } from './SigningFieldOverlay';

export function SigningView({ token }: { token: string }) {
  const router = useRouter();
  const {
    query,
    fieldValues,
    setFieldValue,
    allRequiredFilled,
    submit,
    decline,
  } = useSigning(token);
  const [activeField, setActiveField] = useState<SignatureField | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="label-mono animate-pulse">preparing envelope…</span>
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="sheet p-10 max-w-md text-center">
          <h2 className="font-display text-2xl mb-2">
            This envelope is unavailable
          </h2>
          <p className="text-sm text-ink-soft">
            It may have already been signed, declined, or voided. Contact the
            sender for help.
          </p>
        </div>
      </div>
    );
  }

  const data = query.data!;
  const required = data.fields.filter((f) => f.required);
  const completedCount = required.filter((f) => fieldValues[f.id]).length;

  return (
    <div className="min-h-screen pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-paper/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-4">
          <Logo />
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="label-mono">Signing as</p>
            <p className="text-sm font-medium truncate">{data.recipientName}</p>
          </div>
          <div className="hidden md:block">
            <p className="label-mono text-right">Progress</p>
            <p className="font-mono text-sm">
              {completedCount} / {required.length} required
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeclineOpen(true)}
          >
            <XCircle className="h-3.5 w-3.5" /> Decline
          </Button>
        </div>
      </header>

      {/* Envelope intro */}
      <section className="mx-auto max-w-3xl px-6 pt-10">
        <p className="label-mono mb-2">From the sender</p>
        <h1 className="font-display text-3xl lg:text-4xl tracking-tight">
          {data.envelopeTitle}
        </h1>
        {data.envelopeMessage ? (
          <p className="mt-4 text-base text-ink-soft text-pretty">
            {data.envelopeMessage}
          </p>
        ) : null}
        <div className="rule mt-8" />
      </section>

      {/* Document */}
      <section className="mx-auto max-w-5xl px-6">
        <DocumentViewer
          pageUrls={data.pageUrls}
          authed={false}
          renderOverlay={(pageIndex, pageRef) => (
            <SigningFieldOverlay
              pageIndex={pageIndex}
              pageRef={pageRef}
              fields={data.fields}
              values={fieldValues}
              onFieldClick={(f) => setActiveField(f)}
            />
          )}
        />
      </section>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-paper/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-32 bg-paper-deep rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all"
                  style={{
                    width: `${(completedCount / Math.max(required.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <span className="label-mono">
                {Math.round((completedCount / Math.max(required.length, 1)) * 100)}%
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              {allRequiredFilled
                ? 'Ready to submit'
                : 'Tap each highlighted field on the document'}
            </p>
          </div>
          <Button
            variant="accent"
            size="lg"
            disabled={!allRequiredFilled}
            loading={submit.isPending}
            onClick={() => {
              submit.mutate(undefined, {
                onSuccess: () => router.push(`/sign/${token}/complete`),
              });
            }}
          >
            <Send className="h-4 w-4" /> Submit signature
          </Button>
        </div>
      </div>

      {/* Field modal */}
      {activeField ? (
        <FieldInputModal
          field={activeField}
          signerName={data.recipientName}
          onClose={() => setActiveField(null)}
          onConfirm={(value) => {
            setFieldValue(activeField.id, value);
            setActiveField(null);
          }}
        />
      ) : null}

      {/* Decline modal */}
      {declineOpen ? (
        <Modal title="Decline to sign" onClose={() => setDeclineOpen(false)}>
          <p className="text-sm text-ink-soft mb-4">
            The sender will be notified that you declined. Provide a reason
            if you'd like.
          </p>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={3}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={decline.isPending}
              onClick={() =>
                decline.mutate(declineReason, {
                  onSuccess: () => router.push(`/sign/${token}/complete`),
                })
              }
            >
              Decline
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function FieldInputModal({
  field,
  signerName,
  onClose,
  onConfirm,
}: {
  field: SignatureField;
  signerName: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}) {
  const [textValue, setTextValue] = useState<string>(
    field.fieldType === 'DATE' ? new Date().toLocaleDateString() : '',
  );

  return (
    <Modal title={`Add ${field.fieldType.toLowerCase()}`} onClose={onClose}>
      {field.fieldType === 'SIGNATURE' || field.fieldType === 'INITIALS' ? (
        <SignaturePad
          signerName={signerName}
          onConfirm={onConfirm}
          onCancel={onClose}
        />
      ) : (
        <div className="space-y-4">
          <Input
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder={
              field.fieldType === 'DATE'
                ? 'MM/DD/YYYY'
                : 'Type your text'
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={!textValue.trim()}
              onClick={() => onConfirm(textValue)}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-xl sheet p-6 animate-scale-in',
        )}
      >
        <h3 className="font-display text-xl mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
