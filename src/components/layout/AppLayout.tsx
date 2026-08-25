import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastContainer } from '@/components/ui/Toast';

/**
 * App shell: sticky nav, routed page content, footer. Flex column with the
 * footer pinned to the bottom on short pages. Rendered as the router's root
 * layout element; child routes render into <Outlet />.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only absolute top-4 left-4 z-50 rounded-control bg-bg px-4 py-2 text-sm font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>
      <Navbar />
      <main className="flex-1" id="main">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
