'use client';

import { Check, Pen } from 'lucide-react';
import { type RefObject } from 'react';

import { useElementSize } from '@/hooks/useElementSize';
import { cn, recipientColor } from '@/lib/utils';
import type { Recipient, SignatureField } from '@/types/envelope.types';

interface Props {
  pageIndex: number;
  pageRef: RefObject<HTMLDivElement | null>;
  fields: SignatureField[];
  recipients: Recipient[];
}

/**
 * Read-only field overlay for envelope detail view. Renders all placed
 * fields with recipient-colored borders + signed indicator. No interaction.
 */
export function ReadOnlyFieldOverlay({
  pageIndex,
  pageRef,
  fields,
  recipients,
}: Props) {
  const { width, height } = useElementSize(
    pageRef as RefObject<HTMLElement>,
  );
  const pageFields = fields.filter((f) => f.pageNumber === pageIndex + 1);
  const recipientIndex = new Map(recipients.map((r, i) => [r.id, i]));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {pageFields.map((f) => {
        const ridx = recipientIndex.get(f.recipientId) ?? 0;
        const color = recipientColor(ridx);
        const signed = !!f.signedAt || !!f.value;

        return (
          <div
            key={f.id}
            style={{
              left: f.xPct * (width || 0),
              top: f.yPct * (height || 0),
              width: f.widthPct * (width || 0),
              height: f.heightPct * (height || 0),
            }}
            className={cn(
              'absolute rounded-sm border-2 flex items-center justify-center',
              signed ? 'bg-success/5 border-success' : color.bg,
              !signed && 'border-current',
              !signed && color.fg,
            )}
          >
            {signed && f.value &&
            (f.fieldType === 'SIGNATURE' || f.fieldType === 'INITIALS') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.value}
                alt="Signature"
                className="max-h-full max-w-full object-contain"
              />
            ) : signed && f.value ? (
              <span className="text-[11px] font-medium truncate px-2 text-ink">
                {f.value}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider">
                <Pen className="h-3 w-3" />
                {f.fieldType.toLowerCase()}
                {f.required ? ' *' : ''}
              </span>
            )}

            {signed ? (
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-success text-white flex items-center justify-center">
                <Check className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
