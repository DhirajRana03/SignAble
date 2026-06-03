import { cn } from '@/lib/utils';

/**
 * Single skeleton primitive. Compose into card/row/text skeletons rather
 * than repeating animate-pulse + bg-paper-dim across the codebase.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-pulse rounded-sm bg-paper-dim',
        className,
      )}
      {...props}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('sheet p-5 space-y-3', className)}>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );
}

export function RowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <Skeleton className="h-7 w-7 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}
