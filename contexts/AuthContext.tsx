import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, API_TIMEOUT_MS, SESSION_KEY, setUnauthHandler } from '@/constants/api';
import { router } from 'expo-router';

interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  mobile?: string | null;
  country?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobile?: string;
  country?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${API_TIMEOUT_MS}ms`)), API_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  const logout = useCallback(async () => {
    // Keep the persisted token until the server receives the authenticated
    // logout request. The API client reads the token from SecureStore when it
    // builds the Authorization: Bearer header.
    await api.post('/auth/logout').catch(() => {});
    await withTimeout(SecureStore.deleteItemAsync(SESSION_KEY), 'SESSION DELETE').catch(() => {});
    setState({ user: null, token: null, loading: false });
    router.replace('/(auth)/login' as any);
  }, []);

  useEffect(() => { setUnauthHandler(logout); }, [logout]);

  // Bootstrap: load persisted token → verify with /me
  useEffect(() => {
    let mounted = true;

    (async () => {
      console.log('[AUTH] INIT START');
      try {
        console.log('[AUTH] SESSION READ START');
        const token = await withTimeout(SecureStore.getItemAsync(SESSION_KEY), 'SESSION READ');
        console.log(`[AUTH] SESSION READ SUCCESS (${token ? 'present' : 'absent'})`);

        if (token) {
          if (mounted) setState(s => ({ ...s, token }));
          const res = await api.get<AuthUser>('/auth/me');
          if (res.success) {
            if (mounted) setState({ user: res.data, token, loading: false });
          } else {
            await withTimeout(SecureStore.deleteItemAsync(SESSION_KEY), 'SESSION DELETE').catch(() => {});
            if (mounted) setState({ user: null, token: null, loading: false });
          }
        }
      } catch (err) {
        console.error('[AUTH] INIT ERROR', err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted) setState(s => ({ ...s, loading: false }));
        console.log('[AUTH] INIT FINISH loading=false');
      }
    })();

    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<AuthUser & { token: string }>('/auth/login', { email, password });
      if (!res.success) return { success: false, error: res.error.message ?? 'Login failed' };
      const { token, ...user } = res.data;
      await withTimeout(SecureStore.setItemAsync(SESSION_KEY, token), 'SESSION WRITE');
      setState({ user, token, loading: false });
      return { success: true };
    } catch (err) {
      console.error('[AUTH] LOGIN ERROR', err instanceof Error ? err.message : String(err));
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const res = await api.post<AuthUser & { token: string }>('/auth/register', data);
      if (!res.success) return { success: false, error: res.error.message ?? 'Registration failed' };
      const { token, ...user } = res.data;
      await withTimeout(SecureStore.setItemAsync(SESSION_KEY, token), 'SESSION WRITE');
      setState({ user, token, loading: false });
      return { success: true };
    } catch (err) {
      console.error('[AUTH] REGISTER ERROR', err instanceof Error ? err.message : String(err));
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<AuthUser>('/auth/me');
      if (res.success) setState(s => ({ ...s, user: res.data }));
    } catch (err) {
      console.error('[AUTH] REFRESH USER ERROR', err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
