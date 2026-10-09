import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { auditApi, type AuditEntry } from '../lib/audit-api';
import { AuditLogScreen } from './AuditLogScreen';

vi.mock('../lib/audit-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/audit-api')>()),
  auditApi: { list: vi.fn(), actions: vi.fn() },
}));

const api = vi.mocked(auditApi);

const entry = (patch: Partial<AuditEntry>): AuditEntry => ({
  id: 'a1',
  createdAt: '2026-10-01T14:30:00.000Z',
  actor: {
    id: 'u1',
    email: 'hamsell@intec.edu.do',
    handle: 'hamsell',
    role: 'ADMIN',
  },
  action: 'account.deactivate',
  entityType: 'user',
  entityId: '0198f2a1-aaaa-7000-8000-000000000001',
  succeeded: true,
  metadata: { reason: 'Suplantación de identidad' },
  ip: '10.0.0.1',
  ...patch,
});

const DEACTIVATE = entry({});
const DENIED = entry({
  id: 'a2',
  actor: {
    id: 'u2',
    email: 'ana@est.intec.edu.do',
    handle: 'ana',
    role: 'STUDENT',
  },
  action: 'access.denied',
  entityType: 'route',
  entityId: null,
  succeeded: false,
  metadata: null,
});
const ANONYMOUS = entry({
  id: 'a3',
  actor: null,
  action: 'access.denied',
  entityType: 'route',
  entityId: null,
  succeeded: false,
  metadata: null,
});

const page = (items: AuditEntry[], nextCursor: string | null = null) => ({
  items,
  nextCursor,
});

function renderAudit() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuditLogScreen />
    </QueryClientProvider>,
  );
}

// La tabla existe desde el primer render; esto espera a que lleguen las filas.
async function rowsLoaded(count: number) {
  const table = screen.getByRole('table');
  await waitFor(() =>
    expect(within(table).getAllByRole('row')).toHaveLength(count + 1),
  );
  return table;
}

const lastFilters = () => api.list.mock.calls.at(-1)?.[0];

describe('HU45 — Bitácora de auditoría', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue(page([DEACTIVATE, DENIED]));
    api.actions.mockResolvedValue({
      actions: ['account.deactivate', 'access.denied', 'post.create'],
    });
  });

  it('escenario 1 — muestra quién, qué, sobre qué y cuándo de cada registro', async () => {
    renderAudit();

    const table = await rowsLoaded(2);
    const rows = within(table).getAllByRole('row');
    const first = within(rows[1]);
    expect(first.getByText('hamsell@intec.edu.do')).toBeInTheDocument();
    expect(first.getByText(/@hamsell · Administrador/)).toBeInTheDocument();
    expect(first.getByText('Desactivar cuenta')).toBeInTheDocument();
    expect(first.getByText('Usuario · 0198f2a1')).toBeInTheDocument();
    expect(
      first.getByText('reason: Suplantación de identidad'),
    ).toBeInTheDocument();
    expect(first.getByText(/2026/)).toBeInTheDocument();
  });

  it('marca distinto un intento rechazado, con o sin sesión', async () => {
    api.list.mockResolvedValue(page([DEACTIVATE, DENIED, ANONYMOUS]));
    renderAudit();

    await rowsLoaded(3);

    expect(screen.getAllByLabelText('Ejecutada')).toHaveLength(1);
    expect(screen.getAllByLabelText('Rechazada')).toHaveLength(2);
    expect(screen.getByText('Sin sesión')).toBeInTheDocument();
  });

  it('llena el selector de acciones con el catálogo de la API', async () => {
    renderAudit();

    await screen.findByRole('table');
    const select = screen.getByRole('combobox', {
      name: /filtrar por acción/i,
    });

    await waitFor(() =>
      expect(
        within(select).getByRole('option', { name: 'Crear publicación' }),
      ).toBeInTheDocument(),
    );
  });

  it('escenario 2 — filtra por acción, resultado y responsable en la API', async () => {
    const user = userEvent.setup();
    renderAudit();
    await screen.findByRole('table');
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Acceso denegado' }),
      ).toBeInTheDocument(),
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filtrar por acción/i }),
      'Acceso denegado',
    );
    await waitFor(() => expect(lastFilters()?.action).toBe('access.denied'));

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filtrar por resultado/i }),
      'Rechazadas',
    );
    await waitFor(() => expect(lastFilters()?.result).toBe('rejected'));

    await user.type(
      screen.getByRole('searchbox', { name: /buscar por responsable/i }),
      'ana',
    );
    await waitFor(() => expect(lastFilters()?.actor).toBe('ana'));
  });

  it('escenario 2 — filtra por rango de fechas', async () => {
    const user = userEvent.setup();
    renderAudit();
    await screen.findByRole('table');

    await user.type(screen.getByLabelText('Desde'), '2026-10-01');
    await user.type(screen.getByLabelText('Hasta'), '2026-10-02');

    await waitFor(() => {
      expect(lastFilters()?.from).toBe('2026-10-01');
      expect(lastFilters()?.to).toBe('2026-10-02');
    });
  });

  it('un rango al revés se avisa y no se pide a la API', async () => {
    const user = userEvent.setup();
    renderAudit();
    await screen.findByRole('table');
    await user.type(screen.getByLabelText('Desde'), '2026-10-05');
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    const calls = api.list.mock.calls.length;

    await user.type(screen.getByLabelText('Hasta'), '2026-10-01');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /“Desde” no puede ser posterior a “Hasta”/,
    );
    expect(api.list).toHaveBeenCalledTimes(calls);
  });

  it('sin resultados lo dice, y "Limpiar filtros" vuelve a la lista completa', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValueOnce(page([DEACTIVATE]));
    renderAudit();
    await rowsLoaded(1);
    api.list.mockResolvedValue(page([]));

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filtrar por resultado/i }),
      'Rechazadas',
    );
    expect(
      await screen.findByText(/ningún registro coincide/i),
    ).toBeInTheDocument();

    api.list.mockResolvedValue(page([DEACTIVATE]));
    await user.click(screen.getByRole('button', { name: /limpiar filtros/i }));

    expect(
      await within(screen.getByRole('table')).findByText('Desactivar cuenta'),
    ).toBeInTheDocument();
    expect(lastFilters()?.result).toBe('all');
  });

  it('carga la página siguiente con el cursor', async () => {
    const user = userEvent.setup();
    api.list
      .mockResolvedValueOnce(page([DEACTIVATE], 'a1'))
      .mockResolvedValueOnce(page([DENIED]));
    renderAudit();

    await user.click(
      await screen.findByRole('button', { name: /ver más registros/i }),
    );

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    expect(api.list.mock.calls.at(-1)?.[1]).toBe('a1');
    expect(
      screen.queryByRole('button', { name: /ver más registros/i }),
    ).not.toBeInTheDocument();
  });

  it('si la API falla, explica el error y deja reintentar', async () => {
    const user = userEvent.setup();
    api.list.mockRejectedValueOnce(new ApiError(500, 'SERVER_ERROR', 'x'));
    renderAudit();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    api.list.mockResolvedValue(page([DEACTIVATE]));
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(
      await within(screen.getByRole('table')).findByText('Desactivar cuenta'),
    ).toBeInTheDocument();
  });

  it('es solo de lectura: no ofrece ninguna acción sobre los registros', async () => {
    renderAudit();
    const table = await rowsLoaded(2);

    expect(within(table).queryAllByRole('button')).toHaveLength(0);
  });
});
