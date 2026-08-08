import { Link } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE, CATEGORIES, ROUTES } from '@/lib/constants';
import { Container } from '@/components/ui/Container';
import { Logo } from './Logo';

/** Simple, calm site footer with brand blurb and secondary links. */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <Container className="py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs space-y-3">
            <Logo />
            <p className="text-sm text-muted">{APP_TAGLINE}</p>
          </div>

          <div className="flex gap-12">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">Shop</h2>
              <ul className="space-y-2">
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link
                      to={ROUTES.browse}
                      className="text-sm text-muted transition-colors hover:text-ink"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">Account</h2>
              <ul className="space-y-2">
                <li>
                  <Link
                    to={ROUTES.wishlist}
                    className="text-sm text-muted transition-colors hover:text-ink"
                  >
                    Wishlist
                  </Link>
                </li>
                <li>
                  <Link
                    to={ROUTES.settings}
                    className="text-sm text-muted transition-colors hover:text-ink"
                  >
                    Settings
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-border pt-6 text-xs text-muted">
          © {APP_NAME}. Prices shown are unbiased and for comparison only.
        </p>
      </Container>
    </footer>
  );
}
