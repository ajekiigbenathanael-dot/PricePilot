import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { categoryLabel, productPath } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { priceStats, priceTrend } from '@/lib/pricing';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TrendDownIcon, TrendUpIcon } from '@/components/ui/icons';
import { ProductImage } from './ProductImage';
import { LivePriceTicker } from './LivePriceTicker';

/**
 * Compact product card for grids (landing "trending deals", browse results,
 * wishlist). Leads with the best price and the amount saved — the numbers do
 * the talking. Whole card is a link to the comparison view.
 */
export function ProductCard({ product }: { product: Product }) {
  const { lowest, savings, storeCount } = priceStats(product);
  const trend = priceTrend(product.price_history);

  return (
    <Link to={productPath(product.id)} className="group block h-full">
      <Card interactive className="flex h-full flex-col overflow-hidden">
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] w-full border-b border-border">
          <ProductImage product={product} className="h-full w-full" />
          {trend.direction === 'down' && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-savings/10 px-2.5 py-0.5 text-xs font-semibold text-savings backdrop-blur">
              <TrendDownIcon className="h-3.5 w-3.5" />
              {formatPrice(trend.delta)} this month
            </span>
          )}
          {trend.direction === 'up' && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning backdrop-blur">
              <TrendUpIcon className="h-3.5 w-3.5" />
              {formatPrice(trend.delta)} this month
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          {/* Live price-change row — reserved height so event-less cards stay
              the same height as cards that have a ticker. */}
          <div className="mb-1.5 min-h-[1.25rem]">
            <LivePriceTicker events={product.price_events} />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {categoryLabel(product.category)}
          </span>
          <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] font-display text-base font-bold leading-snug text-ink group-hover:text-primary">
            {product.title}
          </h3>

          {/* Price footer */}
          <div className="mt-auto flex items-end justify-between pt-4">
            <div>
              <div className="tabular text-xl font-extrabold text-ink">
                {formatPrice(lowest)}
              </div>
              <div className="text-xs text-muted">
                Best of {storeCount} {storeCount === 1 ? 'store' : 'stores'}
              </div>
            </div>
            {savings >= 1 && (
              <Badge tone="savings">Save {formatPrice(savings)}</Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
