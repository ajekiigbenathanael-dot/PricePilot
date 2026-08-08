import { useEffect, useState } from 'react';
import type { PriceEvent } from '@/types';
import { cn, formatPrice } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { ClockIcon, TrendDownIcon, TrendUpIcon } from '@/components/ui/icons';

const ROTATE_MS = 3500; // hold each event before advancing to the next

/** "45m ago" / "3h ago" / "2d ago" from minutes-since-change. */
function relativeTime(minutesAgo: number): string {
  if (minutesAgo < 60) return `${Math.max(1, Math.round(minutesAgo))}m ago`;
  const hours = minutesAgo / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * A small "live" price-change label for a product card — e.g.
 * `▼ ₦1,500 on Temu · 45m ago`. Cycles through the product's recent
 * `price_events` on a timer to make the catalog feel alive.
 *
 * Design constraints:
 * - Single line, fixed height (parent reserves the slot) so rotation never
 *   shifts card layout.
 * - Respects `prefers-reduced-motion`: shows the first event statically, no
 *   rotation. Also static when there's only one event.
 * - Renders nothing when there are no events (the card stays valid).
 *
 * The data is illustrative for now; a real change-feed populates `price_events`
 * with the same shape, so this component won't change.
 */
export function LivePriceTicker({
  events,
  className,
}: {
  events: PriceEvent[];
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  const canRotate = !reducedMotion && events.length > 1;

  useEffect(() => {
    if (!canRotate) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % events.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [canRotate, events.length]);

  if (events.length === 0) return null;

  // Guard the index in case `events` shrank between renders.
  const event = events[index % events.length];
  const isDown = event.direction === 'down';
  const Icon = isDown ? TrendDownIcon : TrendUpIcon;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium text-muted',
        className,
      )}
      aria-live="off"
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 font-semibold',
          isDown ? 'text-savings' : 'text-warning',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {isDown ? 'Dropped' : 'Up'} {formatPrice(event.delta)}
      </span>
      <span className="truncate">
        on {event.retailer}
        <span className="mx-1 text-border">·</span>
        <span className="inline-flex items-center gap-1 align-middle">
          <ClockIcon className="h-3 w-3" />
          {relativeTime(event.minutesAgo)}
        </span>
      </span>
    </div>
  );
}
