import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { CATEGORY_ICON } from './categoryMeta';

/** Placehold.co URLs in the seed are stand-ins, not real photography. */
function isRealPhoto(url: string | null): url is string {
  return Boolean(url) && !url!.includes('placehold.co');
}

/**
 * Product thumbnail. Renders a real photo when one exists; otherwise a calm,
 * on-brand placeholder (soft gradient + category glyph + brand) so cards read
 * as intentional rather than "image missing". The parent controls dimensions
 * and corner rounding via `className`.
 */
export function ProductImage({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[product.category];

  if (isRealPhoto(product.image_url)) {
    return (
      <img
        src={product.image_url}
        alt={product.title}
        loading="lazy"
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center bg-gradient-to-br from-bg to-border',
        className,
      )}
    >
      <Icon className="h-12 w-12 text-primary/25" strokeWidth={1.5} />
      {product.brand && (
        <span className="absolute bottom-2.5 right-3 font-display text-xs font-semibold text-muted/80">
          {product.brand}
        </span>
      )}
    </div>
  );
}
