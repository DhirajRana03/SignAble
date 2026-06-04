import { cn } from '@/lib/utils';

/**
 * Wordmark — indigo gradient mark + tight sans wordmark.
 */
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      <div className="relative h-7 w-7 shrink-0">
        <svg viewBox="0 0 28 28" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="sin-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(239 90% 70%)" />
              <stop offset="100%" stopColor="hsl(260 80% 56%)" />
            </linearGradient>
          </defs>
          <rect width="28" height="28" rx="8" fill="url(#sin-mark)" />
          <text
            x="14"
            y="20"
            textAnchor="middle"
            fontFamily="inherit"
            fontSize="16"
            fontWeight="600"
            fill="white"
            letterSpacing="-0.04em"
          >
            S
          </text>
        </svg>
      </div>
      {showText ? (
        <span className="text-[15px] font-semibold tracking-[-0.022em] text-ink">
          SinAble
        </span>
      ) : null}
    </div>
  );
}
