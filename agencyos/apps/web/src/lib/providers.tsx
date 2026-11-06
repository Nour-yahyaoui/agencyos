'use client';
import * as React from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, authApi, getActiveOrg, setActiveOrg } from './api';
import type { MemberRole, Organization, User } from './types';

interface AuthState { user: User | null; organizations: Organization[]; org: Organization | null; role: MemberRole | null; isLoading: boolean; refresh: () => Promise<void>; logout: () => Promise<void>; switchOrg: (id: string) => void; isAgency: boolean; isManagement: boolean; isClient: boolean; isSuperAdmin: boolean; }
const AuthContext = React.createContext<AuthState | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 20000, retry: 1, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me, retry: false, staleTime: 30000 });
  const orgs = useQuery({ queryKey: ['organizations'], queryFn: () => api<{ data: Organization[] }>('/organizations', { orgId: null }), enabled: !!me.data, retry: false });
  const [orgId, setOrgId] = React.useState<string | null>(null);
  React.useEffect(() => { setOrgId(getActiveOrg()); const h = () => setOrgId(getActiveOrg()); window.addEventListener('agencyos:org-changed', h); return () => window.removeEventListener('agencyos:org-changed', h); }, []);
  const organizations = orgs.data?.data ?? [];
  const org = organizations.find((o) => o.id === orgId) ?? organizations[0] ?? null;
  React.useEffect(() => { if (org && org.id !== orgId) setActiveOrg(org.id); }, [org, orgId]);
  const refresh = React.useCallback(async () => { await Promise.all([me.refetch(), orgs.refetch()]); }, [me, orgs]);
  const logout = React.useCallback(async () => { try { await authApi.logout(); } catch {} qc.clear(); localStorage.removeItem('agencyos.activeOrg'); router.push('/login'); }, [qc, router]);
  const switchOrg = React.useCallback((id: string) => { setActiveOrg(id); qc.invalidateQueries(); }, [qc]);
  const role = org?.role ?? null;
  const value: AuthState = { user: me.data ?? null, organizations, org, role, isLoading: me.isLoading || (!!me.data && orgs.isLoading), refresh, logout, switchOrg, isAgency: !!role && role !== 'CLIENT', isManagement: role === 'OWNER' || role === 'MANAGER', isClient: role === 'CLIENT', isSuperAdmin: me.data?.platformRole === 'SUPER_ADMIN' };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = React.useContext(AuthContext); if (!ctx) throw new Error('useAuth outside provider'); return ctx; }
export function useApiError() { return (e: unknown) => toast.error(e instanceof Error ? e.message : 'Operation failed'); }
