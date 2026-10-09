import { afterEach, describe, expect, it, vi } from 'vitest';
import { canPublish, lengthOf, sizeLabel } from './announcements';
import { canAttach, checkMediaFile, kindOf, MAX_IMAGES } from './media';
import { apiRequest } from './http';

describe('canPublish', () => {
  it('pide texto de 1 a 2000 caracteres', () => {
    expect(canPublish('', false)).toBe(false);
    expect(canPublish('   ', false)).toBe(false);
    expect(canPublish('Hola', false)).toBe(true);
    expect(canPublish('x'.repeat(2000), false)).toBe(true);
    expect(canPublish('x'.repeat(2001), false)).toBe(false);
  });

  it('no deja publicar mientras se sube un archivo', () => {
    expect(canPublish('Hola', true)).toBe(false);
  });

  it('cuenta puntos de código: un emoji vale uno', () => {
    expect(lengthOf('😀')).toBe(1);
    expect(canPublish('😀'.repeat(2000), false)).toBe(true);
  });
});

describe('sizeLabel', () => {
  it('usa KB bajo 1 MB y MB desde ahí', () => {
    expect(sizeLabel(10)).toBe('1 KB');
    expect(sizeLabel(2048)).toBe('2 KB');
    expect(sizeLabel(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});

describe('reglas de archivos', () => {
  it('acepta los formatos de la API y rechaza el resto', () => {
    expect(checkMediaFile({ type: 'image/png', size: 100 })).toBeNull();
    expect(checkMediaFile({ type: 'video/mp4', size: 100 })).toBeNull();
    expect(checkMediaFile({ type: 'application/pdf', size: 100 })).toBeNull();
    expect(checkMediaFile({ type: 'text/html', size: 100 })).toBe(
      'UNSUPPORTED_MEDIA_TYPE',
    );
  });

  it('aplica el tope de cada tipo', () => {
    const MB = 1024 * 1024;
    expect(checkMediaFile({ type: 'image/png', size: 5 * MB })).toBeNull();
    expect(checkMediaFile({ type: 'image/png', size: 5 * MB + 1 })).toBe(
      'FILE_TOO_LARGE',
    );
    expect(checkMediaFile({ type: 'video/webm', size: 25 * MB + 1 })).toBe(
      'FILE_TOO_LARGE',
    );
    expect(checkMediaFile({ type: 'application/pdf', size: 10 * MB + 1 })).toBe(
      'FILE_TOO_LARGE',
    );
  });

  it('kindOf traduce el tipo de archivo', () => {
    expect(kindOf('image/gif')).toBe('IMAGE');
    expect(kindOf('video/mp4')).toBe('VIDEO');
    expect(kindOf('application/pdf')).toBe('DOCUMENT');
    expect(kindOf('text/plain')).toBeNull();
  });

  it('hasta 4 imágenes, o 1 video, o 1 PDF', () => {
    expect(canAttach([], 'VIDEO')).toBe(true);
    expect(canAttach(['IMAGE'], 'IMAGE')).toBe(true);
    expect(canAttach(Array(MAX_IMAGES).fill('IMAGE'), 'IMAGE')).toBe(false);
    expect(canAttach(['IMAGE'], 'DOCUMENT')).toBe(false);
    expect(canAttach(['VIDEO'], 'IMAGE')).toBe(false);
    expect(canAttach(['DOCUMENT'], 'DOCUMENT')).toBe(false);
  });
});

describe('apiRequest con FormData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('manda el FormData tal cual y deja que el navegador ponga el Content-Type', async () => {
    const fetchMock = vi.fn(
      async () => new Response('{"key":"k"}', { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const form = new FormData();
    form.append('file', new File(['x'], 'a.png', { type: 'image/png' }));

    await apiRequest('/uploads', { method: 'POST', body: form });

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.body).toBe(form);
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('un cuerpo normal sigue yendo como JSON', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/x', { method: 'POST', body: { a: 1 } });

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });
});
