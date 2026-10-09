import type { components } from './api-types';
import { apiRequest } from './http';

export type ReviewReport = components['schemas']['AdminReportViewDto'];
export type ReviewReportDetail = components['schemas']['AdminReportDetailDto'];
export type ResolveAction = components['schemas']['ResolveReportDto']['action'];

/** Filtros de la cola; la pestaña manda el estado. */
export interface ReviewFilters {
  status: 'PENDING' | 'SANCTIONED' | 'DISMISSED';
  targetType: 'all' | 'USER' | 'POST';
}

export const PENDING_QUEUE: ReviewFilters = {
  status: 'PENDING',
  targetType: 'all',
};

const PAGE_SIZE = 20;

/** Cadena de consulta de GET /admin/community-reports para unos filtros y un cursor. */
export function reviewQuery(filters: ReviewFilters, cursor?: string): string {
  const params = new URLSearchParams({
    status: filters.status,
    limit: String(PAGE_SIZE),
  });
  if (filters.targetType !== 'all')
    params.set('targetType', filters.targetType);
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}

export const reviewApi = {
  list: (filters: ReviewFilters, cursor?: string) =>
    apiRequest<components['schemas']['AdminReportPageDto']>(
      `/admin/community-reports?${reviewQuery(filters, cursor)}`,
    ),
  detail: (id: string) =>
    apiRequest<ReviewReportDetail>(`/admin/community-reports/${id}`),
  resolve: (id: string, action: ResolveAction, note?: string) =>
    apiRequest<void>(`/admin/community-reports/${id}/resolve`, {
      method: 'POST',
      body: note ? { action, note } : { action },
    }),
};
