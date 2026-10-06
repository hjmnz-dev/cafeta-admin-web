import {
  initMonitoring,
  isMonitoringEnabled,
  monitoringOptions,
  reportError,
} from './monitoring';

describe('monitoreo sin DSN', () => {
  it('no inicia Sentry ni reporta nada', () => {
    initMonitoring({ VITE_SENTRY_DSN: '' });
    initMonitoring({});
    expect(isMonitoringEnabled()).toBe(false);
    expect(reportError(new Error('x'))).toBeUndefined();
  });
});

describe('monitoringOptions', () => {
  const options = monitoringOptions(
    'https://k@o1.ingest.us.sentry.io/1',
    'abc',
  );

  it('sin trazas, sin replay y sin datos personales', () => {
    expect(options.environment).toBe('production');
    expect(options.release).toBe('abc');
    expect(options.tracesSampleRate).toBeUndefined();
    expect(options.replaysSessionSampleRate).toBeUndefined();
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
    });
  });

  it('quita la integración de la consola', () => {
    const integrations = options.integrations as (
      defaults: { name: string }[],
    ) => { name: string }[];
    const kept = integrations([
      { name: 'Breadcrumbs' },
      { name: 'Console' },
      { name: 'GlobalHandlers' },
    ]).map((i) => i.name);
    expect(kept).toEqual(['Breadcrumbs', 'GlobalHandlers']);
  });
});
