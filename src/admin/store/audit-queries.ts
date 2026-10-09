import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { auditApi, type AuditFilters } from '../lib/audit-api';

export const auditKeys = {
  list: (filters: AuditFilters) => ['admin', 'audit-logs', filters] as const,
  actions: ['admin', 'audit-logs', 'actions'] as const,
};

/** Bitácora por páginas; cambiar un filtro empieza otra lista. */
export function useAuditLogs(filters: AuditFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: auditKeys.list(filters),
    queryFn: ({ pageParam }) => auditApi.list(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

/** El catálogo casi no cambia: se pide una vez por sesión. */
export function useAuditActions() {
  return useQuery({
    queryKey: auditKeys.actions,
    queryFn: auditApi.actions,
    staleTime: Infinity,
  });
}
