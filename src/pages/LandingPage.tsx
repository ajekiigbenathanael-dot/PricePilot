import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { CATEGORIES, PLATFORMS, ROUTES } from '@/lib/constants';
import { priceStats } from '@/lib/pricing';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { TypewriterHeadline } from '@/components/ui/TypewriterHeadline';
import {
  ArrowRightIcon,
  BellIcon,
  BoltIcon,
  CheckIcon,
  SearchIcon,
  ShieldCheckIcon,
  TagIcon,
} from '@/components/ui/icons';
import { HeroComparison } from '@/components/product/HeroComparison';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { CATEGORY_BLURB, CATEGORY_ICON } from '@/components/product/categoryMeta';

/**
 * The headline product for the hero comparison card. We want the most
 * convincing demo: a product carried by several stores (so there's a real
 * comparison to show) with the biggest saving. Returns null on an empty
 * catalog so the hero falls back to a placeholder instead of inventing data.
 */
function pickHeroProduct(products: Product[]): Product | null {
  if (products.length === 0) return null;
  const ranked = products
    .map((product) => ({ product, stats: priceStats(product) }))
    .sort((a, b) => {
      // Multi-store products first — the comparison card needs rows to compare.
      const aMulti = a.stats.storeCount >= 2 ? 1 : 0;
      const bMulti = b.stats.storeCount >= 2 ? 1 : 0;
      if (aMulti !== bMulti) return bMulti - aMulti;
      return b.stats.savings - a.stats.savings;
    });
  return ranked[0].product;
}

/**
 * One standout deal per category (biggest saving), excluding the hero product —
 * the grid flexes the full breadth of the catalog. Derived live, so it grows
 * with the real catalog and simply shows fewer cards until more lands.
 */
function pickTrendingDeals(products: Product[], excludeId: string | undefined): Product[] {
  return CATEGORIES.map((c) => {
    const best = products
      .filter((p) => p.category === c.slug && p.id !== excludeId)
      .map((product) => ({ product, stats: priceStats(product) }))
      .sort((a, b) => b.stats.savings - a.stats.savings)[0];
    return best?.product;
  }).filter((p): p is Product => Boolean(p));
}

const HOW_IT_WORKS = [
  {
    icon: SearchIcon,
    title: 'Search anything',
    body: 'From calculators to comforters — every product students actually buy, in one place.',
  },
  {
    icon: TagIcon,
    title: 'Compare real totals',
    body: 'Every store, ranked cheapest-first with shipping included. No sponsored placement, ever.',
  },
  {
    icon: BellIcon,
    title: 'Get drop alerts',
    body: 'Set a target price and we’ll notify you the moment it’s hit. Stop refreshing tabs.',
  },
];

const TRUST_POINTS = ['Free to use', 'No account needed to browse', 'Unbiased — never sponsored'];

