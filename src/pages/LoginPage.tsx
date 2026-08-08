import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { PlaceholderPage } from './PlaceholderPage';

export function LoginPage() {
  return (
    <PlaceholderPage title="Log in" description="Welcome back.">
      <p className="text-muted">
        Email/password login is added in the auth phase. Need an account?{' '}
        <Link to={ROUTES.signup} className="font-medium text-primary hover:underline">
          Sign up
        </Link>
        .
      </p>
    </PlaceholderPage>
  );
}
