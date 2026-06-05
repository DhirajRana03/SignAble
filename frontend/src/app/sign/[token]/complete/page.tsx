'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Logo } from '@/components/ui/Logo';

/**
 * Post-submission landing page. Shows brief "thank you" then forwards
 * to the standalone signed-document view (`/sign/:token/document`)
 * so recipients see only the document, never the platform shell.
 *
 * Kept as a separate route from `/document` to preserve the success
 * flash on submit while letting the document page act as a stable
 * permalink from email.
 */
export default function SignCompletePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      router.replace(`/sign/${token}/document`);
    }, 1800);
    return () => clearTimeout(timer);
  }, [router, token]);

  return (
    <div className="h-screen flex flex-col bg-paper-dim">
      <header className="border-b border-border bg-paper/90">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center">
          <Logo />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="glass relative overflow-hidden p-12 max-w-lg text-center animate-fade-up">
          <div
            aria-hidden
            className="absolute -inset-x-10 top-0 h-32 bg-gradient-to-b from-accent/15 to-transparent"
          />
          <div className="relative">
            <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-success"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M20 6 9 17l-5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="label-mono mb-2">Signed &amp; sealed</p>
            <h1 className="font-display text-3xl tracking-tight mb-3">
              Thank you.
            </h1>
            <p className="text-sm text-ink-soft text-pretty">
              Your signature has been recorded. Redirecting you to the
              signed document…
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 h-12 flex items-center justify-center">
          <p className="label-mono">SignAble · signed with intent</p>
        </div>
      </footer>
    </div>
  );
}
