import { cn } from '@/lib/utils';

/**
 * SinAble wordmark — coral "S" mark + serif wordmark.
 * Aligned with definable.ai's brand stack: Playfair Display serif + coral accent.
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
          {/* Soft coral disc with ink mark inside */}
          <rect
            x="0.5"
            y="0.5"
            width="31"
            height="31"
            rx="6"
            fill="hsl(var(--accent))"
            stroke="hsl(var(--accent-deep))"
          />
          <text
            x="16"
            y="22"
            textAnchor="middle"
            fontFamily="Playfair Display, serif"
            fontSize="20"
            fontWeight="600"
            fill="hsl(var(--paper))"
            fontStyle="italic"
          >
            S
          </text>
        </svg>
      </div>
      {showText ? (
        <span className="font-display text-lg leading-none tracking-tight">
          Sin<span className="italic-accent">A</span>ble
        </span>
      ) : null}
    </div>
  );
}
