import type { Organization, User } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
export const ORG_STORAGE_KEY = 'agencyos.activeOrg';

export class ApiError extends Error { constructor(public status: number, message: string, public code?: string, public details?: unknown) { super(message); } }

function getCookie(name: string) { if (typeof document === 'undefined') return undefined; return document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.split('=').slice(1).join('='); }
export function getActiveOrg(): string | null { if (typeof window === 'undefined') return null; return localStorage.getItem(ORG_STORAGE_KEY); }
export function setActiveOrg(id: string) { localStorage.setItem(ORG_STORAGE_KEY, id); window.dispatchEvent(new Event('agencyos:org-changed')); }

let refreshPromise: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(getCookie('agencyos_csrf') ? { 'x-csrf-token': getCookie('agencyos_csrf')! } : {}) }, body: '{}' });
        return res.ok;
      } catch { return false; } finally { setTimeout(() => { refreshPromise = null; }, 0); }
    })();
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: RequestInit & { orgId?: string | null; skipAuthRefresh?: boolean } = {}): Promise<T> {
  const { orgId = getActiveOrg(), skipAuthRefresh, ...init } = options;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (orgId) headers.set('x-organization-id', orgId);
  const csrf = getCookie('agencyos_csrf');
  if (csrf && init.method && init.method !== 'GET') headers.set('x-csrf-token', csrf);
  const doFetch = () => fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
  let res = await doFetch();
  if (res.status === 401 && !skipAuthRefresh && !path.startsWith('/auth/')) {
    const ok = await tryRefresh();
    if (ok) { const newCsrf = getCookie('agencyos_csrf'); if (newCsrf) headers.set('x-csrf-token', newCsrf); res = await doFetch(); }
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  // A proxy/gateway error page (502/504 HTML) is not JSON; surface it as an ApiError, not a SyntaxError.
  let body: { message?: string | string[]; code?: string; details?: unknown } | undefined;
  try { body = text ? JSON.parse(text) : undefined; } catch { if (res.ok) throw new ApiError(res.status, 'Unexpected response from the server'); body = undefined; }
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, message, body?.code, body?.details);
  }
  return body as T;
}

export const authApi = {
  me: () => api<User & { memberships: { organization: Organization; role: Organization['role']; clientId?: string | null }[] }>('/auth/me', { orgId: null, skipAuthRefresh: true }),
  login: (email: string, password: string) => api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), orgId: null, skipAuthRefresh: true }),
  register: (data: { name: string; email: string; password: string; organizationName: string }) => api<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data), orgId: null, skipAuthRefresh: true }),
  logout: () => api('/auth/logout', { method: 'POST', body: '{}', orgId: null, skipAuthRefresh: true }),
  forgot: (email: string) => api<{ message: string; developmentResetUrl?: string; emailDelivered?: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }), orgId: null, skipAuthRefresh: true }),
  reset: (token: string, password: string) => api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }), orgId: null, skipAuthRefresh: true }),
  accept: (data: { token: string; name?: string; password?: string }) => api<{ user: User }>('/auth/accept-invitation', { method: 'POST', body: JSON.stringify(data), orgId: null, skipAuthRefresh: true }),
};
