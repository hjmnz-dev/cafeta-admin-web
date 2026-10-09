import type { components } from './api-types';
import { apiRequest } from './http';

export type AuditEntry = components['schemas']['AdminAuditEntryDto'];
export type AuditPage = components['schemas']['AdminAuditPageDto'];

/** Filtros de la bitácora; lo que no se envía, no filtra. */
export interface AuditFilters {
  actor: string;
  /** Código del catálogo, o '' para todas. */
  action: string;
  result: 'all' | 'succeeded' | 'rejected';
  /** AAAA-MM-DD o ''. */
  from: string;
  to: string;
}

export const NO_AUDIT_FILTERS: AuditFilters = {
  actor: '',
  action: '',
  result: 'all',
  from: '',
  to: '',
};

const PAGE_SIZE = 20;

/** Cadena de consulta de GET /admin/audit-logs para unos filtros y un cursor. */
export function auditQuery(filters: AuditFilters, cursor?: string): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  const actor = filters.actor.trim();
  if (actor) params.set('actor', actor);
  if (filters.action) params.set('action', filters.action);
  if (filters.result !== 'all') {
    params.set('succeeded', String(filters.result === 'succeeded'));
  }
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}

export const auditApi = {
  list: (filters: AuditFilters, cursor?: string) =>
    apiRequest<AuditPage>(`/admin/audit-logs?${auditQuery(filters, cursor)}`),
  actions: () =>
    apiRequest<components['schemas']['AuditActionsDto']>(
      '/admin/audit-logs/actions',
    ),
};
