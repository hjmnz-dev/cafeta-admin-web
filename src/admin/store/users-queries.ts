import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  usersApi,
  type UserFilters,
  type VerificationDecision,
} from '../lib/users-api';
import { dashboardKeys } from './dashboard-queries';

export const userKeys = {
  all: ['admin', 'users'] as const,
  list: (filters: UserFilters) => ['admin', 'users', filters] as const,
};

/** Lista de usuarios por páginas; cambiar un filtro empieza otra lista. */
export function useAdminUsers(filters: UserFilters) {
  return useInfiniteQuery({
    queryKey: userKeys.list(filters),
    queryFn: ({ pageParam }) => usersApi.list(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/**
 * Tras cualquier acción, éxito o error, la lista vuelve a pedirse: si falló
 * porque la cuenta ya estaba en otro estado, la fila se corrige sola. El
 * dashboard cuenta las verificaciones pendientes, así que también se refresca.
 */
function useRefreshAfter() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: userKeys.all });
    void client.invalidateQueries({ queryKey: dashboardKeys.metrics });
  };
}

interface ReasonInput {
  id: string;
  reason: string;
}

export function useDeactivateUser() {
  const refresh = useRefreshAfter();
  return useMutation({
    mutationFn: ({ id, reason }: ReasonInput) =>
      usersApi.deactivate(id, reason),
    onSettled: refresh,
  });
}

export function useReactivateUser() {
  const refresh = useRefreshAfter();
  return useMutation({
    mutationFn: ({ id, reason }: ReasonInput) =>
      usersApi.reactivate(id, reason),
    onSettled: refresh,
  });
}

export function useDecideVerification() {
  const refresh = useRefreshAfter();
  return useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: VerificationDecision;
    }) => usersApi.decideVerification(id, decision),
    onSettled: refresh,
  });
}
