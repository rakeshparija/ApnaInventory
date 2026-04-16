import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/client';

interface User {
  id: number;
  name: string;
  email: string;
  shop_name: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; shop_name: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('apna_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(!localStorage.getItem('apna_token') ? false : true);

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('apna_token');
    if (!token) { setIsLoading(false); return; }

    authApi.me()
      .then(r => {
        setUser(r.data);
        localStorage.setItem('apna_user', JSON.stringify(r.data));
      })
      .catch(() => {
        localStorage.removeItem('apna_token');
        localStorage.removeItem('apna_user');
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    localStorage.setItem('apna_token', res.data.token);
    localStorage.setItem('apna_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  async function register(data: { name: string; email: string; password: string; shop_name: string }) {
    const res = await authApi.register(data);
    localStorage.setItem('apna_token', res.data.token);
    localStorage.setItem('apna_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem('apna_token');
    localStorage.removeItem('apna_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
