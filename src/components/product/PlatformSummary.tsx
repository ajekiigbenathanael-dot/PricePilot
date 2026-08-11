import { Link } from 'react-router-dom';
import type { PlatformMiss, PlatformQuote, SearchResult } from '@/types';
import { cn, formatPrice } from '@/lib/utils';
import { productPath } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';
import { CheckIcon, ExternalLinkIcon, SearchIcon } from '@/components/ui/icons';
import { ProductImage } from './ProductImage';

/**
 * Per-platform search summary — the payoff of a query. One row per store we
 * compare: the cheapest matching item that store carries, its honest total
 * (price + delivery), and an outbound "View on [Store]" link. The single
 * cheapest total across every store is highlighted. Stores that carry nothing
 * for the query show "No match" and still offer a link to search the store
 * directly, so a miss is never a dead end.
 *
 * Reads only from a {@link SearchResult} (built by `lib/search.ts`), so when
 * real scraping replaces the sample adapters this component is untouched.
 * Renders aligned columns on sm+ and stacked cards on mobile — both from the
 * same quotes/misses, so the two layouts can't drift.
 */
export function PlatformSummary({ result }: { result: SearchResult }) {
  const { quotes, misses } = result;

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
              <th scope="col" className="px-4 py-3 font-semibold">
                Cheapest match
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Total
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">Open store</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <QuoteRow key={quote.platform} quote={quote} />
            ))}
            {misses.map((miss) => (
              <MissRow key={miss.platform} miss={miss} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 sm:hidden">
        {quotes.map((quote) => (
          <QuoteCard key={quote.platform} quote={quote} />
        ))}
        {misses.map((miss) => (
          <MissCard key={miss.platform} miss={miss} />
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted">
        Each row is the cheapest matching item that store carries, delivery included. PricePilot
        never sells — you buy directly on the store’s own site. Prices are illustrative sample data.
      </p>
    </div>
  );
}

/** Outbound link to a store, styled like a button. Never says "Buy". */
function OutboundButton({
  href,
  children,
  primary = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
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
      {children}
      <ExternalLinkIcon className="h-3.5 w-3.5" />
    </a>
  );
}

/** Small product thumbnail + linked title, shared by the quote row and card. */
function MatchIdentity({ quote }: { quote: PlatformQuote }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-control border border-border">
        <ProductImage product={quote.product} className="h-full w-full" />
      </div>
      <Link
        to={productPath(quote.product.id)}
        className="line-clamp-2 font-medium text-ink hover:text-primary"
      >
        {quote.product.title}
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------- Desktop rows */

/** A store that had a match — a `<tr>` in the desktop table. */
function QuoteRow({ quote }: { quote: PlatformQuote }) {
  const { retailer, total, price, shipping, isCheapest, url } = quote;

  return (
    <tr className={cn('border-b border-border last:border-0', isCheapest && 'bg-savings/5')}>
      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{retailer}</span>
          {isCheapest && (
            <Badge tone="savings">
              <CheckIcon className="h-3 w-3" />
              Best price
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <MatchIdentity quote={quote} />
      </td>
      <td className="px-4 py-4 text-right align-top">
        <div className={cn('tabular font-bold', isCheapest ? 'text-savings' : 'text-ink')}>
          {formatPrice(total)}
        </div>
        <div className="tabular mt-0.5 text-xs text-muted">
          {formatPrice(price)}
          {' + '}
          {shipping === 0 ? 'free delivery' : `${formatPrice(shipping)} delivery`}
        </div>
      </td>
      <td className="px-4 py-4 text-right align-top">
        <OutboundButton href={url} primary={isCheapest}>
          View on {retailer}
        </OutboundButton>
      </td>
    </tr>
  );
}

/** A store with nothing for the query — a `<tr>` in the desktop table. */
function MissRow({ miss }: { miss: PlatformMiss }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-4 align-top font-medium text-muted">{miss.retailer}</td>
      <td className="px-4 py-4">
        <Badge tone="neutral">No match</Badge>
      </td>
      <td className="px-4 py-4 text-right align-top text-muted">—</td>
      <td className="px-4 py-4 text-right align-top">
        <OutboundButton href={miss.url}>Search {miss.retailer}</OutboundButton>
      </td>
    </tr>
  );
}

/* --------------------------------------------------------------- Mobile cards */

/** A store that had a match — stacked card on mobile. */
function QuoteCard({ quote }: { quote: PlatformQuote }) {
  const { retailer, total, price, shipping, isCheapest, url } = quote;

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
        </div>
        <div className={cn('tabular text-lg font-extrabold', isCheapest ? 'text-savings' : 'text-ink')}>
          {formatPrice(total)}
        </div>
      </div>

      <div className="mt-3">
        <MatchIdentity quote={quote} />
      </div>

      <div className="tabular mt-2 text-xs text-muted">
        {formatPrice(price)}
        {' + '}
        {shipping === 0 ? 'free delivery' : `${formatPrice(shipping)} delivery`}
      </div>

      <OutboundButton href={url} primary={isCheapest} className="mt-3 w-full">
        View on {retailer}
      </OutboundButton>
    </li>
  );
}

/** A store with nothing for the query — stacked card on mobile. */
function MissCard({ miss }: { miss: PlatformMiss }) {
  return (
    <li className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{miss.retailer}</span>
        <Badge tone="neutral">No match</Badge>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
        <SearchIcon className="h-3.5 w-3.5" />
        This store carries nothing for your search.
      </p>
      <OutboundButton href={miss.url} className="mt-3 w-full">
        Search {miss.retailer}
      </OutboundButton>
    </li>
  );
}
