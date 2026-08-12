import { Card } from '@/components/ui/Card';

/**
 * Loading placeholder that mirrors {@link ProductCard}'s geometry — 4:3
 * thumbnail, two-line title, price footer — so the grid holds its shape and
 * doesn't reflow when the real cards arrive. Purely decorative (aria-hidden);
 * the shimmering blocks use the border token so they read as "loading" on the
 * white card surface.
 */
export function ProductCardSkeleton() {
  return (
    <Card className="flex h-full animate-pulse flex-col overflow-hidden" aria-hidden="true">
      {/* Thumbnail */}
      <div className="aspect-[4/3] w-full border-b border-border bg-border/60" />

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* ticker row (reserved height, matches ProductCard) */}
        <div className="mb-1.5 min-h-[1.25rem]" />
        {/* category */}
        <div className="h-3 w-20 rounded bg-border/70" />
        {/* title (two lines) */}
        <div className="mt-2 h-4 w-11/12 rounded bg-border/70" />
        <div className="mt-1.5 h-4 w-2/3 rounded bg-border/70" />

        {/* price footer */}
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <div className="h-6 w-24 rounded bg-border/70" />
            <div className="mt-1.5 h-3 w-16 rounded bg-border/60" />
          </div>
          <div className="h-6 w-16 rounded-pill bg-border/60" />
        </div>
      </div>
    </Card>
  );
}
