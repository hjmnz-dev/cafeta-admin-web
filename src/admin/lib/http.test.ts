import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, SESSION_KEY, apiRequest, writeStoredSession } from './http';

const fetchMock = vi.fn();

describe('apiRequest como descarga', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    writeStoredSession({
      accessToken: 'token-de-prueba',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    sessionStorage.removeItem(SESSION_KEY);
  });

  it('devuelve el archivo tal cual y manda el token de la sesión', async () => {
    fetchMock.mockResolvedValue(new Response('a,b', { status: 200 }));

    const blob = await apiRequest<Blob>('/admin/reports/activity/csv', {
      as: 'blob',
    });

    expect(await blob.text()).toBe('a,b');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token-de-prueba',
    });
  });

  it('traduce el error JSON aunque se haya pedido un archivo', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          message: 'crudo',
          code: 'RANGE_TOO_LARGE',
        }),
        { status: 400 },
      ),
    );

    const failure = apiRequest('/admin/reports/activity/csv', {
      as: 'blob',
    }).catch((e: unknown) => e);

    const error = await failure;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('RANGE_TOO_LARGE');
    expect((error as ApiError).userMessage).toBe(
      'El rango no puede pasar de 92 días.',
    );
  });
});
