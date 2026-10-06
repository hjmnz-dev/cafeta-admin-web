import type { ErrorEvent } from '@sentry/react';
import {
  createThrottle,
  scrubBreadcrumb,
  scrubBrowserEvent,
  stripUrl,
  throttleKey,
} from './monitoring-filters';

const allowAll = () => true;

const fullEvent = (): ErrorEvent => ({
  type: undefined,
  request: {
    url: 'https://cafeta/search?q=ana#top',
    query_string: 'q=ana',
    cookies: { a: 'b' },
    headers: { 'User-Agent': 'vitest', Referer: 'https://cafeta/u/1?x=1' },
  },
  user: { id: 'u-1', email: 'ana@est.intec.edu.do', username: 'ana' },
});

describe('stripUrl', () => {
  it('quita la query y el fragmento', () => {
    expect(stripUrl('https://cafeta/search?q=ana#top')).toBe(
      'https://cafeta/search',
    );
    expect(stripUrl('/home#x')).toBe('/home');
  });
});

describe('scrubBrowserEvent', () => {
  it('deja la URL limpia, solo User-Agent y solo el id del usuario', () => {
    const scrubbed = scrubBrowserEvent(
      fullEvent(),
      { originalException: new Error('x') },
      allowAll,
      0,
    );
    expect(scrubbed?.request).toEqual({
      url: 'https://cafeta/search',
      headers: { 'User-Agent': 'vitest' },
    });
    expect(scrubbed?.user).toEqual({ id: 'u-1' });
    expect(JSON.stringify(scrubbed)).not.toContain('ana');
  });

  it('descarta lo que pasa del tope', () => {
    const scrubbed = scrubBrowserEvent(
      fullEvent(),
      { originalException: new Error('x') },
      () => false,
      0,
    );
    expect(scrubbed).toBeNull();
  });
});

describe('scrubBreadcrumb', () => {
  it('descarta los de la consola', () => {
    expect(
      scrubBreadcrumb({ category: 'console', message: 'hola' }),
    ).toBeNull();
  });

  it('limpia las URLs de fetch, xhr y navegación', () => {
    expect(
      scrubBreadcrumb({ category: 'fetch', data: { url: '/api?token=1' } }),
    ).toEqual({ category: 'fetch', data: { url: '/api' } });
    expect(
      scrubBreadcrumb({
        category: 'navigation',
        data: { from: '/search?q=ana', to: '/u/1#bio' },
      }),
    ).toEqual({
      category: 'navigation',
      data: { from: '/search', to: '/u/1' },
    });
  });
});

describe('createThrottle', () => {
  it('deja pasar 10 por clave por minuto', () => {
    const allow = createThrottle();
    const results = Array.from({ length: 11 }, () => allow('a', 0));
    expect(results.filter(Boolean)).toHaveLength(10);
    expect(allow('b', 0)).toBe(true);
    expect(allow('a', 60_000)).toBe(true);
  });

  it('usa el tipo más el mensaje como clave', () => {
    expect(throttleKey(new TypeError('boom'))).toBe('TypeError:boom');
  });
});
