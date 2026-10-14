import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { reviewApi, type ReviewReport } from '../lib/review-api';
import { ReportsReviewScreen } from './ReportsReviewScreen';

vi.mock('../lib/review-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/review-api')>()),
  reviewApi: { list: vi.fn(), detail: vi.fn(), resolve: vi.fn() },
}));

const api = vi.mocked(reviewApi);

const person = (handle: string, displayName: string) => ({
  id: `id-${handle}`,
  handle,
  displayName,
});

const NO_TARGET = {
  userId: null,
  postId: null,
  handle: null,
  displayName: null,
  active: null,
  snapshot: null,
  currentContent: null,
  postState: null,
};

const userReport = (patch: Partial<ReviewReport> = {}): ReviewReport => ({
  id: 'r1',
  targetType: 'USER',
  reason: 'HARASSMENT',
  details: null,
  status: 'PENDING',
  reporter: person('ana', 'Ana Pérez'),
  target: {
    ...NO_TARGET,
    userId: 'u9',
    handle: 'roberto',
    displayName: 'Roberto Díaz',
    active: true,
  },
  otherPending: 0,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNote: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  ...patch,
});

const postReport = (patch: Partial<ReviewReport> = {}): ReviewReport =>
  userReport({
    id: 'r2',
    targetType: 'POST',
    reason: 'SPAM',
    target: {
      ...NO_TARGET,
      postId: 'p1',
      handle: 'laura',
      displayName: 'Laura Batista',
      active: true,
      snapshot: 'Compra ya mi curso',
      currentContent: 'Texto editado después',
      postState: 'ACTIVE',
    },
    ...patch,
  });

const page = (items: ReviewReport[], nextCursor: string | null = null) => ({
  items,
  nextCursor,
});

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ReportsReviewScreen />
    </QueryClientProvider>,
  );
}

const lastFilters = () => api.list.mock.calls.at(-1)?.[0];

