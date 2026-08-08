import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ROUTES } from '@/lib/constants';
import {
  BrowsePage,
  LandingPage,
  LoginPage,
  NotFoundPage,
  ProductDetailPage,
  SettingsPage,
  SignupPage,
  WishlistPage,
} from '@/pages';

/**
 * Application routes. All pages render inside the AppLayout shell (nav +
 * footer). `wishlist` and `settings` are user-only screens; route guards are
 * added in the auth phase — for now they render as placeholders.
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: ROUTES.home, element: <LandingPage /> },
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.signup, element: <SignupPage /> },
      { path: ROUTES.browse, element: <BrowsePage /> },
      { path: ROUTES.product, element: <ProductDetailPage /> },
      { path: ROUTES.wishlist, element: <WishlistPage /> },
      { path: ROUTES.settings, element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
