import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  reviewApi,
  type ResolveAction,
  type ReviewFilters,
} from '../lib/review-api';
import { dashboardKeys } from './dashboard-queries';
import { userKeys } from './users-queries';

export const reviewKeys = {
  all: ['admin', 'reports'] as const,
  list: (filters: ReviewFilters) => ['admin', 'reports', filters] as const,
  detail: (id: string) => ['admin', 'reports', 'detail', id] as const,
};

/** Cola de reportes por páginas; cambiar la pestaña o el tipo empieza otra. */
export function useReportQueue(filters: ReviewFilters) {
  return useInfiniteQuery({
    queryKey: reviewKeys.list(filters),
    queryFn: ({ pageParam }) => reviewApi.list(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Detalle con los otros pendientes sobre el mismo objetivo; solo si se pide. */
export function useReportDetail(id: string, enabled: boolean) {
  return useQuery({
    queryKey: reviewKeys.detail(id),
    queryFn: () => reviewApi.detail(id),
    enabled,
  });
}

/**
 * Resolver cambia la cola, el contador del dashboard y, al sancionar a una
 * cuenta, la lista de usuarios. También se refresca si falla: un 409 significa
 * que otro admin ya lo cerró y la cola debe corregirse sola.
 */
export function useResolveReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      note,
    }: {
      id: string;
      action: ResolveAction;
      note?: string;
    }) => reviewApi.resolve(id, action, note),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: reviewKeys.all });
      void client.invalidateQueries({ queryKey: dashboardKeys.metrics });
      void client.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
