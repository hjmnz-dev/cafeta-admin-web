import { useState } from 'react';
import { userMessageOf } from '../lib/http';
import type { Announcement } from '../lib/announcements-api';
import {
  useAnnouncements,
  useDeactivateAnnouncement,
} from '../store/announcements-queries';
import { AnnouncementCard } from './AnnouncementCard';
import { AnnouncementComposer } from './AnnouncementComposer';

/**
 * HU24 — Anuncios institucionales.
 *
 * El admin escribe un aviso oficial (con adjuntos si hace falta) y lo ve
 * llegar a toda la comunidad con la marca de oficial. Debajo queda la lista
 * de todos los que ha publicado, activos y desactivados; un anuncio activo se
 * puede desactivar y deja de verse en el feed.
 */

type Notice = { tone: 'ok' | 'warn'; text: string };

export function AnnouncementsScreen() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const announcements = useAnnouncements();
  const deactivate = useDeactivateAnnouncement();

  const rows = announcements.data?.pages.flatMap((page) => page.items) ?? [];

  const turnOff = (item: Announcement) =>
    deactivate.mutate(item.id, {
      onSuccess: () =>
        setNotice({
          tone: 'ok',
          text: 'Anuncio desactivado. Ya no se ve en el feed.',
        }),
      onError: (error) =>
        setNotice({ tone: 'warn', text: userMessageOf(error) }),
    });

  return (
    <section className="max-w-[860px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Anuncios institucionales
        </h1>
        <p className="text-[14px] text-[#6b625e]">
          Avisos oficiales que ve toda la comunidad, con su marca de oficial.
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className={
            'mb-4 px-4 py-3 rounded-[14px] text-[14px] border ' +
            (notice.tone === 'ok'
              ? 'bg-[#e8f3ec] border-[#c9e2d3] text-[#2f7d4f]'
              : 'bg-[#fdf3e2] border-[#efdcb8] text-[#b7791f]')
          }
        >
          {notice.text}
        </p>
      )}

      <AnnouncementComposer
        onNotice={(tone, text) => setNotice({ tone, text })}
      />

      <h2 className="font-semibold text-[16px] mb-3">Publicados</h2>

      {announcements.isError && (
        <p
          role="alert"
          className="mb-4 px-4 py-3 rounded-[14px] text-[14px] border bg-[#fdf3e2] border-[#efdcb8] text-[#b7791f]"
        >
          {userMessageOf(announcements.error)}{' '}
          <button
            className="underline font-semibold"
            onClick={() => announcements.refetch()}
          >
            Reintentar
          </button>
        </p>
      )}

      {announcements.isPending && (
        <p className="py-6 text-center text-[#6b625e]">Cargando anuncios…</p>
      )}
      {announcements.isSuccess && rows.length === 0 && (
        <p className="py-6 text-center text-[#6b625e]">
          Todavía no has publicado ningún anuncio.
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((item) => (
          <AnnouncementCard
            key={item.id}
            item={item}
            pending={deactivate.isPending}
            onDeactivate={turnOff}
          />
        ))}
      </ul>

      {announcements.hasNextPage && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => announcements.fetchNextPage()}
            disabled={announcements.isFetchingNextPage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#c42222] transition-colors disabled:opacity-50"
          >
            {announcements.isFetchingNextPage
              ? 'Cargando…'
              : 'Ver más anuncios'}
          </button>
        </div>
      )}
    </section>
  );
}
