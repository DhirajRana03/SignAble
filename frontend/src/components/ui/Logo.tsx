import { cn } from '@/lib/utils';

/**
 * SinAble wordmark — serif "S" with crossbar accent flourish.
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
      <div className="relative h-8 w-8 shrink-0">
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <rect
            x="0.5"
            y="0.5"
            width="31"
            height="31"
            rx="2"
            fill="hsl(var(--ink))"
            stroke="hsl(var(--ink))"
          />
          <text
            x="16"
            y="22"
            textAnchor="middle"
            fontFamily="serif"
            fontSize="20"
            fontWeight="600"
            fill="hsl(var(--paper))"
            fontStyle="italic"
          >
            S
          </text>
          <path
            d="M8 26 L24 26"
            stroke="hsl(var(--accent))"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showText ? (
        <span className="font-display text-lg leading-none">
          Sin<span className="text-accent">A</span>ble
        </span>
      ) : null}
    </div>
  );
}
