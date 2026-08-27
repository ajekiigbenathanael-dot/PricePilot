import { createContext } from 'react';
import type { User, RegisterRequest, LoginRequest } from '@/types';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  register: (data: RegisterRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
