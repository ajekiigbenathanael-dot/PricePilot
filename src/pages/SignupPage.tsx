import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/useAuth';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register({ email, password, display_name: displayName });
      navigate(ROUTES.home, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Sign up" description="Create your free PricePilot account." />
      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <Input
            label="Display name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane"
            autoComplete="name"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </Button>
          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
