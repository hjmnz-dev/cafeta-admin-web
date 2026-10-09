import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { reportsApi, type ReportTable } from '../lib/reports-api';
import { saveFile } from '../lib/save-file';
import { AdminReportsScreen } from './AdminReportsScreen';

vi.mock('../lib/reports-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/reports-api')>()),
  reportsApi: { generate: vi.fn(), downloadCsv: vi.fn() },
}));
vi.mock('../lib/save-file', () => ({ saveFile: vi.fn() }));

const generate = vi.mocked(reportsApi.generate);
const downloadCsv = vi.mocked(reportsApi.downloadCsv);

const ACTIVITY: ReportTable = {
  kind: 'activity',
  title: 'Informe de actividad',
  from: '2026-09-01',
  to: '2026-09-02',
  columns: ['Fecha', 'Usuarios nuevos', 'Publicaciones'],
  rows: [
    ['2026-09-01', 3, 7],
    ['2026-09-02', 0, 2],
  ],
  isEmpty: false,
};

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminReportsScreen />
    </QueryClientProvider>,
  );
}

const setDates = async (
  user: ReturnType<typeof userEvent.setup>,
  from: string,
  to: string,
) => {
  const desde = screen.getByLabelText(/^desde$/i);
  const hasta = screen.getByLabelText(/^hasta$/i);
  await user.clear(desde);
  await user.type(desde, from);
  await user.clear(hasta);
  await user.type(hasta, to);
};

describe('HU44 — Generar informes administrativos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('HU44 E1: genera el informe con datos de la API y lo muestra en pantalla', async () => {
    generate.mockResolvedValue(ACTIVITY);
    const user = userEvent.setup();
    renderScreen();

    await setDates(user, '2026-09-01', '2026-09-02');
    await user.click(screen.getByRole('button', { name: /generar informe/i }));

    expect(
      await screen.findByRole('heading', { name: /informe de actividad/i }),
    ).toBeInTheDocument();
    expect(generate).toHaveBeenCalledWith('activity', {
      from: '2026-09-01',
      to: '2026-09-02',
    });
    expect(
      screen.getByRole('columnheader', { name: 'Usuarios nuevos' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /descargar csv/i }),
    ).toBeEnabled();
  });

  it('HU44 E1: el tipo elegido viaja a la API', async () => {
    generate.mockResolvedValue({ ...ACTIVITY, kind: 'moderation' });
    const user = userEvent.setup();
    renderScreen();

    await user.selectOptions(screen.getByLabelText(/tipo de informe/i), [
      'Moderación',
    ]);
    await user.click(screen.getByRole('button', { name: /generar informe/i }));

    await screen.findByRole('table');
    expect(generate).toHaveBeenCalledWith('moderation', expect.anything());
  });

  it('HU44 E1: descarga el CSV del informe que se ve', async () => {
    generate.mockResolvedValue(ACTIVITY);
    const blob = new Blob(['x'], { type: 'text/csv' });
    downloadCsv.mockResolvedValue(blob);
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /generar informe/i }));
    await user.click(
      await screen.findByRole('button', { name: /descargar csv/i }),
    );

    expect(downloadCsv).toHaveBeenCalledWith('activity', {
      from: '2026-09-01',
      to: '2026-09-02',
    });
    await vi.waitFor(() =>
      expect(saveFile).toHaveBeenCalledWith(
        blob,
        'cafeta-actividad-2026-09-01-2026-09-02.csv',
      ),
    );
  });

  it('HU44 E2: un rango sin actividad lo dice y no ofrece descarga', async () => {
    generate.mockResolvedValue({ ...ACTIVITY, isEmpty: true });
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /generar informe/i }));

    expect(
      await screen.findByText(/no hay datos disponibles para este rango/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /descargar csv/i }),
    ).toBeDisabled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('avisa sin llamar a la API cuando el rango pasa de 92 días', async () => {
    const user = userEvent.setup();
    renderScreen();

    await setDates(user, '2026-01-01', '2026-06-01');
    await user.click(screen.getByRole('button', { name: /generar informe/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/92 días/i);
    expect(generate).not.toHaveBeenCalled();
  });

  it('muestra el mensaje traducido, nunca el texto crudo de la API', async () => {
    generate.mockRejectedValue(
      new ApiError(
        400,
        'RANGE_TOO_LARGE',
        'El rango no puede pasar de 92 días.',
      ),
    );
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /generar informe/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El rango no puede pasar de 92 días.',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
