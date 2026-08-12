import { useState } from 'react';
import { checkCurrentPrice } from '@/lib/liveCheck';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { RefreshIcon } from '@/components/ui/icons';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

/**
 * "Check current price" — triggers a bounded, on-demand live price check for
 * this product via the `check-price` Edge Function, then asks the page to
 * refetch so the fresh reading flows into the best price, the comparison table,
 * and the price-history chart. Only rendered when the product has a re-fetchable
 * Jumia product link (see `liveCheckableOffer`), so it never promises a live
 * check we can't actually perform.
 */
export function LiveCheckButton({
  productId,
  onUpdated,
}: {
  productId: string;
  /** Called after a successful check so the page can refetch product + history. */
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function run() {
    setStatus({ kind: 'loading' });
    try {
      const result = await checkCurrentPrice(productId);
      onUpdated();

      const when = result.status === 'throttled' ? 'checked moments ago' : 'checked just now';
      let message = `${formatPrice(result.price)} · ${when}`;
      if (result.changed && result.previousPrice != null) {
        const direction = result.price < result.previousPrice ? 'down' : 'up';
        message += `, ${direction} from ${formatPrice(result.previousPrice)}`;
      }
      setStatus({ kind: 'done', message: `${message}.` });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Price check failed. Try again shortly.',
      });
    }
  }

  const loading = status.kind === 'loading';

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="secondary"
        onClick={run}
        disabled={loading}
        className="w-full sm:w-auto"
      >
        <RefreshIcon className={`h-4 w-4${loading ? ' animate-spin' : ''}`} />
        {loading ? 'Checking Jumia…' : 'Check current price'}
      </Button>

      {status.kind === 'done' && (
        <p className="mt-2 text-xs text-muted">Live price: {status.message}</p>
      )}
      {status.kind === 'error' && (
        <p className="mt-2 text-xs text-warning">{status.message}</p>
      )}
      {status.kind === 'idle' && (
        <p className="mt-2 text-xs text-muted">
          Fetches this product’s current price from Jumia right now.
        </p>
      )}
    </div>
  );
}
