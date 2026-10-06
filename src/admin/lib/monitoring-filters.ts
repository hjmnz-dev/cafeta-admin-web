/**
 * Filtros puros del monitoreo (spec 0007). Limpian cada evento y cada
 * breadcrumb antes de salir hacia Sentry: nada de query, fragmento, cookies,
 * headers (salvo User-Agent) ni datos del usuario fuera de su id.
 */
import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/react';

const MAX_PER_WINDOW = 10;
const WINDOW_MS = 60_000;

/** Quita la query (`?…`) y el fragmento (`#…`) de una URL. */
export function stripUrl(url: string): string {
  return url.split(/[?#]/, 1)[0] ?? '';
}

/** Clave del tope: el tipo del error más su mensaje. */
export function throttleKey(error: unknown): string {
  return error instanceof Error
    ? `${error.name}:${error.message}`
    : `NonError:${String(error)}`;
}

export type AllowReport = (key: string, now: number) => boolean;

/**
 * Tope de AC-18: como máximo 10 eventos por clave en cada ventana de 60 s.
 * El estado vive en el cierre que devuelve esta función (uno por
 * `initMonitoring`), nunca en una variable del módulo.
 */
export function createThrottle(): AllowReport {
  const windows = new Map<string, { start: number; count: number }>();
  return (key, now) => {
    const current = windows.get(key);
    if (!current || now - current.start >= WINDOW_MS) {
      windows.set(key, { start: now, count: 1 });
      return true;
    }
    if (current.count >= MAX_PER_WINDOW) return false;
    windows.set(key, { start: current.start, count: current.count + 1 });
    return true;
  };
}

/** Limpia un evento; devuelve null para descartarlo (tope). */
export function scrubBrowserEvent(
  event: ErrorEvent,
  hint: EventHint,
  allow: AllowReport,
  now: number,
): ErrorEvent | null {
  if (!allow(throttleKey(hint.originalException), now)) return null;

  const scrubbed: ErrorEvent = { ...event };
  if (event.request) {
    const userAgent = event.request.headers?.['User-Agent'];
    scrubbed.request = {
      url: event.request.url ? stripUrl(event.request.url) : undefined,
      headers: userAgent ? { 'User-Agent': userAgent } : undefined,
    };
  }
  if (event.user) {
    scrubbed.user = event.user.id === undefined ? {} : { id: event.user.id };
  }
  return scrubbed;
}

/** Limpia un breadcrumb; descarta los de la consola. */
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category === 'console') return null;
  if (!crumb.data) return crumb;
  const data = { ...crumb.data };
  for (const field of ['url', 'from', 'to'] as const) {
    if (typeof data[field] === 'string') data[field] = stripUrl(data[field]);
  }
  return { ...crumb, data };
}
