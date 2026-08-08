import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

/**
 * App shell: sticky nav, routed page content, footer. Flex column with the
 * footer pinned to the bottom on short pages. Rendered as the router's root
 * layout element; child routes render into <Outlet />.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
