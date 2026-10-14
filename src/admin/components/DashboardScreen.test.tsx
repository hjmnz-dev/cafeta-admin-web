import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { dashboardApi, type DashboardMetrics } from '../lib/dashboard-api';
import { ApiError } from '../lib/http';
import { DashboardScreen } from './DashboardScreen';

vi.mock('../lib/dashboard-api', () => ({
  dashboardApi: { metrics: vi.fn() },
}));

const metrics = vi.mocked(dashboardApi.metrics);

const DATA: DashboardMetrics = {
  generatedAt: '2026-10-07T15:30:00.000Z',
  users: { total: 120, last7Days: 9 },
  posts: { total: 340, last7Days: 41 },
  activeStories: 17,
  pendingReports: 3,
  pendingVerifications: 5,
};

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// La etiqueta vive en una fila dentro de la tarjeta: dos niveles arriba está el
// bloque completo (cifra y aclaración).
const tileOf = async (label: string) =>
  (await screen.findByText(label)).parentElement!.parentElement!;

describe('HU43, escenario 1 — el administrador ve las métricas reales', () => {
  beforeEach(() => vi.clearAllMocks());

  it('HU43 E1: muestra cada indicador con su cifra y su aclaración de 7 días', async () => {
    metrics.mockResolvedValue(DATA);
    renderDashboard();

    const users = await tileOf('Usuarios activos');
    expect(users).toHaveTextContent('120');
    expect(users).toHaveTextContent('9 altas en los últimos 7 días');
    const posts = await tileOf('Publicaciones');
    expect(posts).toHaveTextContent('340');
    expect(posts).toHaveTextContent('41 nuevas en los últimos 7 días');
    expect(await tileOf('Historias vigentes')).toHaveTextContent('17');
    expect(await tileOf('Reportes pendientes')).toHaveTextContent('3');
    expect(await tileOf('Cuentas por verificar')).toHaveTextContent('5');
  });

  it('los reportes pendientes y las cuentas por verificar llevan a donde se atienden', async () => {
    metrics.mockResolvedValue(DATA);
    renderDashboard();

    expect(
      (await screen.findByText('Reportes pendientes')).closest('a'),
    ).toHaveAttribute('href', '/reportes');
    expect(
      screen.getByText('Cuentas por verificar').closest('a'),
    ).toHaveAttribute('href', '/usuarios');
  });

  it('un error de la API se traduce y se puede reintentar', async () => {
    const user = userEvent.setup();
    metrics.mockRejectedValueOnce(
      new ApiError(
        500,
        'INTERNAL_SERVER_ERROR',
        'Algo salió mal. Intenta de nuevo.',
      ),
    );
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algo salió mal. Intenta de nuevo.',
    );

    metrics.mockResolvedValue(DATA);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Usuarios activos')).toBeInTheDocument();
  });
});
