import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { fetchProducts } from '@/lib/products';
import type { Product } from '@/types';

export function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const byCategory = new Map<string, number>();
    const byPlatform = new Map<string, number>();
    const withOffers = products.filter((p) => (p.offers?.length ?? 0) > 0).length;

    for (const p of products) {
      byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);
      for (const o of p.offers ?? []) {
        byPlatform.set(o.platform, (byPlatform.get(o.platform) ?? 0) + 1);
      }
    }

    return {
      total: products.length,
      withOffers,
      categories: byCategory,
      platforms: byPlatform,
    };
  }, [products]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Catalog health, ingest jobs, and platform coverage."
        actions={
          <Link to={ROUTES.browse}>
            <Button>Open store</Button>
          </Link>
        }
      />

      {error && (
        <Card className="border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total products" value={stats.total.toString()} />
        <StatCard label="With offers" value={stats.withOffers.toString()} />
        <StatCard label="Categories" value={String(stats.categories.size)} />
        <StatCard label="Platforms" value={String(stats.platforms.size)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">By category</h2>
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : stats.categories.size === 0 ? (
            <p className="text-sm text-muted">No products yet.</p>
          ) : (
            <div className="space-y-2">
              {Array.from(stats.categories.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([slug, count]) => (
                  <div key={slug} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{slug}</span>
                    <Badge tone="neutral">{count}</Badge>
                  </div>
                ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">By platform</h2>
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : stats.platforms.size === 0 ? (
            <p className="text-sm text-muted">No platform data yet.</p>
          ) : (
            <div className="space-y-2">
              {Array.from(stats.platforms.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([slug, count]) => (
                  <div key={slug} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{slug}</span>
                    <Badge tone="primary">{count}</Badge>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </Card>
  );
}
