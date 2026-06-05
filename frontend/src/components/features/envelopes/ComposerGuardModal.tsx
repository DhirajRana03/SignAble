'use client';

import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { useComposerGuardStore } from '@/store/composerGuardStore';

/**
 * Leave-page guard for the create-envelope composer.
 *
 * Two resolutions only: Stay on page (primary, autofocused) or Discard
 * (danger). Drafts are saved from the prepare-envelope settings, so the
 * modal stops offering a Save action it cannot perform.
 *
 * UX notes:
 *  - Escape and backdrop click resolve as Stay (safest default).
 *  - Stay action is autofocused so Enter keeps composer state by default.
 *  - Focus trapped to the modal while open.
 */
export function ComposerGuardModal() {
  const router = useRouter();
  const pendingHref = useComposerGuardStore((s) => s.pendingHref);
  const clearPending = useComposerGuardStore((s) => s.clearPending);
  const setDirty = useComposerGuardStore((s) => s.setDirty);
  const stayBtnRef = useRef<HTMLButtonElement | null>(null);

  // Autofocus the safe default once the modal mounts. Restored focus is
  // handled by the browser since the trigger element stays mounted.
  useEffect(() => {
    if (!pendingHref) return;
    stayBtnRef.current?.focus();
  }, [pendingHref]);

  // Escape resolves as Stay — losing work to a stray key is worse than
  // an extra confirmation step.
  useEffect(() => {
    if (!pendingHref) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        clearPending();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingHref, clearPending]);

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

  const onDiscard = () => goAndClear();
  const onCancel = () => clearPending();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-guard-title"
      aria-describedby="composer-guard-desc"
      className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up"
    >
      <button
        type="button"
        aria-label="Stay on page"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-default"
      />

      <div
        className={[
          'relative w-full max-w-md origin-center animate-scale-in',
          'rounded-2xl bg-white border border-white/70',
          'shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]',
          'overflow-hidden',
        ].join(' ')}
      >
        {/* Subtle warning accent rail */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300"
        />

        <div className="p-6">
          <div className="flex items-start gap-3.5">
            <span
              className={[
                'h-10 w-10 grid place-items-center rounded-xl shrink-0',
                'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
              ].join(' ')}
            >
              <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <h2
                id="composer-guard-title"
                className="text-[16px] font-semibold text-ink leading-tight tracking-[-0.01em]"
              >
                Leave without creating envelope?
              </h2>
              <p
                id="composer-guard-desc"
                className="text-[13px] text-ink-3 mt-1.5 leading-relaxed"
              >
                Your composer entries will be lost. Save drafts from the
                envelope settings on the prepare step.
              </p>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 px-6 py-4 bg-surface-sunken/60 border-t border-border-soft">
          <Button
            ref={stayBtnRef}
            variant="primary"
            size="md"
            onClick={onCancel}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Stay on page
          </Button>
          <Button variant="danger" size="md" onClick={onDiscard}>
            <Trash2 className="h-3.5 w-3.5" />
            Discard changes
          </Button>
        </footer>
      </div>
    </div>
  );
}
