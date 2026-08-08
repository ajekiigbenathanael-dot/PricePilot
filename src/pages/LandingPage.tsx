import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { CATEGORIES, ROUTES } from '@/lib/constants';
import { FEATURED_PRODUCTS, HERO_PRODUCT } from '@/lib/sampleProducts';
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
import { CATEGORY_BLURB, CATEGORY_ICON } from '@/components/product/categoryMeta';

/** One standout deal per category — flexes the full breadth of the catalog. */
const TRENDING_DEALS: Product[] = CATEGORIES.map((c) =>
  FEATURED_PRODUCTS.find((p) => p.category === c.slug && p.id !== HERO_PRODUCT.id),
).filter((p): p is Product => Boolean(p));

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
                Compare prices across Amazon, Best Buy, Walmart and more — electronics,
                textbooks, backpacks, dorm gear and beyond. Track any product and get
                alerted the moment it drops.
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

            {/* Value-prop visual */}
            <div className="lg:pl-6">
              <HeroComparison product={HERO_PRODUCT} />
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

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TRENDING_DEALS.map((product) => (
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
