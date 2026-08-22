import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { NAV_LINKS, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/useAuth';
import { ChevronDownIcon } from '@/components/ui/icons';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate(ROUTES.home, { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-control px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'text-primary' : 'text-muted hover:text-ink',
    );

  const displayName = user?.display_name?.trim() || user?.email?.split('@')[0] || 'Account';

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
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-control bg-border/60" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:border-primary/40"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[120px] truncate">{displayName}</span>
                  <ChevronDownIcon className="h-4 w-4 text-muted" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-card border border-border bg-surface shadow-card">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-medium text-ink">{displayName}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to={ROUTES.wishlist}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-ink hover:bg-bg"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Wishlist
                      </Link>
                      <Link
                        to={ROUTES.settings}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-ink hover:bg-bg"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-bg"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to={ROUTES.login}>
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to={ROUTES.signup}>
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
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
              {user ? (
                <>
                  <p className="px-3 text-sm font-medium text-ink">{displayName}</p>
                  <Link to={ROUTES.wishlist} onClick={() => setOpen(false)}>
                    <Button variant="secondary" size="md" className="w-full">
                      Wishlist
                    </Button>
                  </Link>
                  <Link to={ROUTES.settings} onClick={() => setOpen(false)}>
                    <Button variant="secondary" size="md" className="w-full">
                      Settings
                    </Button>
                  </Link>
                  <Button variant="ghost" size="md" className="w-full" onClick={handleLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
