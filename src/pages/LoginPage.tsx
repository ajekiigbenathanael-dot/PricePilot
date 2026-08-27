import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { toast } from '@/hooks/useToast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    ROUTES.dashboard;

  // If already logged in, skip the login form.
  if (user) return <Navigate to={from} replace />;

  const emailError = email.trim() && !EMAIL_REGEX.test(email.trim()) ? 'Enter a valid email address' : undefined;
  const canSubmit = email.trim() !== '' && password.trim() !== '' && !emailError && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await login({ email, password });
      toast.success('Logged in successfully.');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed.');
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Log in" description="Welcome back." />
      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            error={emailError}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            showPasswordToggle
          />
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? 'Logging in…' : 'Log in'}
          </Button>
          <p className="text-center text-sm text-muted">
            Don't have an account?{' '}
            <Link to={ROUTES.signup} className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
