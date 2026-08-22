import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES, categoryLabel, platformLabel } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { priceHistoryStats, priceStats, primaryObservationSeries } from '@/lib/pricing';
import { liveCheckableOffer } from '@/lib/liveCheck';
import { useProduct } from '@/hooks/useProduct';
import { useObservations } from '@/hooks/useObservations';
import { useWishlist } from '@/hooks/useWishlist';
import { useAlerts } from '@/hooks/useAlerts';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import {
  AlertTriangleIcon,
  BellIcon,
  HeartIcon,
  TrendDownIcon,
  TrendUpIcon,
} from '@/components/ui/icons';
import { ProductImage } from '@/components/product/ProductImage';
import { ComparisonTable, ViewOnButton } from '@/components/product/ComparisonTable';
import { PriceSparkline } from '@/components/product/PriceSparkline';
import { LiveCheckButton } from '@/components/product/LiveCheckButton';

/**
 * Product detail — the full comparison view for one product: every store side
 * by side (cheapest total highlighted), a REAL price-history sparkline (derived
 * from recorded `price_observations`, never invented), and wishlist/alert
 * actions.
 *
 * Reads live data via the API: the product loads first (skeleton → content →
 * "not found" only after the fetch resolves), and the price-history section
 * fills in independently from its own observations query.
 */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { product, loading, error, refetch: refetchProduct } = useProduct(id);
  const { observations, loading: historyLoading, refetch: refetchObservations } = useObservations(id);
  const { savedIds, toggle: toggleWishlist } = useWishlist();
  const { alerts } = useAlerts();

  if (loading) return <DetailSkeleton />;
  if (error) return <DetailError message={error} onRetry={refetchProduct} />;
  if (!product) return <ProductNotFound />;

  const { lowest, savings, storeCount, cheapest } = priceStats(product);

  // Only offer a live check when there's a real Jumia product page to re-fetch
  // (seed offers point at search URLs, so the button stays hidden for them).
  const liveOffer = liveCheckableOffer(product);

  // Real price history: one platform's recorded observations. `history` is null
  // until we have ≥2 points, so no movement is ever shown from a single reading.
  const series = primaryObservationSeries(product, observations);
  const history = priceHistoryStats(series.points);

  return (
    <Container className="py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to={ROUTES.home} className="hover:text-ink">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={ROUTES.browse} className="hover:text-ink">
              Browse
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-[16rem] truncate font-medium text-ink" aria-current="page">
            {product.title}
          </li>
        </ol>
      </nav>

      {/* Product identity + best price */}
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="aspect-[4/3] w-full">
            <ProductImage product={product} className="h-full w-full" />
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {categoryLabel(product.category)}
            {product.brand && <span className="text-border"> · </span>}
            {product.brand}
          </span>
          <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
            {product.title}
          </h1>
          {product.description && (
            <p className="mt-3 leading-relaxed text-muted">{product.description}</p>
          )}

          {/* Best-price highlight */}
          <div className="mt-6 rounded-card border border-border bg-bg p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Best price
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="tabular font-display text-3xl font-extrabold text-ink">
                {formatPrice(lowest)}
              </span>
              {savings >= 1 && (
                <Badge tone="savings">save {formatPrice(savings)} vs priciest</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              Cheapest of {storeCount} {storeCount === 1 ? 'store' : 'stores'}, delivery
              included{cheapest ? ` · on ${cheapest.retailer}` : ''}.
            </p>
            {cheapest && (
              <ViewOnButton offer={cheapest} primary className="mt-4 w-full sm:w-auto" />
            )}
            {liveOffer && (
              <LiveCheckButton
                productId={product.id}
                onUpdated={() => {
                  refetchProduct();
                  refetchObservations();
                }}
              />
            )}
          </div>

          <ProductActions
            bestPrice={lowest}
            productId={product.id}
            isSaved={savedIds.has(product.id)}
            onToggleWishlist={toggleWishlist}
            alerts={alerts}
          />
        </div>
      </div>

      {/* Comparison table */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
          Compare prices across stores
        </h2>
        <p className="mt-1 text-sm text-muted">
          Every store we track, ranked by total price — item plus delivery. Cheapest wins.
        </p>
        <div className="mt-5">
          <ComparisonTable product={product} />
        </div>
      </section>

      {/* Price history — real recorded observations only */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
          Price history
        </h2>
        <p className="mt-1 text-sm text-muted">
          Prices we’ve actually recorded for this product
          {series.platform ? ` on ${platformLabel(series.platform)}` : ''} over time.
        </p>
        <Card className="mt-5 p-5 sm:p-6">
          {historyLoading ? (
            <HistoryLoading />
          ) : history ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Now
                  </div>
                  <div className="tabular mt-1 font-display text-2xl font-extrabold text-ink">
                    {formatPrice(history.last)}
                  </div>
                </div>
                <Badge
                  tone={
                    history.direction === 'down'
                      ? 'savings'
                      : history.direction === 'up'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {history.direction === 'down' && <TrendDownIcon className="h-3.5 w-3.5" />}
                  {history.direction === 'up' && <TrendUpIcon className="h-3.5 w-3.5" />}
                  {history.change === 0
                    ? 'No change'
                    : `${history.direction === 'down' ? 'Down' : 'Up'} ${formatPrice(
                        Math.abs(history.change),
                      )} (${Math.abs(history.pct)}%)`}
                </Badge>
              </div>

              <PriceSparkline history={series.points} className="mt-4" />

              <div className="tabular mt-3 flex justify-between text-xs text-muted">
                <span>Low {formatPrice(history.min)}</span>
                <span>High {formatPrice(history.max)}</span>
              </div>
            </>
          ) : (
            <HistoryEmpty pointCount={series.points.length} />
          )}
        </Card>
      </section>
    </Container>
  );
}

/**
 * Wishlist + price-alert controls. The heart button is wired to the real
 * wishlist API via `useWishlist`; the bell opens a small modal to set a target
 * price, persisted through `useAlerts`.
 */
function ProductActions({ bestPrice, productId, isSaved, onToggleWishlist, alerts }: { bestPrice: number; productId: string; isSaved: boolean; onToggleWishlist: (id: string) => void; alerts: Array<{ id: string; product_id: string; target_price: number; is_active: boolean }> }) {
  const [alerted, setAlerted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const { create, remove } = useAlerts();

  const existingAlert = alerts.find((a) => a.product_id === productId && a.is_active);

  const handleSetAlert = async () => {
    const price = Number(targetPrice);
    if (!Number.isFinite(price) || price <= 0) return;
    setSaving(true);
    try {
      await create(productId, price);
      setAlerted(true);
      setShowModal(false);
      setTargetPrice('');
    } catch {
      // error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAlert = async () => {
    if (!existingAlert) return;
    await remove(existingAlert.id);
    setAlerted(false);
  };

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant={isSaved ? 'primary' : 'secondary'}
          className="w-full sm:w-auto"
          aria-pressed={isSaved}
          onClick={() => onToggleWishlist(productId)}
        >
          <HeartIcon className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved ? 'Saved to wishlist' : 'Add to wishlist'}
        </Button>
        <Button
          type="button"
          variant={alerted ? 'primary' : 'secondary'}
          className="w-full sm:w-auto"
          aria-pressed={alerted}
          onClick={() => setShowModal(true)}
        >
          <BellIcon className="h-4 w-4" />
          {alerted ? `Alert set · under ${formatPrice(existingAlert?.target_price ?? bestPrice)}` : 'Set price alert'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Wishlist and price alerts save to your account —{' '}
        <Link
          to={ROUTES.signup}
          className="font-medium text-primary hover:text-primary-hover"
        >
          create a free account
        </Link>{' '}
        to keep them.
      </p>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold">Set price alert</h3>
            <p className="mt-1 text-sm text-muted">
              We'll notify you when the price drops below your target.
            </p>
            <div className="mt-4">
              <Input
                label="Target price (₦)"
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={String(bestPrice)}
                min={1}
                step={1}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowModal(false);
                  setTargetPrice('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleSetAlert}
                disabled={saving}
              >
                {saving ? 'Saving…' : existingAlert ? 'Update alert' : 'Set alert'}
              </Button>
            </div>
            {existingAlert && (
              <button
                type="button"
                onClick={handleRemoveAlert}
                className="mt-3 w-full text-center text-sm text-danger hover:underline"
              >
                Remove alert
              </button>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Not-enough-data state for the price-history card. Movement needs two genuine
 * readings; with zero or one on record we say exactly that instead of drawing a
 * flat line or inventing a trend.
 */
function HistoryEmpty({ pointCount }: { pointCount: number }) {
  return (
    <div className="py-2 text-sm text-muted">
      {pointCount === 1
        ? 'We’ve recorded this price once so far. A trend line appears after the next check gives us a second reading to compare.'
        : 'No price history recorded yet. As we track this product, its price movements will show up here.'}
    </div>
  );
}

/** Loading placeholder for the price-history card while observations load. */
function HistoryLoading() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="h-3 w-10 rounded bg-border/60" />
          <div className="mt-2 h-7 w-28 rounded bg-border/70" />
        </div>
        <div className="h-6 w-24 rounded-pill bg-border/60" />
      </div>
      <div className="mt-4 h-16 w-full rounded bg-border/40" />
    </div>
  );
}

/** Full-page skeleton mirroring the detail layout — no flash of "not found". */
function DetailSkeleton() {
  return (
    <Container className="py-8 sm:py-12" aria-hidden="true">
      {/* Breadcrumb */}
      <div className="h-4 w-48 animate-pulse rounded bg-border/60" />

      <div className="mt-6 grid animate-pulse gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="aspect-[4/3] w-full rounded-card border border-border bg-border/50" />

        {/* Summary */}
        <div className="flex flex-col gap-3">
          <div className="h-3 w-28 rounded bg-border/60" />
          <div className="h-8 w-3/4 rounded bg-border/70" />
          <div className="mt-1 h-4 w-full rounded bg-border/50" />
          <div className="h-4 w-5/6 rounded bg-border/50" />
          <div className="mt-4 h-32 w-full rounded-card bg-border/40" />
          <div className="mt-2 h-11 w-full rounded-control bg-border/50 sm:w-56" />
        </div>
      </div>

      {/* Comparison table block */}
      <div className="mt-12 h-6 w-64 animate-pulse rounded bg-border/60" />
      <div className="mt-5 h-56 w-full animate-pulse rounded-card bg-border/40" />
    </Container>
  );
}

/** Shown when the product fetch fails, with a retry back into `useProduct`. */
function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Container className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
        <AlertTriangleIcon className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Couldn’t load this product</h1>
      <p className="mt-2 max-w-sm text-muted">{message}</p>
      <Button className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </Container>
  );
}

/** Shown once the fetch resolves with no matching product row. */
function ProductNotFound() {
  return (
    <Container className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <p className="mt-2 max-w-sm text-muted">
        We couldn’t find that product. It may have been removed or the link is wrong.
      </p>
      <Link to={ROUTES.browse} className="mt-6">
        <Button>Browse products</Button>
      </Link>
    </Container>
  );
}
