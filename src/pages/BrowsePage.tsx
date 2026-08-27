import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PlatformMiss, Product } from '@/types';
import { CATEGORIES, categoryLabel, type CategorySlug } from '@/lib/constants';
import { priceStats } from '@/lib/pricing';
import { searchProducts } from '@/lib/search';
import { invokeLiveSearch } from '@/lib/liveSearch';
import type { LiveSearchResult } from '@/types';
import { useProducts } from '@/hooks/useProducts';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import {
  AlertTriangleIcon,
  ClockIcon,
  ExternalLinkIcon,
  SearchIcon,
  SearchOffIcon,
  TagIcon,
  XIcon,
} from '@/components/ui/icons';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
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
 * Both read the live catalog via `useProducts`; the page renders its
 * own loading, error, and empty states around that data.
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
  // State is synced to the URL so back/forward/refresh preserve the user's
  // search, category, and sort — no lost state when they navigate away.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const category = (searchParams.get('category') ?? 'all') as CategorySlug | 'all';
  const sort = (searchParams.get('sort') ?? 'savings') as SortKey;

  const updateParams = useCallback(
    (overrides: Partial<Record<'q' | 'category' | 'sort', string>>) => {
      setSearchParams(
        { q: query, category, sort, ...overrides },
        { replace: true },
      );
    },
    [query, category, sort, setSearchParams],
  );

  const setQuery = useCallback((value: string) => updateParams({ q: value }), [updateParams]);
  const setCategory = useCallback(
    (value: CategorySlug | 'all') => updateParams({ category: value }),
    [updateParams],
  );
  const setSort = useCallback((value: SortKey) => updateParams({ sort: value }), [updateParams]);

  // Live catalog from the API — the whole catalog, filtered client-side below.
  const { products, loading, error, refetch } = useProducts();

  // Products this visitor recently opened (localStorage) — surfaced as a rail in
  // browse mode so returning users can jump back to what they were comparing.
  const { products: recentProducts, clear: clearRecent } = useRecentlyViewed();

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery !== '';

  // Search mode: fan the query across every store over the live catalog
  // (category is a pre-filter, so the summary and the cards below reflect the
  // same constraint).
  const searchResult = useMemo(
    () => (isSearching ? searchProducts(trimmedQuery, products, { category }) : null),
    [isSearching, trimmedQuery, category, products],
  );

  // Live-search-on-miss state.
  const [liveResult, setLiveResult] = useState<LiveSearchResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveQueries, setLiveQueries] = useState<Set<string>>(new Set());
  // Set when the user explicitly dismisses the live results for the current
  // query, so the auto-trigger below doesn't immediately re-fetch them. Cleared
  // by the reset effect whenever the query or category changes.
  const [liveDismissed, setLiveDismissed] = useState(false);
  const liveTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (liveTimeoutRef.current) window.clearTimeout(liveTimeoutRef.current);
    };
  }, []);

  // A live search is keyed by its (query, category) pair; when either changes,
  // clear the previous attempt. Without this, `liveResult` stays set after the
  // first successful live search, so the `!liveResult` guard in
  // `shouldLiveSearch` below is permanently false and no later query ever
  // triggers another live search and a stale result/error would otherwise
  // linger on screen under the new query. Also clears any manual dismissal so a
  // genuinely new (or returning) query can live-search again.
  useEffect(() => {
    setLiveResult(null);
    setLiveError(null);
    setLiveDismissed(false);
  }, [trimmedQuery, category]);

  const hasLocalMatches = searchResult && searchResult.products.length > 0;
  const shouldLiveSearch =
    isSearching &&
    !loading &&
    !error &&
    !liveLoading &&
    !liveResult &&
    !liveDismissed &&
    !hasLocalMatches &&
    !liveQueries.has(trimmedQuery);

  useEffect(() => {
    if (!shouldLiveSearch) {
      if (liveTimeoutRef.current) window.clearTimeout(liveTimeoutRef.current);
      return;
    }

    liveTimeoutRef.current = window.setTimeout(async () => {
      if (!isMountedRef.current) return;
      setLiveLoading(true);
      setLiveError(null);
      try {
        const result = await invokeLiveSearch({ query: trimmedQuery, category });
        // A null result means the lookup succeeded but found nothing — a normal
        // "no matches" outcome, not an error. We leave liveError unset so the
        // terminal empty state (with its per-store links) renders instead of a
        // warning box.
        if (isMountedRef.current && result) {
          setLiveResult(result);
        }
      } catch (e) {
        if (isMountedRef.current) {
          setLiveError(e instanceof Error ? e.message : 'Live search failed.');
        }
      } finally {
        // Mark the query attempted whatever the outcome, so `shouldLiveSearch`
        // stays false and we never auto-refetch in a loop (a persistent error
        // would otherwise retry every 600ms). Re-attempts go through the Retry
        // button or the reset effect, which drop the query from this set.
        if (isMountedRef.current) {
          setLiveQueries((prev) => new Set(prev).add(trimmedQuery));
          setLiveLoading(false);
        }
      }
    }, 600);

    return () => {
      if (liveTimeoutRef.current) window.clearTimeout(liveTimeoutRef.current);
    };
  }, [shouldLiveSearch, trimmedQuery, category]);

  // Browse mode: the whole (category-filtered) catalog, sorted.
  const browseList = useMemo(() => {
    const filtered = products.filter((p) => category === 'all' || p.category === category);
    return sortProducts(filtered, sort);
  }, [products, category, sort]);

  // Matching products for the card grid under the search summary, sorted.
  const searchCards = useMemo(
    () => (searchResult ? sortProducts(searchResult.products, sort) : []),
    [searchResult, sort],
  );

  const hasFilters = isSearching || category !== 'all';
  const clearFilters = () => {
    setSearchParams({ q: '', category: 'all', sort }, { replace: true });
  };

  // Only show the result-count row + filtered body once there's a loaded,
  // non-empty catalog to describe (loading/error/empty are handled separately).
  const hasCatalog = !loading && !error && (products.length > 0 || liveResult);

  // Result count shown in the status row.
  const localProductCount = searchResult?.products.length ?? 0;
  const liveProductCount = liveResult?.products.length ?? 0;
  const resultCount = isSearching
    ? localProductCount + liveProductCount
    : browseList.length;

  const searchMisses = searchResult?.misses ?? [];

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

      {/* Recently viewed — a quick way back to products just compared. Shown in
          browse mode only (hidden while searching) once a catalog is loaded. */}
      {!isSearching && hasCatalog && recentProducts.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted" />
            <h2 className="font-display text-lg font-bold text-ink sm:text-xl">Recently viewed</h2>
            <button
              type="button"
              onClick={clearRecent}
              className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted hover:text-ink"
            >
              <XIcon className="h-4 w-4" />
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {recentProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Status row: result count + clear (only once a catalog is loaded) */}
      {hasCatalog && (
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
      )}

      {/* Body: loading / error / empty catalog, else search or browse results */}
      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <LoadErrorState message={error} onRetry={refetch} />
      ) : products.length === 0 ? (
        <CatalogEmptyState />
      ) : isSearching ? (
        <>
          {/* Local catalog matches */}
          {searchResult && searchResult.products.length > 0 && (
            <>
              <section className="mt-6">
                <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
                  Price across stores
                </h2>
                <p className="mt-1 text-sm text-muted">
                  The cheapest match for &ldquo;{trimmedQuery}&rdquo; on each store — cheapest overall highlighted.
                </p>
                <div className="mt-4">
                  <PlatformSummary result={searchResult} />
                </div>
              </section>

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
          )}

          {/* Live search results */}
          {liveResult && liveResult.products.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
                  Live results from Jumia
                </h2>
                <span className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  Live
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLiveResult(null);
                    setLiveDismissed(true);
                    setLiveQueries((prev) => {
                      const next = new Set(prev);
                      next.delete(trimmedQuery);
                      return next;
                    });
                  }}
                  aria-label="Clear live results"
                  className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  <XIcon className="h-4 w-4" />
                  Clear results
                </button>
              </div>
              <p className="mt-1 text-sm text-muted">
                Prices pulled directly from Jumia just now. Added to our catalog for future searches.
              </p>
              <div className="mt-4">
                <PlatformSummary result={liveResult} />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sortProducts(liveResult.products, sort).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}

          {/* Live search loading — also shown during the debounce window before
              the fetch fires, so a local miss never flashes a blank gap. */}
          {(liveLoading || shouldLiveSearch) && (
            <div className="mt-8 flex items-center gap-3 rounded-card border border-border bg-surface px-5 py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
              <p className="text-sm text-muted">
                Checking live prices from Jumia for &ldquo;{trimmedQuery}&rdquo;…
              </p>
            </div>
          )}

          {/* Live search error */}
          {liveError && !liveLoading && (
            <div className="mt-6 flex items-center justify-between gap-4 rounded-card border border-warning/40 bg-warning/5 px-5 py-4">
              <p className="text-sm text-warning">{liveError}</p>
              <button
                type="button"
                onClick={() => {
                  setLiveError(null);
                  setLiveQueries((prev) => {
                    const next = new Set(prev);
                    next.delete(trimmedQuery);
                    return next;
                  });
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-warning/40 bg-surface px-3 py-1.5 text-sm font-medium text-warning hover:bg-warning/10"
              >
                Retry
              </button>
            </div>
          )}

          {/* Nothing anywhere: zero local matches and the live lookup has
              concluded (not pending, not loading) with no results and no
              retryable error. */}
          {searchResult &&
            searchResult.products.length === 0 &&
            !shouldLiveSearch &&
            !liveLoading &&
            !liveResult &&
            !liveError &&
            !liveDismissed && (
              <SearchEmptyState
                query={trimmedQuery}
                category={category}
                misses={searchMisses}
                onClear={clearFilters}
              />
            )}
        </>
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
          <h2 className="mt-4 font-display text-lg font-bold text-ink">Nothing in this category</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            No products in {categoryLabel(category as CategorySlug)} yet. Try a different category
            or clear your filters.
          </p>
          <Button variant="secondary" className="mt-5" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}
    </Container>
  );
}

/** Grid of placeholder cards shown while the live catalog loads. */
function SkeletonGrid() {
  return (
    <div
      className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Shown when the catalog fetch fails — with a retry back into `useProducts`. */
function LoadErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
        <AlertTriangleIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-display text-lg font-bold text-ink">Couldn’t load products</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      <Button variant="secondary" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/**
 * Shown when the catalog is genuinely empty. PricePilot lists only real, scraped
 * store prices, so before the first ingest run there is simply nothing to show —
 * we say that honestly rather than inventing placeholder products.
 */
function CatalogEmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-muted">
        <TagIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-display text-lg font-bold text-ink">No products yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        PricePilot only shows real prices pulled live from the stores. We’re adding them
        now — check back soon.
      </p>
    </div>
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
