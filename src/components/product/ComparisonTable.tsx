import type { RetailerOffer, Product } from '@/types';
import { cn, formatPrice } from '@/lib/utils';
import { comparisonRows, type ComparisonRow } from '@/lib/pricing';
import { Badge } from '@/components/ui/Badge';
import { CheckIcon, ExternalLinkIcon } from '@/components/ui/icons';

/**
 * The heart of the product page: every platform we compare, shown as a row —
 * item price, delivery, and honest total (price + delivery), cheapest total
 * highlighted. Stores that don't carry the product appear as "Not listed",
 * never blank and never a fake price. PricePilot never sells: each row's action
 * is an outbound "View on [Store]" link, not a buy button.
 *
 * Renders a real table on sm+ (scannable columns) and stacked cards on mobile.
 * Both read from the same `comparisonRows(product)` model, so they can't drift.
 */
export function ComparisonTable({ product }: { product: Product }) {
  const rows = comparisonRows(product);

  return (
    <div>
      {/* Desktop / tablet: aligned columns */}
      <div className="hidden overflow-hidden rounded-card border border-border bg-surface shadow-card sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">
                Store
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Item price
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Delivery
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Total
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">Open store listing</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <DesktopRow key={row.platform} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <MobileRow key={row.platform} row={row} />
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted">
        Totals include each store’s listed delivery. PricePilot never sells — you
        buy directly on the store’s own site. Prices are illustrative sample data.
      </p>
    </div>
  );
}

/** Outbound link to a store listing, styled like a button. Never says "Buy". */
export function ViewOnButton({
  offer,
  primary = false,
  className,
}: {
  offer: RetailerOffer;
  primary?: boolean;
  className?: string;
}) {
  return (
    <a
      href={offer.url}
      target="_blank"
      rel="noopener noreferrer"
      title="Opens in a new tab"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-control px-3.5 text-sm font-medium transition-colors duration-150 ease-smooth',
        primary
          ? 'bg-primary text-white hover:bg-primary-hover'
          : 'border border-border bg-surface text-ink hover:bg-bg',
        className,
      )}
    >
      View on {offer.retailer}
      <ExternalLinkIcon className="h-3.5 w-3.5" />
    </a>
  );
}

/** A single `<tr>` in the desktop table. */
function DesktopRow({ row }: { row: ComparisonRow }) {
  const { offer, isCheapest, retailer, total } = row;

  if (!offer) {
    return (
      <tr className="border-b border-border last:border-0">
        <td className="px-4 py-4 font-medium text-muted">{retailer}</td>
        <td className="px-4 py-4 text-right text-muted">—</td>
        <td className="px-4 py-4 text-right text-muted">—</td>
        <td className="px-4 py-4 text-right text-muted">—</td>
        <td className="px-4 py-4 text-right">
          <Badge tone="neutral">Not listed</Badge>
        </td>
      </tr>
    );
  }

  const outOfStock = !offer.inStock;

  return (
    <tr
      className={cn(
        'border-b border-border last:border-0',
        isCheapest && 'bg-savings/5',
      )}
    >
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{retailer}</span>
          {isCheapest && (
            <Badge tone="savings">
              <CheckIcon className="h-3 w-3" />
              Best price
            </Badge>
          )}
          {outOfStock && <Badge tone="neutral">Out of stock</Badge>}
        </div>
      </td>
      <td className="tabular px-4 py-4 text-right text-ink">{formatPrice(offer.price)}</td>
      <td className="tabular px-4 py-4 text-right text-muted">
        {offer.shipping === 0 ? 'Free' : formatPrice(offer.shipping)}
      </td>
      <td
        className={cn(
          'tabular px-4 py-4 text-right font-bold',
          isCheapest ? 'text-savings' : 'text-ink',
        )}
      >
        {formatPrice(total ?? offer.price)}
      </td>
      <td className="px-4 py-4 text-right">
        <ViewOnButton offer={offer} primary={isCheapest} />
      </td>
    </tr>
  );
}

/** A single stacked card in the mobile layout. */
function MobileRow({ row }: { row: ComparisonRow }) {
  const { offer, isCheapest, retailer, total } = row;

  return (
    <li
      className={cn(
        'rounded-card border p-4',
        isCheapest ? 'border-savings/40 bg-savings/5' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{retailer}</span>
          {isCheapest && (
            <Badge tone="savings">
              <CheckIcon className="h-3 w-3" />
              Best
            </Badge>
          )}
          {!offer && <Badge tone="neutral">Not listed</Badge>}
          {offer && !offer.inStock && <Badge tone="neutral">Out of stock</Badge>}
        </div>
        {offer && (
          <div
            className={cn(
              'tabular text-lg font-extrabold',
              isCheapest ? 'text-savings' : 'text-ink',
            )}
          >
            {formatPrice(total ?? offer.price)}
          </div>
        )}
      </div>

      {offer ? (
        <>
          <div className="tabular mt-1 text-xs text-muted">
            {formatPrice(offer.price)}
            {' + '}
            {offer.shipping === 0 ? 'free delivery' : `${formatPrice(offer.shipping)} delivery`}
          </div>
          <ViewOnButton offer={offer} primary={isCheapest} className="mt-3 w-full" />
        </>
      ) : (
        <p className="mt-1 text-xs text-muted">This store doesn’t stock this item.</p>
      )}
    </li>
  );
}
