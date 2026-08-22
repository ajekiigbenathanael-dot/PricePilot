import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ROUTES } from '@/lib/constants';
import {
  AdminPage,
  BrowsePage,
  LandingPage,
  LoginPage,
  NotFoundPage,
  ProductDetailPage,
  SettingsPage,
  SignupPage,
  WishlistPage,
} from '@/pages';
import { RequireAuth } from '@/components/auth/RequireAuth';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: ROUTES.home, element: <LandingPage /> },
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.signup, element: <SignupPage /> },
      { path: ROUTES.browse, element: <BrowsePage /> },
      { path: ROUTES.product, element: <ProductDetailPage /> },
      { path: ROUTES.wishlist, element: <RequireAuth><WishlistPage /></RequireAuth> },
      { path: ROUTES.settings, element: <RequireAuth><SettingsPage /></RequireAuth> },
      { path: ROUTES.admin, element: <RequireAuth><AdminPage /></RequireAuth> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
