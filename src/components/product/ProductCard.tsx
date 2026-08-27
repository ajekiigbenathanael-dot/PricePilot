import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { categoryLabel, productPath } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { priceStats, priceTrend } from '@/lib/pricing';
import { deleteProduct } from '@/lib/products';
import { toast } from '@/hooks/useToast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TrendDownIcon, TrendUpIcon, TrashIcon } from '@/components/ui/icons';
import { ProductImage } from './ProductImage';
import { LivePriceTicker } from './LivePriceTicker';

/**
 * Compact product card for grids (landing "trending deals", browse results,
 * wishlist). Leads with the best price and the amount saved — the numbers do
 * the talking. Whole card is a link to the comparison view.
 *
 * When `onDeleted` is provided AND the current user added this product
 * (`added_by_me`), a small remove control appears on the thumbnail so they can
 * clean up an entry they introduced. Grids that don't pass `onDeleted` (landing,
 * wishlist) never show it. The server re-verifies ownership on delete, so this
 * is only a UI affordance.
 */
export function ProductCard({
  product,
  onDeleted,
}: {
  product: Product;
  /** Called after the product is deleted server-side, so the parent can drop it. */
  onDeleted?: (id: string) => void;
}) {
  const { lowest, savings, storeCount } = priceStats(product);
  const trend = priceTrend(product.price_history);
  const canRemove = Boolean(onDeleted) && product.added_by_me;

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
          {canRemove && onDeleted && (
            <CardDeleteControl productId={product.id} onDeleted={onDeleted} />
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          {/* Live price-change row — reserved height so event-less cards stay
              the same height as cards that have a ticker. */}
          <div className="mb-1.5 min-h-[1.25rem]">
            <LivePriceTicker events={product.price_events ?? []} />
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

/**
 * The remove affordance on a card thumbnail: a trash button that expands to an
 * inline "Remove this product?" confirm over the image. Every handler stops the
 * click from bubbling to the wrapping card link, so interacting here never
 * navigates. On success the parent's `onDeleted` drops the card from its list.
 */
function CardDeleteControl({
  productId,
  onDeleted,
}: {
  productId: string;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The card is a <Link>; keep every click here from navigating.
  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const openConfirm = (e: MouseEvent) => {
    stop(e);
    setConfirming(true);
  };

  const cancel = (e: MouseEvent) => {
    stop(e);
    setConfirming(false);
  };

  const confirm = async (e: MouseEvent) => {
    stop(e);
    setDeleting(true);
    try {
      await deleteProduct(productId);
      toast.success('Product removed from the catalog.');
      onDeleted(productId); // parent removes this card; no local reset needed
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove this product.');
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div
        onClick={stop}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/90 p-4 text-center backdrop-blur-sm"
      >
        <p className="text-sm font-semibold text-ink">Remove this product?</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={cancel} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={confirm} disabled={deleting}>
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openConfirm}
      aria-label="Remove this product"
      title="Remove this product"
      className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 text-muted backdrop-blur transition-colors duration-150 ease-smooth hover:bg-surface hover:text-danger"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
