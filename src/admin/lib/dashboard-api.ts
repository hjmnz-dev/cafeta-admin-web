import type { components } from './api-types';
import { apiRequest } from './http';

export type DashboardMetrics = components['schemas']['DashboardMetricsDto'];

export const dashboardApi = {
  metrics: () => apiRequest<DashboardMetrics>('/admin/dashboard'),
};
