import type { Product } from '@/types';
import { categoryLabel } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { offerTotal, priceStats, sortedOffers } from '@/lib/pricing';
import { Badge } from '@/components/ui/Badge';
import { BellIcon, CheckIcon } from '@/components/ui/icons';
import { ProductImage } from './ProductImage';

/**
 * The hero's centerpiece: a self-contained comparison card that demonstrates
 * exactly what PricePilot does — same product, every store, cheapest total
 * highlighted, savings made obvious. Static by design (illustrative data).
 */
export function HeroComparison({ product }: { product: Product }) {
  const { lowest, savings, storeCount } = priceStats(product);
  const offers = sortedOffers(product);

  return (
    <div className="rounded-card border border-border bg-surface shadow-card-hover">
      {/* Product header */}
      <div className="flex items-center gap-4 border-b border-border p-5">
        <ProductImage
          product={product}
          className="h-16 w-16 shrink-0 rounded-control border border-border"
        />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            {categoryLabel(product.category)}
          </div>
          <h3 className="truncate font-display text-base font-bold text-ink">
            {product.title}
          </h3>
        </div>
      </div>

      {/* Offer list, cheapest first */}
      <div className="space-y-2 p-5">
        {offers.map((offer, i) => {
          const isBest = i === 0;
          const total = offerTotal(offer);
          return (
            <div
              key={offer.retailer}
              className={
                'flex items-center justify-between rounded-control border px-3.5 py-2.5 ' +
                (isBest
                  ? 'border-savings/40 bg-savings/5'
                  : 'border-transparent bg-bg')
              }
            >
              <div className="flex items-center gap-2.5">
                <span className="font-medium text-ink">{offer.retailer}</span>
                {isBest && (
                  <Badge tone="savings">
                    <CheckIcon className="h-3 w-3" />
                    Best price
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div
                  className={
                    'tabular font-bold ' + (isBest ? 'text-savings' : 'text-ink')
                  }
                >
                  {formatPrice(total)}
                </div>
                <div className="text-[11px] text-muted">
                  {offer.shipping === 0
                    ? 'Free shipping'
                    : `+ ${formatPrice(offer.shipping)} shipping`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Savings summary */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-bg px-5 py-4">
        <div>
          <div className="text-xs text-muted">
            Best price across {storeCount} stores
          </div>
          <div className="tabular text-2xl font-extrabold text-ink">
            {formatPrice(lowest)}
            <span className="ml-2 text-sm font-semibold text-savings">
              save {formatPrice(savings)}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted">
          <BellIcon className="h-4 w-4 text-primary" />
          Alert me
        </span>
      </div>
    </div>
  );
}
