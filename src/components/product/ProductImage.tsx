import { useState } from 'react';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { CATEGORY_ICON } from './categoryMeta';

/** Placehold.co URLs in the seed are stand-ins, not real photography. */
function isRealPhoto(url: string | null): url is string {
  return Boolean(url) && !url!.includes('placehold.co');
}

/**
 * Product thumbnail. Renders a real photo when one exists (with a graceful
 * fallback if it fails to load), otherwise a calm, on-brand placeholder (soft
 * gradient + category glyph + brand) so cards read as intentional rather than
 * "image missing".
 *
 * Every branch renders inside ONE fixed frame (`relative h-full w-full
 * overflow-hidden`) so real photos and placeholders occupy identical space —
 * this is what keeps a grid of mixed cards aligned. The parent controls the
 * frame's dimensions and corner rounding via `className`; children fill it.
 */
export function ProductImage({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const Icon = CATEGORY_ICON[product.category];

  // `isRealPhoto` is a type guard, so `photoUrl` is a non-null string when set.
  const photoUrl = isRealPhoto(product.image_url) ? product.image_url : null;
  const showPlaceholder = photoUrl === null || errored;

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {showPlaceholder ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg to-border">
          <Icon className="h-12 w-12 text-primary/25" strokeWidth={1.5} />
          {product.brand && (
            <span className="absolute bottom-2.5 right-3 font-display text-xs font-semibold text-muted/80">
              {product.brand}
            </span>
          )}
        </div>
      ) : (
        <img
          src={photoUrl ?? undefined}
          alt={product.title}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full bg-bg object-cover"
        />
      )}
    </div>
  );
}
