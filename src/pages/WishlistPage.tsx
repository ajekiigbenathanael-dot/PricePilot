import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { toast } from '@/hooks/useToast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { HeartIcon, BellIcon, BellOffIcon } from '@/components/ui/icons';
import { useWishlist } from '@/hooks/useWishlist';
import { useAlerts } from '@/hooks/useAlerts';

export function WishlistPage() {
  const { items, loading: wishlistLoading, error: wishlistError, remove: removeWishlist } = useWishlist();
  const { alerts, loading: alertsLoading, error: alertsError, remove: removeAlert } = useAlerts();

  const loading = wishlistLoading || alertsLoading;
  const error = wishlistError || alertsError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wishlist"
        description="Products you're tracking and price alerts."
        actions={
          <Link to={ROUTES.browse}>
            <Button>Browse products</Button>
          </Link>
        }
      />

      {error && (
        <Card className="border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</Card>
      )}

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Saved products</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((product) => (
                  <div key={product.id} className="relative">
                    <ProductCard product={product} />
                    <button
                      type="button"
                      onClick={async () => {
                        await removeWishlist(product.id);
                        toast.info(`Removed ${product.title} from wishlist.`);
                      }}
                      className="absolute right-3 top-3 rounded-full bg-surface/90 p-2 text-muted shadow-sm hover:text-danger"
                      aria-label={`Remove ${product.title} from wishlist`}
                    >
                      <HeartIcon className="h-4 w-4" fill="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {alerts.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">Price alerts</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {alerts.map((alert) => (
                  <Card key={alert.id} className="p-4">
                    {alert.product ? (
                      <div className="flex items-center gap-3">
                        {alert.product.image_url && (
                          <img
                            src={alert.product.image_url}
                            alt=""
                            className="h-10 w-10 rounded-control border border-border object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {alert.product.title}
                          </p>
                          <p className="text-xs text-muted">
                            Alert under {alert.target_price.toLocaleString('en-NG')} · now{' '}
                            {alert.product.lowest_price.toLocaleString('en-NG')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">Product unavailable</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        {alert.is_active ? (
                          <>
                            <BellIcon className="h-3.5 w-3.5 text-primary" />
                            Active
                          </>
                        ) : (
                          <>
                            <BellOffIcon className="h-3.5 w-3.5" />
                            Inactive
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await removeAlert(alert.id);
                          toast.info('Price alert removed.');
                        }}
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {items.length === 0 && alerts.length === 0 && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-muted">
                <HeartIcon className="h-7 w-7" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-ink">No saved products yet</h2>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Tap the heart on any product to save it here and track its price over time.
              </p>
              <Link to={ROUTES.browse} className="mt-5">
                <Button>Browse products</Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
