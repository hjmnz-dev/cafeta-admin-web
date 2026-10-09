import { useRef, useState, type ChangeEvent } from 'react';
import { Paperclip, X } from 'lucide-react';
import {
  canPublish,
  ANNOUNCEMENT_MAX,
  lengthOf,
  sizeLabel,
} from '../lib/announcements';
import { userMessageOf } from '../lib/http';
import {
  ALLOWED_FORMATS_TEXT,
  MEDIA_ACCEPT,
  canAttach,
  checkMediaFile,
  kindOf,
  type MediaKind,
} from '../lib/media';
import { messageForCode } from '../lib/error-messages';
import {
  usePublishAnnouncement,
  useUploadAnnouncementFile,
} from '../store/announcements-queries';

/**
 * Editor de un anuncio (spec 0009, decisión 36): texto de 1 a 2000 caracteres
 * y los mismos adjuntos de las publicaciones. Cada archivo se sube al elegirlo
 * y solo su clave viaja al publicar.
 */

interface Attachment {
  id: number;
  name: string;
  size: number;
  kind: MediaKind;
  status: 'uploading' | 'ready' | 'error';
  key?: string;
  error?: string;
}

const KIND_LABEL: Record<MediaKind, string> = {
  IMAGE: 'Imagen',
  VIDEO: 'Video',
  DOCUMENT: 'PDF',
};

export function AnnouncementComposer({
  onNotice,
}: {
  onNotice: (tone: 'ok' | 'warn', text: string) => void;
}) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const nextId = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const publish = usePublishAnnouncement();
  const upload = useUploadAnnouncementFile();

  const patch = (id: number, change: Partial<Attachment>) =>
    setFiles((current) =>
      current.map((f) => (f.id === id ? { ...f, ...change } : f)),
    );

  const attach = (file: File, kinds: MediaKind[]): MediaKind | null => {
    const problem = checkMediaFile(file);
    const kind = kindOf(file.type);
    if (problem || !kind) {
      onNotice('warn', messageForCode(problem ?? 'UNSUPPORTED_MEDIA_TYPE'));
      return null;
    }
    if (!canAttach(kinds, kind)) {
      onNotice('warn', messageForCode('MEDIA_COMBINATION_INVALID'));
      return null;
    }
    const id = nextId.current++;
    setFiles((current) => [
      ...current,
      { id, name: file.name, size: file.size, kind, status: 'uploading' },
    ]);
    upload.mutate(file, {
      onSuccess: (done) => patch(id, { status: 'ready', key: done.key }),
      onError: (error) =>
        patch(id, { status: 'error', error: userMessageOf(error) }),
    });
    return kind;
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = '';
    // Los tipos ya aceptados cuentan para la regla de "4 imágenes, o 1 video, o 1 PDF".
    const kinds = files.filter((f) => f.status !== 'error').map((f) => f.kind);
    for (const file of chosen) {
      const kind = attach(file, kinds);
      if (kind) kinds.push(kind);
    }
  };

  const busy = files.some((f) => f.status === 'uploading');
  const ready = files.filter((f) => f.status === 'ready');
  const length = lengthOf(content);

  const submit = () =>
    publish.mutate(
      {
        content: content.trim(),
        mediaKeys: ready.flatMap((f) => (f.key ? [f.key] : [])),
      },
      {
        onSuccess: () => {
          setContent('');
          setFiles([]);
          onNotice('ok', 'Anuncio publicado. Ya lo ve toda la comunidad.');
        },
        onError: (error) => onNotice('warn', userMessageOf(error)),
      },
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canPublish(content, busy)) submit();
      }}
      className="bg-white border border-[#e3ddd9] rounded-[18px] p-5 mb-6"
    >
      <label className="block text-[13px] font-semibold text-[#4a4340] mb-1.5">
        Texto del anuncio
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="mt-1.5 w-full rounded-[12px] border border-[#e3ddd9] bg-white px-3 py-2 text-[14px] font-normal outline-none focus:border-[#d62828]"
          placeholder="Escribe el aviso oficial para la comunidad…"
        />
      </label>
      <p
        className={
          'text-[12px] mb-3 ' +
          (length > ANNOUNCEMENT_MAX ? 'text-[#c42222]' : 'text-[#6b625e]')
        }
      >
        {length} / {ANNOUNCEMENT_MAX}
      </p>

      {files.length > 0 && (
        <ul className="mb-3 space-y-1.5" aria-label="Archivos adjuntos">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-[12px] bg-[#fbf8f7] px-3 py-2 text-[13px]"
            >
              <span className="min-w-0 truncate text-[#171313]">
                {KIND_LABEL[f.kind]} · {f.name}{' '}
                <span className="text-[#6b625e]">({sizeLabel(f.size)})</span>
                {f.status === 'uploading' && (
                  <span className="ml-2 text-[#6b625e]">Subiendo…</span>
                )}
                {f.status === 'error' && (
                  <span className="ml-2 text-[#b7791f]">{f.error}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() =>
                  setFiles((current) => current.filter((x) => x.id !== f.id))
                }
                aria-label={`Quitar ${f.name}`}
                className="flex-none text-[#6b625e] hover:text-[#c42222]"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <input
            ref={input}
            type="file"
            multiple
            accept={MEDIA_ACCEPT}
            onChange={choose}
            className="sr-only"
            aria-label="Elegir archivos"
          />
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#c42222] transition-colors"
          >
            <Paperclip className="w-4 h-4" aria-hidden /> Adjuntar archivos
          </button>
          <p className="mt-1.5 text-[12px] text-[#6b625e] max-w-[460px]">
            {ALLOWED_FORMATS_TEXT}
          </p>
        </div>
        <button
          type="submit"
          disabled={!canPublish(content, busy) || publish.isPending}
          className="px-5 py-2 rounded-full text-[14px] font-semibold bg-[#d62828] text-white hover:bg-[#7e1418] transition-colors disabled:opacity-50"
        >
          {publish.isPending ? 'Publicando…' : 'Publicar anuncio'}
        </button>
      </div>
    </form>
  );
}
