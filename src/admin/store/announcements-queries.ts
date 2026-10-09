import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { announcementsApi } from '../lib/announcements-api';

export const announcementKeys = {
  all: ['admin', 'announcements'] as const,
};

/** Todos los anuncios por páginas, activos y desactivados. */
export function useAnnouncements() {
  return useInfiniteQuery({
    queryKey: announcementKeys.all,
    queryFn: ({ pageParam }) => announcementsApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Tras publicar o desactivar, éxito o error, la lista vuelve a pedirse. */
function useRefreshAfter() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: announcementKeys.all });
  };
}

export function usePublishAnnouncement() {
  const refresh = useRefreshAfter();
  return useMutation({
    mutationFn: ({
      content,
      mediaKeys,
    }: {
      content: string;
      mediaKeys: string[];
    }) => announcementsApi.create(content, mediaKeys),
    onSettled: refresh,
  });
}

export function useDeactivateAnnouncement() {
  const refresh = useRefreshAfter();
  return useMutation({
    mutationFn: (id: string) => announcementsApi.deactivate(id),
    onSettled: refresh,
  });
}

export function useUploadAnnouncementFile() {
  return useMutation({
    mutationFn: (file: File) => announcementsApi.upload(file),
  });
}
