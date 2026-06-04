'use client';

import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useComposerGuardStore } from '@/store/composerGuardStore';

/**
 * Intercepts nav away from /envelopes/new when composer has unsaved
 * data. Three resolutions: save as draft and continue, discard and
 * continue, or stay on page.
 */
export function ComposerGuardModal() {
  const router = useRouter();
  const pendingHref = useComposerGuardStore((s) => s.pendingHref);
  const clearPending = useComposerGuardStore((s) => s.clearPending);
  const saveDraft = useComposerGuardStore((s) => s.saveDraft);
  const setDirty = useComposerGuardStore((s) => s.setDirty);
  const [busy, setBusy] = useState(false);

  if (!pendingHref) return null;

  const goAndClear = () => {
    const href = pendingHref;
    setDirty(false);
    clearPending();
    if (href === '__BACK__') {
      // Pop the dummy entry pushed by guard, then pop the real previous.
      window.history.go(-2);
    } else {
      router.push(href);
    }
  };

  const onSave = async () => {
    if (!saveDraft) {
      // Cannot save (missing title/doc). Treat as discard.
      goAndClear();
      return;
    }
    setBusy(true);
    try {
      await saveDraft();
      // saveDraft navigates to /drafts on success; clear guard regardless.
      setDirty(false);
      clearPending();
    } finally {
      setBusy(false);
    }
  };

  const onDiscard = () => goAndClear();
  const onCancel = () => clearPending();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-guard-title"
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-ink/30 backdrop-blur-sm animate-scale-in"
    >
      <div className="w-full max-w-md glass-strong shadow-popover p-6 origin-center">
        <div className="flex items-start gap-3 mb-4">
          <span className="h-9 w-9 grid place-items-center rounded-md bg-amber-100 text-amber-700 shrink-0">
            <AlertTriangle className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h2
              id="composer-guard-title"
              className="text-[15px] font-semibold text-ink leading-tight"
            >
              Unsaved envelope
            </h2>
            <p className="text-[12.5px] text-ink-3 mt-1">
              You have unsaved changes. Save as draft or discard before leaving.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 mt-6">
          <Button
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={busy}
          >
            Stay on page
          </Button>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="danger"
              size="md"
              onClick={onDiscard}
              disabled={busy}
            >
              Discard
            </Button>
            <Button
              variant="accent"
              size="md"
              onClick={onSave}
              loading={busy}
              disabled={!saveDraft || busy}
            >
              Save as draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
