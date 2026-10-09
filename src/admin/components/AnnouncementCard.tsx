import { useState } from 'react';
import { formatDateTime } from '../lib/format';
import type { Announcement } from '../lib/announcements-api';

/**
 * Un anuncio en la lista de la consola. Los activos se pueden desactivar,
 * con una confirmación en la misma tarjeta; los demás solo se consultan.
 */

const BUTTON =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors disabled:opacity-50';

function stateOf(item: Announcement): { label: string; tone: string } {
  if (item.deactivatedAt) {
    return { label: 'Desactivado', tone: 'bg-[#f3efed] text-[#8a807c]' };
  }
  if (item.archivedAt) {
    return { label: 'Archivado', tone: 'bg-[#f3efed] text-[#8a807c]' };
  }
  return { label: 'Activo', tone: 'bg-[#e8f3ec] text-[#2f7d4f]' };
}

export function AnnouncementCard({
  item,
  pending,
  onDeactivate,
}: {
  item: Announcement;
  pending: boolean;
  onDeactivate: (item: Announcement) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const state = stateOf(item);

  return (
    <li className="bg-white border border-[#e3ddd9] rounded-[18px] p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[13px] text-[#8a807c]">
          {formatDateTime(Date.parse(item.createdAt))} · {item.publishedBy}
          {item.editedAt ? ' · editado' : ''}
        </p>
        <span
          className={`flex-none rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${state.tone}`}
        >
          {state.label}
        </span>
      </div>

      <p className="whitespace-pre-wrap break-words text-[14px] text-[#171313]">
        {item.content}
      </p>

      {item.media.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Adjuntos">
          {item.media.map((m, index) => (
            <li key={m.url}>
              {m.mediaType === 'IMAGE' ? (
                <img
                  src={m.url}
                  alt={`Imagen ${index + 1} del anuncio`}
                  className="h-20 w-20 rounded-[12px] object-cover border border-[#e3ddd9]"
                />
              ) : (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-[#e3ddd9] px-3 py-1 text-[13px] text-[#4a4340] hover:border-[#d62828]"
                >
                  {m.mediaType === 'VIDEO' ? 'Ver video' : 'Abrir PDF'}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-[#8a807c]">
          {item.reactionCount} reacciones · {item.commentCount} comentarios
        </p>
        {item.active && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Desactivar anuncio"
            className={`${BUTTON} border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#d62828]`}
          >
            Desactivar
          </button>
        )}
        {item.active && confirming && (
          <div className="flex items-center gap-2" role="group">
            <span className="text-[13px] text-[#4a4340]">
              Dejará de verse en el feed.
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => onDeactivate(item)}
              className={`${BUTTON} border-[#d62828] bg-[#d62828] text-white hover:bg-[#7e1418]`}
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={`${BUTTON} border-[#e3ddd9] text-[#4a4340]`}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
