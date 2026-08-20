/**
 * Portal API Client
 * Handles auth token injection, 401 interception, and error normalization.
 */
import * as SecureStore from 'expo-secure-store';

export const API_BASE = 'https://digital-marketing-hub.replit.app';
export const PORTAL_BASE = `${API_BASE}/api/portal`;
export const API_TIMEOUT_MS = 10_000;

export const SESSION_KEY = 'portal_session_token';

export type ApiResponse<T = unknown> = ({
  success: true;
  data: T;
  message?: string;
  meta?: { page: number; limit: number; total: number; pages: number; unread?: number };
} | {
  success: false;
  error: { code: string; message?: string; data?: unknown };
}) & { status?: number };

/** Called by AuthContext on 401 */
let _onUnauth: (() => void) | null = null;
export function setUnauthHandler(fn: () => void) { _onUnauth = fn; }

async function getToken(): Promise<string | null> {
  console.log('[AUTH] SESSION READ START');
  try {
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    console.log(`[AUTH] SESSION READ SUCCESS (${token ? 'present' : 'absent'})`);
    return token;
  } catch (err) {
    console.error('[AUTH] SESSION READ ERROR', safeErrorMessage(err));
    return null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${PORTAL_BASE}${path}`;
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  console.log(`[AUTH] REQUEST START ${init.method ?? 'GET'} ${path}`);

  try {
    const requestPromise = (async () => {
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
        ...(init.headers as Record<string, string>),
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url, { ...init, headers, signal: controller.signal });
      console.log(`[API] RESPONSE ${init.method ?? 'GET'} ${path} status=${res.status}`);

      if (res.status === 401) {
        // Public auth requests (login/register) can legitimately return 401.
        // Only expire a session when an authenticated request with a stored
        // token is rejected. Excluding logout prevents a 401 → logout loop.
        if (token && path !== '/auth/logout') _onUnauth?.();
        return { success: false, status: res.status, error: { code: 'UNAUTHENTICATED', message: 'Session expired' } } as ApiResponse<T>;
      }

      const json = await res.json() as Omit<ApiResponse<T>, 'status'>;
      return { ...json, status: res.status } as ApiResponse<T>;
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error(`Request timed out after ${API_TIMEOUT_MS}ms`));
      }, API_TIMEOUT_MS);
    });

    const result = await Promise.race([requestPromise, timeoutPromise]);
    if (result.success) {
      console.log(`[AUTH] REQUEST SUCCESS ${init.method ?? 'GET'} ${path}`);
    } else {
      console.error(
        `[AUTH] REQUEST ERROR ${init.method ?? 'GET'} ${path}`,
        result.error.code,
        result.error.message ?? '',
      );
    }
    return result;
  } catch (err) {
    const msg = safeErrorMessage(err);
    const isTimeout = msg.includes('timed out') || msg.includes('aborted');
    const isNetwork = isTimeout || msg.includes('Network') || msg.includes('fetch') || msg.includes('connect');
    console.error(`[AUTH] REQUEST ERROR ${init.method ?? 'GET'} ${path}`, msg);
    return {
      success: false,
      error: { code: isTimeout ? 'TIMEOUT' : isNetwork ? 'NETWORK_ERROR' : 'CLIENT_ERROR', message: msg },
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function safeErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const api = {
  get:    <T>(path: string) => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
