import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-sm bg-paper border border-border-soft p-8 text-center',
        className,
      )}
    >
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="mt-1 text-[11.5px] text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
