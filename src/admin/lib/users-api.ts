import type { components } from './api-types';
import { apiRequest } from './http';

export type AdminUserView = components['schemas']['AdminUserViewDto'];
export type AdminUserPage = components['schemas']['AdminUserPageDto'];
export type VerificationDecision =
  components['schemas']['VerificationDecisionDto']['decision'];

/** Filtros de la lista; lo que no se envía, no filtra. */
export interface UserFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  verification: 'all' | 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export const NO_FILTERS: UserFilters = {
  search: '',
  status: 'all',
  verification: 'all',
};

const PAGE_SIZE = 20;

/** Cadena de consulta de GET /admin/users para unos filtros y un cursor. */
export function usersQuery(filters: UserFilters, cursor?: string): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.verification !== 'all') {
    params.set('verification', filters.verification);
  }
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}

export const usersApi = {
  list: (filters: UserFilters, cursor?: string) =>
    apiRequest<AdminUserPage>(`/admin/users?${usersQuery(filters, cursor)}`),
  deactivate: (id: string, reason: string) =>
    apiRequest<void>(`/admin/users/${id}/deactivate`, {
      method: 'POST',
      body: { reason },
    }),
  reactivate: (id: string, reason: string) =>
    apiRequest<void>(`/admin/users/${id}/reactivate`, {
      method: 'POST',
      body: { reason },
    }),
  decideVerification: (id: string, decision: VerificationDecision) =>
    apiRequest<void>(`/admin/users/${id}/verification`, {
      method: 'POST',
      body: { decision },
    }),
};
