import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import type { User, RegisterRequest, LoginRequest } from '@/types';
import { AuthContext } from './AuthContextDef';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me');
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const register = async (data: RegisterRequest) => {
    setError(null);
    const result = await apiFetch<{ user: User }>('/api/auth/register', {
      method: 'POST',
      json: data,
    });
    if (result?.user) setUser(result.user);
  };

  const login = async (data: LoginRequest) => {
    setError(null);
    const result = await apiFetch<{ user: User }>('/api/auth/login', {
      method: 'POST',
      json: data,
    });
    if (result?.user) setUser(result.user);
  };

  const logout = async () => {
    setError(null);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore logout errors */
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
