import { useState } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch } from '@/lib/api';

type Tab = 'profile' | 'password' | 'notifications';

export function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted">Please log in to view your settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences."
      />

      {message && (
        <Card
          className={`border p-4 text-sm ${
            message.type === 'success'
              ? 'border-savings/30 bg-savings/5 text-savings'
              : 'border-danger/30 bg-danger/5 text-danger'
          }`}
        >
          {message.text}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="p-1">
          <nav className="flex flex-col gap-0.5">
            <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
              Profile
            </TabButton>
            <TabButton active={activeTab === 'password'} onClick={() => setActiveTab('password')}>
              Password
            </TabButton>
            <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')}>
              Notifications
            </TabButton>
          </nav>
        </Card>

        <div>
          {activeTab === 'profile' && (
            <ProfileSection user={user} onMessage={setMessage} />
          )}
          {activeTab === 'password' && (
            <PasswordSection onMessage={setMessage} />
          )}
          {activeTab === 'notifications' && (
            <NotificationsSection onMessage={setMessage} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-control px-3 py-2 text-left text-sm font-medium transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted hover:text-ink hover:bg-bg'
      }`}
    >
      {children}
    </button>
  );
}

function ProfileSection({
  user,
  onMessage,
}: {
  user: { id: string; email: string; display_name: string | null; created_at: string };
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onMessage({ type: 'success', text: '' });
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        json: { display_name: displayName },
      });
      onMessage({ type: 'success', text: 'Profile updated successfully.' });
      await refresh();
    } catch (err) {
      onMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-muted">Your public account information.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Display name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />
        <Input
          label="Email"
          type="email"
          value={user.email}
          disabled
          hint="Email cannot be changed."
        />
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </Card>
  );
}

function PasswordSection({ onMessage }: { onMessage: (msg: { type: 'success' | 'error'; text: string }) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      onMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/auth/password', {
        method: 'POST',
        json: { current_password: current, new_password: next },
      });
      onMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      onMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-muted">Update your password to keep your account secure.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Current password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Input
          label="New password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Input
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Button type="submit" disabled={saving}>
          {saving ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </Card>
  );
}

function NotificationsSection({ onMessage }: { onMessage: (msg: { type: 'success' | 'error'; text: string }) => void }) {
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        json: { email_alerts: emailAlerts },
      });
      onMessage({ type: 'success', text: 'Notification preferences saved.' });
    } catch (err) {
      onMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save preferences.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Notifications</h2>
      <p className="mt-1 text-sm text-muted">Choose what updates you receive.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Price drop alerts</p>
            <p className="text-xs text-muted">Email me when a saved product drops in price.</p>
          </div>
          <input
            type="checkbox"
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
        </label>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </form>
    </Card>
  );
}
