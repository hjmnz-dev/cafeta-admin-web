/** Largo del texto de un anuncio, en caracteres (como en la API). */
export const ANNOUNCEMENT_MAX = 2000;

/** Cuenta en puntos de código, igual que la API: un emoji vale uno. */
export const lengthOf = (text: string) => [...text.trim()].length;

/** ¿Se puede publicar? Texto de 1 a 2000 y ninguna subida en curso. */
export function canPublish(content: string, busy: boolean): boolean {
  const length = lengthOf(content);
  return !busy && length >= 1 && length <= ANNOUNCEMENT_MAX;
}

/** Texto de un tamaño de archivo, para la lista de adjuntos. */
export function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
