import type { PricePoint } from '@/types';
import { cn, formatPrice } from '@/lib/utils';
import { priceHistoryStats } from '@/lib/pricing';

/**
 * A compact, dependency-free price-history sparkline. Draws the series as a
 * single polyline over a soft area fill, colored by the overall direction
 * (down = savings green, up = warning amber, flat = muted), with a dot on the
 * latest point.
 *
 * The SVG uses a fixed viewBox and scales to the container width; a reserved
 * height keeps layout stable. Purely decorative to sighted users, so the chart
 * carries an `aria-label` summarizing the trend for assistive tech.
 */
export function PriceSparkline({
  history,
  className,
}: {
  history: PricePoint[];
  className?: string;
}) {
  const stats = priceHistoryStats(history);
  // Need at least two points to draw a meaningful line.
  if (!stats) return null;

  const { min, max, first, last, direction } = stats;

  // viewBox units — the SVG stretches to the container via width="100%".
  const W = 100;
  const H = 32;
  const pad = 2;
  const span = max - min || 1; // avoid divide-by-zero on a flat series
  const n = history.length;

  const xAt = (i: number): number =>
    n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2);
  const yAt = (price: number): number =>
    pad + (1 - (price - min) / span) * (H - pad * 2);

  const linePoints = history.map((p, i) => `${xAt(i).toFixed(2)},${yAt(p.price).toFixed(2)}`);
  const line = linePoints.join(' ');
  // Close the area down to the baseline for the soft fill under the line.
  const area = `${xAt(0).toFixed(2)},${(H - pad).toFixed(2)} ${line} ${xAt(n - 1).toFixed(
    2,
  )},${(H - pad).toFixed(2)}`;

  const color =
    direction === 'down'
      ? 'text-savings'
      : direction === 'up'
        ? 'text-warning'
        : 'text-muted';

  const label = `Price ${
    direction === 'down' ? 'fell' : direction === 'up' ? 'rose' : 'held steady'
  } from ${formatPrice(first)} to ${formatPrice(last)} across ${n} recent readings.`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn('h-16 w-full', color, className)}
    >
      <polygon points={area} className="fill-current" opacity={0.1} stroke="none" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={xAt(n - 1)}
        cy={yAt(last)}
        r={2}
        className="fill-current"
        stroke="var(--color-surface, #fff)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
