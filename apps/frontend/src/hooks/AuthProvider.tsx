import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@/types';
import * as authService from '@/services/authService';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .getUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    if (!res?.token || !res?.user) {
      throw new Error('Login succeeded but the server returned an unexpected response.');
    }
    localStorage.setItem('token', res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, passwordConfirmation: string) => {
      const res = await authService.register(name, email, password, passwordConfirmation);
      if (!res?.token || !res?.user) {
        throw new Error('Registration succeeded but the server returned an unexpected response.');
      }
      localStorage.setItem('token', res.token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
