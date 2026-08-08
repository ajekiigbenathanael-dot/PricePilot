import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { PlaceholderPage } from './PlaceholderPage';

export function SignupPage() {
  return (
    <PlaceholderPage title="Sign up" description="Create your free PricePilot account.">
      <p className="text-muted">
        Email/password signup is added in the auth phase. Already have an account?{' '}
        <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
          Log in
        </Link>
        .
      </p>
    </PlaceholderPage>
  );
}
