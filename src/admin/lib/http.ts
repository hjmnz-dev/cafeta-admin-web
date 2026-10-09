/**
 * Cliente HTTP único de la consola (mismo diseño que el de la web).
 *
 * Toda llamada a la API pasa por `apiRequest`: agrega el token de la sesión,
 * traduce el `code` de error a un mensaje para el usuario y, ante cualquier
 * 401, borra la sesión guardada y avisa con el evento `cafeta:admin-session-ended`
 * (lo escucha el SessionStore). La sesión se lee del almacenamiento en cada
 * llamada: no hay estado a nivel de módulo.
 *
 * La consola guarda la sesión solo en sessionStorage: cerrar la pestaña la
 * termina.
 */
import { GENERIC_ERROR_MESSAGE, messageForCode } from './error-messages';

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const SESSION_KEY = 'cafeta.admin.session';
export const SESSION_ENDED_EVENT = 'cafeta:admin-session-ended';

export interface StoredSession {
  accessToken: string;
  expiresAt: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = 'ApiError';
  }
}

/** Texto para el usuario de cualquier error: el traducido si vino de la API. */
export function userMessageOf(error: unknown): string {
  return error instanceof ApiError ? error.userMessage : GENERIC_ERROR_MESSAGE;
}

function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as StoredSession).accessToken === 'string' &&
      typeof (value as StoredSession).expiresAt === 'string'
    ) {
      return value as StoredSession;
    }
  } catch {
    /* sesión corrupta: se trata como ausente */
  }
  return null;
}

/** Sesión guardada y vigente. */
export function readStoredSession(
  now: number = Date.now(),
): StoredSession | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(SESSION_KEY);
  } catch {
    /* almacenamiento no disponible: sin sesión */
  }
  const session = parseSession(raw);
  if (!session || Date.parse(session.expiresAt) <= now) return null;
  return session;
}

export function writeStoredSession(session: StoredSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* sin almacenamiento la sesión no sobrevive a recargar la página */
  }
}

export function clearStoredSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nada que borrar */
  }
}

function codeOf(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    const code = (data as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'UNKNOWN';
}

/**
 * `as: 'blob'` es para descargas (un CSV): devuelve el archivo tal cual. Los
 * errores siguen llegando como JSON y se traducen igual.
 */
export async function apiRequest<T>(
  path: string,
  {
    method = 'GET',
    body,
    as = 'json',
  }: { method?: string; body?: unknown; as?: 'json' | 'blob' } = {},
): Promise<T> {
  const session = readStoredSession();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session) headers.Authorization = `Bearer ${session.accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', messageForCode('NETWORK_ERROR'));
  }

  if (res.status === 204) return undefined as T;
  if (res.ok && as === 'blob') return (await res.blob()) as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = codeOf(data);
    if (res.status === 401) {
      clearStoredSession();
      window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
    }
    throw new ApiError(res.status, code, messageForCode(code));
  }
  return data as T;
}
