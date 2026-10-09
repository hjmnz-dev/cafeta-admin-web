/**
 * Reglas de archivos de la consola (spec 0008, decisión 13). Son las mismas de
 * la API y de la web; aquí solo evitan subir algo que la API va a rechazar. La
 * API decide de verdad por los primeros bytes del archivo.
 */
export type MediaKind = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

const MB = 1024 * 1024;

const FORMATS: Readonly<Record<string, { kind: MediaKind; maxBytes: number }>> =
  {
    'image/jpeg': { kind: 'IMAGE', maxBytes: 5 * MB },
    'image/png': { kind: 'IMAGE', maxBytes: 5 * MB },
    'image/webp': { kind: 'IMAGE', maxBytes: 5 * MB },
    'image/gif': { kind: 'IMAGE', maxBytes: 5 * MB },
    'video/mp4': { kind: 'VIDEO', maxBytes: 25 * MB },
    'video/webm': { kind: 'VIDEO', maxBytes: 25 * MB },
    'application/pdf': { kind: 'DOCUMENT', maxBytes: 10 * MB },
  };

export const ALLOWED_FORMATS_TEXT =
  'Imágenes JPG, PNG, WebP o GIF (hasta 5 MB), video MP4 o WebM (hasta 25 MB) y PDF (hasta 10 MB). Hasta 4 imágenes, o 1 video, o 1 PDF.';

/** Valor del atributo accept del selector de archivos. */
export const MEDIA_ACCEPT = Object.keys(FORMATS).join(',');

export const MAX_IMAGES = 4;

export function kindOf(type: string): MediaKind | null {
  return FORMATS[type]?.kind ?? null;
}

/** Código de error que daría la API para este archivo, o null si pasa. */
export function checkMediaFile(file: {
  type: string;
  size: number;
}): 'UNSUPPORTED_MEDIA_TYPE' | 'FILE_TOO_LARGE' | null {
  const format = FORMATS[file.type];
  if (!format) return 'UNSUPPORTED_MEDIA_TYPE';
  if (file.size > format.maxBytes) return 'FILE_TOO_LARGE';
  return null;
}

/** Hasta 4 imágenes, o 1 video, o 1 PDF: ¿cabe uno más de este tipo? */
export function canAttach(
  current: readonly MediaKind[],
  next: MediaKind,
): boolean {
  if (current.length === 0) return true;
  return (
    next === 'IMAGE' &&
    current.every((kind) => kind === 'IMAGE') &&
    current.length < MAX_IMAGES
  );
}
