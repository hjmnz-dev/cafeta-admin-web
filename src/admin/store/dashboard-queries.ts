import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/dashboard-api';

export const dashboardKeys = {
  metrics: ['admin', 'dashboard'] as const,
};

/** Métricas del dashboard: la API las calcula al momento, sin caché propio. */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.metrics,
    queryFn: dashboardApi.metrics,
  });
}
