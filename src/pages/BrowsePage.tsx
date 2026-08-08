import { useMemo, useState } from 'react';
import { CATEGORIES, type CategorySlug } from '@/lib/constants';
import { FEATURED_PRODUCTS } from '@/lib/sampleProducts';
import { priceStats } from '@/lib/pricing';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SearchIcon, SearchOffIcon, XIcon } from '@/components/ui/icons';
import { ProductCard } from '@/components/product/ProductCard';

/**
 * Browse — the core of PricePilot: search or filter the catalog, then scan
 * each product's best price across every store (cheapest total wins). Reads the
 * static sample catalog for now; swaps to a Supabase query in the data phase
 * without changing this UI.
 */

type SortKey = 'savings' | 'price-asc' | 'price-desc';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'savings', label: 'Biggest savings' },
  { key: 'price-asc', label: 'Lowest price' },
  { key: 'price-desc', label: 'Highest price' },
];

export function BrowsePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategorySlug | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('savings');

  // Derive stats once per product so search, filter, and sort share them.
  const catalog = useMemo(
    () => FEATURED_PRODUCTS.map((product) => ({ product, stats: priceStats(product) })),
    [],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = catalog.filter(({ product }) => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesQuery =
        q === '' ||
        product.title.toLowerCase().includes(q) ||
        (product.brand?.toLowerCase().includes(q) ?? false);
      return matchesCategory && matchesQuery;
    });

    return filtered.sort((a, b) => {
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
  }, [catalog, query, category, sort]);

  const hasFilters = query.trim() !== '' || category !== 'all';
  const clearFilters = () => {
    setQuery('');
    setCategory('all');
  };

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

      {/* Result count + clear */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted">
          <span className="tabular font-semibold text-ink">{results.length}</span>{' '}
          {results.length === 1 ? 'product' : 'products'}
          {hasFilters && ' match your filters'}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
          >
            <XIcon className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Results grid or empty state */}
      {results.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ product }) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-muted">
            <SearchOffIcon className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">No products found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {query.trim()
              ? `Nothing matches “${query.trim()}”.`
              : 'No products in this category yet.'}{' '}
            Try a different search or clear your filters.
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
