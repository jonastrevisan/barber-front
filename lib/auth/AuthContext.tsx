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
import { usersApi } from '../api/users';

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
  isSuperAdmin: boolean;
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
    const token = Cookies.get('accessToken');

    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        Cookies.remove('user');
      }
    }

    if (token) {
      usersApi.me()
        .then((res) => {
          const u = res.data;
          const fresh: AuthUser = {
            id: u.id, name: u.name, email: u.email,
            role: u.role, avatar: u.avatar ?? null, tenant_id: u.tenant_id,
          };
          setUser(fresh);
          Cookies.set('user', JSON.stringify(fresh), { expires: 7 });
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
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
        isSuperAdmin: user?.role === 'superadmin',
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
