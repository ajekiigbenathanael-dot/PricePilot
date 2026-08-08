import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { NAV_LINKS, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Logo } from './Logo';

/**
 * Responsive top navigation. Sticky, hairline-bottom, white surface.
 * Desktop: inline links + auth actions. Mobile: hamburger-toggled panel.
 * Auth state is not wired yet (Phase 1) — Log in / Sign up are placeholders.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-control px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'text-primary' : 'text-muted hover:text-ink',
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          <Link to={ROUTES.home} aria-label="PricePilot home" onClick={() => setOpen(false)}>
            <Logo />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link to={ROUTES.login}>
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to={ROUTES.signup}>
              <Button size="sm">Sign up</Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-control p-2 text-ink md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </nav>
      </Container>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Link to={ROUTES.login} onClick={() => setOpen(false)}>
                <Button variant="secondary" size="md" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link to={ROUTES.signup} onClick={() => setOpen(false)}>
                <Button size="md" className="w-full">
                  Sign up
                </Button>
              </Link>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
