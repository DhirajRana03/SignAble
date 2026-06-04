import { cn } from '@/lib/utils';

/**
 * Wordmark — sans, paper-on-ink mark. Matches app.definable.ai compact
 * brand sizing (24px mark, 13.5px wordmark).
 */
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-1.5 select-none', className)}>
      <div className="relative h-6 w-6 shrink-0">
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
          <rect width="24" height="24" rx="6" fill="hsl(var(--ink))" />
          <text
            x="12"
            y="17"
            textAnchor="middle"
            fontFamily="inherit"
            fontSize="14"
            fontWeight="600"
            fill="hsl(var(--paper))"
            letterSpacing="-0.02em"
          >
            S
          </text>
        </svg>
      </div>
      {showText ? (
        <span className="text-[13.5px] font-semibold tracking-tight text-ink">
          SinAble
        </span>
      ) : null}
    </div>
  );
}
