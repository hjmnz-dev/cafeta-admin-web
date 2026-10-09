import type { components } from './api-types';
import { apiRequest } from './http';

export type Announcement = components['schemas']['AdminAnnouncementViewDto'];
export type AnnouncementPage =
  components['schemas']['AdminAnnouncementPageDto'];
export type UploadView = components['schemas']['UploadViewDto'];

const PAGE_SIZE = 20;

export const announcementsApi = {
  list: (cursor?: string) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set('cursor', cursor);
    return apiRequest<AnnouncementPage>(
      `/admin/announcements?${params.toString()}`,
    );
  },
  create: (content: string, mediaKeys: string[]) =>
    apiRequest<{ id: string }>('/admin/announcements', {
      method: 'POST',
      body: { content, ...(mediaKeys.length > 0 ? { mediaKeys } : {}) },
    }),
  /** Los anuncios se desactivan con la misma ruta de cualquier publicación. */
  deactivate: (id: string) =>
    apiRequest<void>(`/posts/${id}/deactivate`, { method: 'POST' }),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<UploadView>('/uploads', { method: 'POST', body: form });
  },
};
