import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '@/contexts/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { useAlerts } from '@/hooks/useAlerts';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { formatPrice } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { HeartIcon, BellIcon, ExternalLinkIcon, ClockIcon } from '@/components/ui/icons';

export function DashboardPage() {
  const { user } = useAuth();
  const { items: wishlistItems, loading: wlLoading, error: wlError } = useWishlist();
  const { alerts, loading: alLoading, error: alError } = useAlerts();
  const { products: recentProducts } = useRecentlyViewed();

  const displayName = user?.display_name || user?.email?.split('@')[0] || 'there';

  if (wlLoading || alLoading) {
    return (
      <Container className="py-8 sm:py-12">
        <PageHeader title={`Welcome, ${displayName}`} description="Your saved products and price alerts." />
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </Container>
    );
  }

  const wlReady = !!wishlistItems && !wlError;
  const alReady = !!alerts && !alError;

  return (
    <div className="space-y-8">
      <Container className="py-8 sm:py-12">
        <PageHeader
          title={`Welcome back, ${displayName}`}
          description="Your saved products and active price alerts."
        />

        {(wlError || alError) && (
          <Card className="border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {wlError || alError}
          </Card>
        )}

        {/* Active price alerts */}
        {alReady && alerts.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Active price alerts</h2>
              <Link to={ROUTES.wishlist}>
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alerts
                .filter((a) => a.is_active)
                .map((alert) => (
                  <Card key={alert.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
                        <BellIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {alert.product?.title ?? 'Product unavailable'}
                        </p>
                        <p className="text-xs text-muted">
                          Alert when below {formatPrice(alert.target_price)}
                          {alert.product && (
                            <span className="mx-1 text-border">·</span>
                          )}
                          {alert.product && (
                            <span className="text-xs text-savings">
                              now {formatPrice(alert.product.lowest_price)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        )}

        {/* Saved products */}
        {wlReady && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Saved products</h2>
              <Link to={ROUTES.wishlist}>
                <Button variant="ghost" size="sm">
                  View wishlist
                </Button>
              </Link>
            </div>

            {wishlistItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {wishlistItems.slice(0, 6).map((product) => (
                  <div key={product.id} className="relative">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-muted mx-auto mb-3">
                  <HeartIcon className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted">
                  No saved products yet. Browse and tap the heart on any product to track it here.
                </p>
                <Link to={ROUTES.browse} className="mt-3 inline-block">
                  <Button size="sm">Browse products</Button>
                </Link>
              </Card>
            )}
          </section>
        )}

        {/* Recently viewed */}
        {recentProducts.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-muted" />
              <h2 className="text-lg font-semibold text-ink">Recently viewed</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recentProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Quick actions */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-ink">Quick actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to={ROUTES.browse}>
              <Button>
                Browse all products
                <ExternalLinkIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={ROUTES.settings}>
              <Button variant="secondary">Account settings</Button>
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}
