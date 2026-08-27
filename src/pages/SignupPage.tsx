import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { toast } from '@/hooks/useToast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(field: string, value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${field} is required`;
  if (field === 'Email' && !EMAIL_REGEX.test(trimmed)) return 'Enter a valid email address';
  if (field === 'Password' && trimmed.length < 8) return 'Must be at least 8 characters';
  return undefined;
}

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const nameError = validate('Display name', displayName);
  const emailError = validate('Email', email);
  const passError = validate('Password', password);
  const canSubmit = !nameError && !emailError && !passError && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await register({ email, password, display_name: displayName });
      toast.success('Account created successfully.');
      navigate(ROUTES.login, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Signup failed.');
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Sign up" description="Create your free PricePilot account." />
      <Card className="mt-8 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane"
            autoComplete="name"
            error={displayName.trim() ? nameError : undefined}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            error={email.trim() ? emailError : undefined}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            showPasswordToggle
            error={password.trim() ? passError : undefined}
          />
          <Button type="submit" className="w-full" disabled={!canSubmit}>
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
