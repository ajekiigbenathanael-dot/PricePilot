import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

/**
 * PricePilot wordmark + glyph. The blue "P" mark with a green savings dot
 * echoes the brand: trust blue + savings green.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M9 21V11a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8h-5v3a1 1 0 1 1-2 0Zm2-5h5a2 2 0 0 0 0-4h-5v4Z"
          fill="#fff"
        />
        <circle cx="22.5" cy="21.5" r="2.5" className="fill-savings" />
      </svg>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">
        {APP_NAME}
      </span>
    </span>
  );
}
