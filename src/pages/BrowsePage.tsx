import { useMemo, useState } from 'react';
import type { PlatformMiss, Product } from '@/types';
import { CATEGORIES, categoryLabel, type CategorySlug } from '@/lib/constants';
import { FEATURED_PRODUCTS } from '@/lib/sampleProducts';
import { priceStats } from '@/lib/pricing';
import { searchProducts } from '@/lib/search';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ExternalLinkIcon, SearchIcon, SearchOffIcon, XIcon } from '@/components/ui/icons';
import { ProductCard } from '@/components/product/ProductCard';
import { PlatformSummary } from '@/components/product/PlatformSummary';

/**
 * Browse — the core of PricePilot. Two modes share one toolbar:
 *
 * • Browse (no search term): the sorted, category-filtered catalog as a card
 *   grid — for discovery.
 * • Search (a term is typed): the query fans out across every store via
 *   `searchProducts`, showing a per-platform summary (cheapest match per store,
 *   overall cheapest highlighted, "No match" where a store has nothing) with the
 *   matching products as cards below.
 *
 * Both read the static sample catalog for now and swap to a Supabase query in
 * the data phase without changing this UI.
 */

type SortKey = 'savings' | 'price-asc' | 'price-desc';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'savings', label: 'Biggest savings' },
  { key: 'price-asc', label: 'Lowest price' },
  { key: 'price-desc', label: 'Highest price' },
];

/** Order a product list by the selected sort, using each product's price stats. */
function sortProducts(products: Product[], sort: SortKey): Product[] {
  const withStats = products.map((product) => ({ product, stats: priceStats(product) }));
  withStats.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return a.stats.lowest - b.stats.lowest;
      case 'price-desc':
        return b.stats.lowest - a.stats.lowest;
      case 'savings':
      default:
        return b.stats.savings - a.stats.savings;
    }
  });
  return withStats.map((w) => w.product);
}

export function BrowsePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategorySlug | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('savings');

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery !== '';

  // Search mode: fan the query across every store (category is a pre-filter, so
  // the summary and the cards below reflect the same constraint). Phase C swaps
  // the FEATURED_PRODUCTS catalog here for the live Supabase-fetched list.
  const searchResult = useMemo(
    () => (isSearching ? searchProducts(trimmedQuery, FEATURED_PRODUCTS, { category }) : null),
    [isSearching, trimmedQuery, category],
  );

  // Browse mode: the whole (category-filtered) catalog, sorted.
  const browseList = useMemo(() => {
    const filtered = FEATURED_PRODUCTS.filter(
      (p) => category === 'all' || p.category === category,
    );
    return sortProducts(filtered, sort);
  }, [category, sort]);

  // Matching products for the card grid under the search summary, sorted.
  const searchCards = useMemo(
    () => (searchResult ? sortProducts(searchResult.products, sort) : []),
    [searchResult, sort],
  );

  const hasFilters = isSearching || category !== 'all';
  const clearFilters = () => {
    setQuery('');
    setCategory('all');
  };

  // Result count shown in the status row.
  const resultCount = isSearching ? (searchResult?.products.length ?? 0) : browseList.length;

  return (
    <Container className="py-10 sm:py-14">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Browse products</h1>
        <p className="text-muted">
          Search a product and see the cheapest total across every store — shipping included.
        </p>
      </div>

      {/* Search + sort toolbar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search headphones, textbooks, backpacks…"
            aria-label="Search products"
            className="h-12 w-full rounded-control border border-border bg-surface pl-11 pr-10 text-base text-ink placeholder:text-muted focus-visible:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-bg hover:text-ink"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <label className="sr-only" htmlFor="sort">
          Sort products
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-12 rounded-control border border-border bg-surface px-3 text-sm font-medium text-ink focus-visible:border-primary sm:w-52"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
          All
        </CategoryChip>
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.slug}
            active={category === c.slug}
            onClick={() => setCategory(c.slug)}
          >
            {c.label}
          </CategoryChip>
        ))}
      </div>

      {/* Status row: result count + clear */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          <span className="tabular font-semibold text-ink">{resultCount}</span>{' '}
          {isSearching ? (resultCount === 1 ? 'result' : 'results') : resultCount === 1 ? 'product' : 'products'}
          {isSearching ? (
            <>
              {' for '}
              <span className="font-medium text-ink">“{trimmedQuery}”</span>
            </>
          ) : (
            category !== 'all' && <> in {categoryLabel(category)}</>
          )}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
          >
            <XIcon className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Body: search results, browse grid, or an empty state */}
      {isSearching ? (
        resultCount > 0 && searchResult ? (
          <>
            {/* Per-platform price comparison */}
            <section className="mt-6">
              <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
                Price across stores
              </h2>
              <p className="mt-1 text-sm text-muted">
                The cheapest match for “{trimmedQuery}” on each store — cheapest overall highlighted.
              </p>
              <div className="mt-4">
                <PlatformSummary result={searchResult} />
              </div>
            </section>

            {/* Matching products */}
            <section className="mt-10">
              <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
                Matching products
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {searchCards.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <SearchEmptyState
            query={trimmedQuery}
            category={category}
            misses={searchResult?.misses ?? []}
            onClear={clearFilters}
          />
        )
      ) : browseList.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {browseList.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-muted">
            <SearchOffIcon className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">No products yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            No products in this category yet. Try a different category or clear your filters.
          </p>
          <Button variant="secondary" className="mt-5" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        <Badge tone="primary">Sample data</Badge>{' '}
        Prices are illustrative until live retailer data is connected.
      </p>
    </Container>
  );
}

/**
 * Empty state for a search that matched nothing. A dead end helps no one, so it
 * still hands the user an outbound link to search each store directly — the same
 * store URLs `searchProducts` returns as misses.
 */
function SearchEmptyState({
  query,
  category,
  misses,
  onClear,
}: {
  query: string;
  category: CategorySlug | 'all';
  misses: PlatformMiss[];
  onClear: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-muted">
        <SearchOffIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-display text-lg font-bold text-ink">
        No matches for “{query}”
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted">
        Nothing in our sample catalog matches your search
        {category !== 'all' && <> in {categoryLabel(category)}</>}. You can still check each store
        directly:
      </p>

      {misses.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {misses.map((m) => (
            <a
              key={m.platform}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens in a new tab"
              className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-bg px-3.5 py-1.5 text-sm font-medium text-ink transition-colors duration-150 ease-smooth hover:border-primary/40 hover:text-primary"
            >
              Search {m.retailer}
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      )}

      <Button variant="secondary" className="mt-6" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

/** Selectable category pill. Active = brand fill; inactive = hairline. */
function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ease-smooth ' +
        (active
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-ink')
      }
    >
      {children}
    </button>
  );
}