export function LandingPage() {
  // Live catalog from Supabase — the hero comparison and trending deals are both
  // derived from real products (never invented), with skeletons while it loads
  // and a graceful "prices on the way" state before the first ingest.
  const { products, loading } = useProducts();

  const heroProduct = useMemo(() => pickHeroProduct(products), [products]);
  const trendingDeals = useMemo(
    () => pickTrendingDeals(products, heroProduct?.id),
    [products, heroProduct],
  );

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-border bg-surface">
        {/* Soft decorative wash — purely aesthetic, low opacity. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-savings/5 blur-3xl"
        />

        <Container className="relative py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted shadow-card">
                <BoltIcon className="h-3.5 w-3.5 text-primary" />
                Unbiased price comparison, built for students
              </span>

              <TypewriterHeadline className="mt-5 max-w-xl" />

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Find the{' '}
                <b className="font-semibold text-ink">
                  cheapest prices across Jumia, Konga, Slot, PayPorte &amp; Temu
                </b>{' '}
                — electronics, textbooks, backpacks, dorm gear and beyond. Track any product
                and get alerted the moment it drops.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={ROUTES.browse}>
                  <Button size="lg" className="w-full sm:w-auto">
                    Browse products
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to={ROUTES.signup}>
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Create free account
                  </Button>
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="inline-flex items-center gap-1.5 text-sm text-muted">
                    <CheckIcon className="h-4 w-4 text-savings" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Value-prop visual — live comparison, skeleton, or graceful placeholder */}
            <div className="lg:pl-6">
              {loading ? (
                <HeroComparisonSkeleton />
              ) : heroProduct ? (
                <HeroComparison product={heroProduct} />
              ) : (
                <HeroComparisonPlaceholder />
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------- Trending deals */}
      <Container className="py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
              Trending deals right now
            </h2>
            <p className="mt-1 text-muted">Live savings across every category students shop.</p>
          </div>
          <Link
            to={ROUTES.browse}
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover sm:inline-flex"
          >
            Browse all
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <TrendingSkeletonGrid />
        ) : trendingDeals.length > 0 ? (
          <>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trendingDeals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link to={ROUTES.browse}>
                <Button variant="secondary" className="w-full">
                  Browse all products
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <TrendingEmpty />
        )}
      </Container>

      {/* --------------------------------------------------------- How it works */}
      <section className="border-y border-border bg-surface">
        <Container className="py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
              How PricePilot works
            </h2>
            <p className="mt-2 text-muted">
              Three steps between you and the price you should actually pay.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="relative rounded-card border border-border bg-bg p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-control bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="tabular text-sm font-bold text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display text-lg font-bold text-ink">{step.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------ Shop by category */}
      <Container className="py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            Shop by category
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICON[category.slug];
            return (
              <Link
                key={category.slug}
                to={ROUTES.browse}
                className="group flex items-center gap-4 rounded-card border border-border bg-surface p-5 shadow-card transition-shadow duration-150 ease-smooth hover:shadow-card-hover"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-bold text-ink group-hover:text-primary">
                    {category.label}
                  </div>
                  <div className="truncate text-sm text-muted">
                    {CATEGORY_BLURB[category.slug]}
                  </div>
                </div>
                <ArrowRightIcon className="h-5 w-5 shrink-0 text-muted transition-transform duration-150 ease-smooth group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </Container>

      {/* -------------------------------------------------------------- CTA band */}
      <Container className="pb-20">
        <div className="relative overflow-hidden rounded-card bg-primary px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative mx-auto max-w-2xl">
            <ShieldCheckIcon className="mx-auto h-10 w-10 text-white/90" />
            <h2 className="mt-4 font-display text-3xl font-extrabold text-white">
              Never overpay as a student again
            </h2>
            <p className="mt-3 text-lg text-white/80">
              Create a free account to save products, set price-drop alerts, and shop the
              whole semester smarter.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={ROUTES.signup}>
                <Button
                  size="lg"
                  className="w-full bg-white text-primary hover:bg-white/90 sm:w-auto"
                >
                  Create free account
                </Button>
              </Link>
              <Link to={ROUTES.browse}>
                <Button
                  size="lg"
                  className="w-full border border-white/40 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                >
                  Browse products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

/** Loading placeholder mirroring {@link HeroComparison}'s frame, so the hero
 *  column holds its shape while the live catalog loads. */
function HeroComparisonSkeleton() {
  return (
    <div
      className="animate-pulse rounded-card border border-border bg-surface shadow-card-hover"
      aria-hidden="true"
    >
      {/* Product header */}
      <div className="flex items-center gap-4 border-b border-border p-5">
        <div className="h-16 w-16 shrink-0 rounded-control bg-border/60" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-20 rounded bg-border/60" />
          <div className="mt-2 h-4 w-3/4 rounded bg-border/70" />
        </div>
      </div>

      {/* Offer rows */}
      <div className="space-y-2 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-control bg-bg px-3.5 py-3"
          >
            <div className="h-4 w-24 rounded bg-border/60" />
            <div className="h-4 w-16 rounded bg-border/60" />
          </div>
        ))}
      </div>

      {/* Savings footer */}
      <div className="flex items-center justify-between border-t border-border bg-bg px-5 py-4">
        <div>
          <div className="h-3 w-28 rounded bg-border/60" />
          <div className="mt-2 h-6 w-32 rounded bg-border/70" />
        </div>
        <div className="h-9 w-20 rounded-control bg-border/50" />
      </div>
    </div>
  );
}

/**
 * Shown in the hero when the catalog is empty (before the first ingest, or if
 * the load fails). Keeps the comparison card's visual weight but shows honest
 * "not listed yet" rows instead of fabricated prices.
 */
function HeroComparisonPlaceholder() {
  return (
    <div className="rounded-card border border-border bg-surface shadow-card-hover">
      <div className="flex items-center gap-4 border-b border-border p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
          <TagIcon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Live comparison
          </div>
          <h3 className="font-display text-base font-bold text-ink">Prices on the way</h3>
        </div>
      </div>

      <div className="space-y-2 p-5">
        {PLATFORMS.map((platform) => (
          <div
            key={platform.slug}
            className="flex items-center justify-between rounded-control border border-transparent bg-bg px-3.5 py-2.5"
          >
            <span className="font-medium text-ink">{platform.label}</span>
            <span className="text-xs text-muted">Not listed yet</span>
          </div>
        ))}
      </div>

      <div className="border-t border-border bg-bg px-5 py-4 text-sm leading-relaxed text-muted">
        We’re pulling live prices from every store now — real comparisons show up here the
        moment they land.
      </div>
    </div>
  );
}

/** Grid of placeholder cards shown while the trending deals load. */
function TrendingSkeletonGrid() {
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

/**
 * Graceful empty state for the trending section. PricePilot only shows real,
 * scraped prices, so before the first ingest there's simply nothing to feature —
 * we say so honestly rather than inventing placeholder deals.
 */
function TrendingEmpty() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-muted">
        <TagIcon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">Deals are on the way</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">
        We only feature real prices pulled live from the stores. We’re adding them now —
        check back soon.
      </p>
    </div>
  );
}