describe('HU51/HU52 — Revisar reportes de la comunidad', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue(page([userReport(), postReport()]));
    api.resolve.mockResolvedValue(undefined);
  });

  it('la cola real pide los pendientes y muestra lo denunciado a la vista', async () => {
    renderScreen();

    expect(await screen.findByText('Roberto Díaz')).toBeInTheDocument();
    expect(lastFilters()).toMatchObject({
      status: 'PENDING',
      targetType: 'all',
    });
    expect(screen.getByText(/@roberto/)).toBeInTheDocument();
    expect(screen.getByText(/Acoso · reportado por @ana/)).toBeInTheDocument();
    expect(screen.getByText('“Texto editado después”')).toBeInTheDocument();
    expect(screen.getByText(/decía: “Compra ya mi curso”/)).toBeInTheDocument();
  });

  it('una cola vacía lo dice', async () => {
    api.list.mockResolvedValue(page([]));
    renderScreen();

    expect(
      await screen.findByText('No hay reportes pendientes'),
    ).toBeInTheDocument();
  });

  it('HU52, escenario 1 — sancionar pide la nota, desactiva y avisa', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Laura Batista', { exact: false });

    await user.click(
      screen.getByRole('button', { name: /desactivar publicación: reporte/i }),
    );
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', {
      name: 'Desactivar publicación',
    });
    expect(confirm).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText('Nota de la sanción'),
      'Es spam',
    );
    await user.click(confirm);

    await waitFor(() =>
      expect(api.resolve).toHaveBeenCalledWith(
        'r2',
        'DEACTIVATE_TARGET',
        'Es spam',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      /resuelto con sanción: la publicación quedó desactivada/i,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(1));
  });

  it('bug 1023 — desde una publicación se puede desactivar la cuenta del autor', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Laura Batista', { exact: false });

    await user.click(
      screen.getByRole('button', {
        name: /desactivar la cuenta de laura batista: reporte/i,
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(
      /la cuenta de laura batista quedará desactivada/i,
    );
    const confirm = within(dialog).getByRole('button', {
      name: 'Desactivar cuenta',
    });
    expect(confirm).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText('Nota de la sanción'),
      'Suplantación',
    );
    await user.click(confirm);

    await waitFor(() =>
      expect(api.resolve).toHaveBeenCalledWith(
        'r2',
        'DEACTIVATE_AUTHOR',
        'Suplantación',
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      /la cuenta de laura batista quedó desactivada/i,
    );
  });

  it('bug 1023 — un reporte de usuario o de una publicación borrada no ofrece desactivar al autor', async () => {
    api.list.mockResolvedValue(
      page([
        userReport(),
        postReport({
          id: 'r3',
          target: { ...NO_TARGET, postId: 'p2', postState: 'DELETED' },
        }),
      ]),
    );
    renderScreen();
    await screen.findByText('Roberto Díaz');

    expect(
      screen.queryByRole('button', { name: /desactivar la cuenta de/i }),
    ).not.toBeInTheDocument();
  });

  it('HU51, escenario 1 — sancionar a un usuario avisa que la cuenta quedó desactivada', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Roberto Díaz');

    await user.click(
      screen.getByRole('button', {
        name: /desactivar usuario: reporte contra roberto díaz/i,
      }),
    );
    const dialog = screen.getByRole('dialog');
    await user.type(
      within(dialog).getByLabelText('Nota de la sanción'),
      'Acoso',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Desactivar usuario' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /la cuenta de Roberto Díaz quedó desactivada/i,
    );
  });

  it('sancionar avisa cuántos reportes más se cierran', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue(page([userReport({ otherPending: 2 })]));
    renderScreen();
    await screen.findByText('Roberto Díaz');

    await user.click(
      screen.getByRole('button', { name: /desactivar usuario: reporte/i }),
    );
    expect(
      within(screen.getByRole('dialog')).getByText(
        /2 reportes pendientes más sobre lo mismo/,
      ),
    ).toBeInTheDocument();
  });

  it('Escenario 2 — desestimar no pide nota y no toca la cuenta', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Roberto Díaz');

    await user.click(
      screen.getByRole('button', {
        name: /desestimar reporte contra roberto díaz/i,
      }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Desestimar reporte',
      }),
    );

    await waitFor(() =>
      expect(api.resolve).toHaveBeenCalledWith('r1', 'DISMISS', undefined),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/desestimado/i);
  });

  it('si otro admin ya lo resolvió, lo explica y la cola se vuelve a pedir', async () => {
    const user = userEvent.setup();
    api.resolve.mockRejectedValue(
      new ApiError(
        409,
        'REPORT_ALREADY_RESOLVED',
        'Otro administrador ya resolvió este reporte.',
      ),
    );
    renderScreen();
    await screen.findByText('Roberto Díaz');

    await user.click(
      screen.getByRole('button', {
        name: /desestimar reporte contra roberto/i,
      }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Desestimar reporte',
      }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Otro administrador ya resolvió este reporte.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(1));
  });

  it('"N reportes más" abre el detalle con los otros pendientes', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue(page([userReport({ otherPending: 1 })]));
    api.detail.mockResolvedValue({
      ...userReport({ otherPending: 1 }),
      related: [
        {
          id: 'r9',
          reason: 'SPAM',
          details: null,
          reporter: person('beto', 'Beto Gil'),
          createdAt: '2026-10-02T12:00:00.000Z',
        },
      ],
    });
    renderScreen();
    await screen.findByText('Roberto Díaz');

    await user.click(
      screen.getByRole('button', { name: '1 reporte más sobre lo mismo' }),
    );

    expect(await screen.findByText(/Spam · @beto/)).toBeInTheDocument();
    expect(api.detail).toHaveBeenCalledWith('r1');
  });

  it('la pestaña Resueltos pide el estado resuelto, con la nota y quién lo hizo', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Roberto Díaz');

    api.list.mockResolvedValue(
      page([
        userReport({
          status: 'SANCTIONED',
          resolvedBy: person('hamsell', 'Hamsell Jiménez'),
          resolvedAt: '2026-10-03T12:00:00.000Z',
          resolutionNote: 'Acoso comprobado',
        }),
      ]),
    );
    await user.click(screen.getByRole('tab', { name: 'Resueltos' }));

    expect(
      await screen.findByText(/Resuelto por Hamsell Jiménez/),
    ).toBeInTheDocument();
    expect(screen.getByText('Nota: Acoso comprobado')).toBeInTheDocument();
    expect(lastFilters()?.status).toBe('SANCTIONED');
    expect(
      screen.queryByRole('button', { name: /desestimar/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Desestimados' }));
    await waitFor(() => expect(lastFilters()?.status).toBe('DISMISSED'));
  });

  it('el filtro de tipo pide solo usuarios o publicaciones', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('Roberto Díaz');

    await user.click(screen.getByRole('button', { name: 'Publicaciones' }));

    await waitFor(() => expect(lastFilters()?.targetType).toBe('POST'));
  });

  it('un error de la API se traduce y se puede reintentar', async () => {
    const user = userEvent.setup();
    api.list.mockRejectedValueOnce(
      new ApiError(500, 'X', 'Algo salió mal. Intenta de nuevo.'),
    );
    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algo salió mal. Intenta de nuevo.',
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Roberto Díaz')).toBeInTheDocument();
  });
});
