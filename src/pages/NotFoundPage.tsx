import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

export function NotFoundPage() {
  return (
    <Container className="flex flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-sm text-muted">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link to={ROUTES.home} className="mt-6">
        <Button>Back to home</Button>
      </Link>
    </Container>
  );
}
