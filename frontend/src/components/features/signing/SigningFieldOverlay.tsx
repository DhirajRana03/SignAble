'use client';

import { Check, Pen } from 'lucide-react';
import { type RefObject } from 'react';

import { useElementSize } from '@/hooks/useElementSize';
import { cn } from '@/lib/utils';
import type { SignatureField } from '@/types/envelope.types';

interface Props {
  pageIndex: number;
  pageRef: RefObject<HTMLDivElement>;
  fields: SignatureField[];
  values: Record<string, string>;
  onFieldClick: (field: SignatureField) => void;
}

/**
 * Renders signer-facing field placeholders.
 * Clicking a field calls back to parent which opens the appropriate input.
 */
export function SigningFieldOverlay({
  pageIndex,
  pageRef,
  fields,
  values,
  onFieldClick,
}: Props) {
  const { width, height } = useElementSize(pageRef);
  const pageFields = fields.filter((f) => f.pageNumber === pageIndex + 1);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {pageFields.map((f) => {
        const value = values[f.id];
        const filled = !!value;

        return (
          <button
            key={f.id}
            onClick={(e) => {
              e.preventDefault();
              onFieldClick(f);
            }}
            style={{
              left: f.xPct * (width || 0),
              top: f.yPct * (height || 0),
              width: f.widthPct * (width || 0),
              height: f.heightPct * (height || 0),
            }}
            className={cn(
              'absolute pointer-events-auto rounded-sm transition-all border-2 group',
              filled
                ? 'border-success bg-success/5'
                : 'border-accent bg-accent-tint/70 hover:bg-accent-tint hover:border-accent-deep shadow-coral animate-pulse-coral',
              'flex items-center justify-center',
            )}
          >
            {filled ? (
              f.fieldType === 'SIGNATURE' || f.fieldType === 'INITIALS' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={value}
                  alt="Signature"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-sm font-medium truncate px-2">
                  {value}
                </span>
              )
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-accent">
                <Pen className="h-3 w-3" />
                {f.fieldType.toLowerCase()}
                {f.required ? ' *' : ''}
              </span>
            )}

            {filled ? (
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-success text-paper flex items-center justify-center">
                <Check className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
