'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import Cookies from 'js-cookie';
import { AuthResponse } from '../api/auth';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  tenant_id: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isProfessional: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  updateUser: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = Cookies.get('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        Cookies.remove('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data: AuthResponse) => {
    Cookies.set('accessToken', data.access_token, { expires: 1 });
    Cookies.set('refreshToken', data.refresh_token, { expires: 7 });
    Cookies.set('user', JSON.stringify(data.user), { expires: 7 });
    setUser(data.user);
  };

  const logout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('user');
    setUser(null);
  };

  const updateUser = (data: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...data };
      Cookies.set('user', JSON.stringify(next), { expires: 7 });
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'admin',
        isProfessional: user?.role === 'professional',
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
