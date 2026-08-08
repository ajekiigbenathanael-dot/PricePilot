import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'savings' | 'warning' | 'primary';

const tones: Record<Tone, string> = {
  neutral: 'bg-bg text-muted',
  savings: 'bg-savings/10 text-savings', // best price, price drop
  warning: 'bg-warning/10 text-warning', // price up
  primary: 'bg-primary/10 text-primary',
};

/**
 * Pill-shaped status badge. Color carries meaning (savings/warning), so pair
 * with text/icon — never rely on color alone (colorblind-safe).
 */
export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
