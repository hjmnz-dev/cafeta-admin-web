import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { usersApi, type AdminUserView } from '../lib/users-api';
import { UsersScreen } from './UsersScreen';

vi.mock('../lib/users-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/users-api')>()),
  usersApi: {
    list: vi.fn(),
    deactivate: vi.fn(),
    reactivate: vi.fn(),
    decideVerification: vi.fn(),
  },
}));

vi.mock('../store/SessionStore', () => ({
  useSession: () => ({ user: { id: 'admin-1' } }),
}));

const api = vi.mocked(usersApi);

const user = (patch: Partial<AdminUserView>): AdminUserView => ({
  id: 'u1',
  email: 'maria@est.intec.edu.do',
  handle: 'maria',
  displayName: 'María Rodríguez',
  career: 'Ing. Software',
  role: 'STUDENT',
  active: true,
  deactivatedAt: null,
  verificationStatus: 'VERIFIED',
  createdAt: '2026-09-01T12:00:00.000Z',
  ...patch,
});

const MARIA = user({});
const JUAN = user({
  id: 'u2',
  displayName: 'Juan Pérez',
  handle: 'jperez',
  email: 'jperez@est.intec.edu.do',
  verificationStatus: 'PENDING',
});
const ANA = user({
  id: 'u3',
  displayName: 'Ana Martínez',
  handle: 'amartinez',
  email: 'amartinez@est.intec.edu.do',
  active: false,
  deactivatedAt: '2026-09-20T12:00:00.000Z',
});
const ADMIN = user({
  id: 'admin-1',
  displayName: 'Hamsell Jiménez',
  handle: 'hamsell',
  role: 'ADMIN',
});
const OTHER_ADMIN = user({
  id: 'admin-2',
  displayName: 'Otra Admin',
  handle: 'otra',
  role: 'ADMIN',
});

const page = (items: AdminUserView[], nextCursor: string | null = null) => ({
  items,
  nextCursor,
});

function renderUsers() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <UsersScreen />
    </QueryClientProvider>,
  );
}

const lastFilters = () => api.list.mock.calls.at(-1)?.[0];

describe('HU47 — Ver listado de usuarios', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue(page([MARIA, JUAN, ANA]));
  });

  it('HU47 E1: lista las cuentas reales con su estado y datos básicos', async () => {
    renderUsers();

    expect(await screen.findByText('María Rodríguez')).toBeInTheDocument();
    expect(screen.getByText(/amartinez@est.intec.edu.do/)).toBeInTheDocument();
    expect(screen.getAllByText('Activa').length).toBe(2);
    expect(screen.getByText('Inactiva')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('HU47 E2: la búsqueda pide a la API el texto escrito', async () => {
    const userEvt = userEvent.setup();
    renderUsers();
    await screen.findByText('María Rodríguez');

    api.list.mockResolvedValue(page([JUAN]));
    await userEvt.type(
      screen.getByRole('searchbox', { name: /buscar por nombre/i }),
      'jperez',
    );

    await waitFor(() => expect(lastFilters()?.search).toBe('jperez'));
    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('María Rodríguez')).not.toBeInTheDocument(),
    );
  });

  it('avisa cuando ninguna cuenta coincide', async () => {
    api.list.mockResolvedValue(page([]));
    renderUsers();

    expect(
      await screen.findByText(/ninguna cuenta coincide/i),
    ).toBeInTheDocument();
  });

  it('cada filtro rápido pide a la API su estado o verificación', async () => {
    const userEvt = userEvent.setup();
    renderUsers();
    await screen.findByText('María Rodríguez');

    await userEvt.click(screen.getByRole('button', { name: 'Inactivas' }));
    await waitFor(() => expect(lastFilters()?.status).toBe('inactive'));

    await userEvt.click(
      screen.getByRole('button', { name: 'Verificación pendiente' }),
    );
    await waitFor(() => expect(lastFilters()?.verification).toBe('PENDING'));
    expect(lastFilters()?.status).toBe('all');
  });

  it('con más páginas ofrece "Ver más cuentas" y pide la siguiente con su cursor', async () => {
    const userEvt = userEvent.setup();
    api.list
      .mockResolvedValueOnce(page([MARIA], 'u1'))
      .mockResolvedValueOnce(page([JUAN]));
    renderUsers();
    await screen.findByText('María Rodríguez');

    await userEvt.click(
      screen.getByRole('button', { name: /ver más cuentas/i }),
    );

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
    expect(api.list.mock.calls.at(-1)?.[1]).toBe('u1');
    expect(
      screen.queryByRole('button', { name: /ver más cuentas/i }),
    ).not.toBeInTheDocument();
  });

  it('un error de la API se traduce y se puede reintentar', async () => {
    const userEvt = userEvent.setup();
    api.list.mockRejectedValueOnce(
      new ApiError(500, 'X', 'Algo salió mal. Intenta de nuevo.'),
    );
    renderUsers();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algo salió mal. Intenta de nuevo.',
    );

    await userEvt.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('María Rodríguez')).toBeInTheDocument();
  });
});

describe('HU48/HU49 — Desactivar y reactivar cuentas', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue(page([MARIA, JUAN, ANA]));
    api.deactivate.mockResolvedValue(undefined);
    api.reactivate.mockResolvedValue(undefined);
  });

  it('HU48 E1: desactivar pide el motivo, lo envía y vuelve a pedir la lista', async () => {
    const userEvt = userEvent.setup();
    renderUsers();
    await screen.findByText('María Rodríguez');

    await userEvt.click(
      screen.getByRole('button', { name: /desactivar cuenta de juan pérez/i }),
    );
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', {
      name: /desactivar cuenta/i,
    });
    expect(confirm).toBeDisabled();
    await userEvt.type(within(dialog).getByLabelText('Motivo'), 'Acoso');
    await userEvt.click(confirm);

    await waitFor(() =>
      expect(api.deactivate).toHaveBeenCalledWith('u2', 'Acoso'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      /cuenta de juan pérez desactivada/i,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(1));
  });

  it('un motivo de menos de 3 caracteres no se puede enviar', async () => {
    const userEvt = userEvent.setup();
    renderUsers();
    await screen.findByText('María Rodríguez');

    await userEvt.click(
      screen.getByRole('button', { name: /desactivar cuenta de juan pérez/i }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvt.type(within(dialog).getByLabelText('Motivo'), 'ab');

    expect(
      within(dialog).getByRole('button', { name: /desactivar cuenta/i }),
    ).toBeDisabled();
  });

  it('cancelar no llama a la API', async () => {
    const userEvt = userEvent.setup();
    renderUsers();
    await screen.findByText('María Rodríguez');

    await userEvt.click(
      screen.getByRole('button', { name: /desactivar cuenta de juan pérez/i }),
    );
    await userEvt.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.deactivate).not.toHaveBeenCalled();
  });

  it('HU49 E1: reactivar envía el motivo y avisa', async () => {
    const userEvt = userEvent.setup();
    renderUsers();
    await screen.findByText('Ana Martínez');

    await userEvt.click(
      screen.getByRole('button', { name: /reactivar cuenta de ana martínez/i }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvt.type(within(dialog).getByLabelText('Motivo'), 'Fue un error');
    await userEvt.click(
      within(dialog).getByRole('button', { name: /reactivar cuenta/i }),
    );

    await waitFor(() =>
      expect(api.reactivate).toHaveBeenCalledWith('u3', 'Fue un error'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      /cuenta de ana martínez reactivada/i,
    );
  });

  it('HU49 E2: no ofrece reactivar una cuenta que ya está activa', async () => {
    renderUsers();
    await screen.findByText('María Rodríguez');

    expect(
      screen.queryByRole('button', {
        name: /reactivar cuenta de maría rodríguez/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('si la API dice que ya estaba en ese estado, lo explica y la fila se corrige', async () => {
    const userEvt = userEvent.setup();
    api.deactivate.mockRejectedValue(
      new ApiError(409, 'ALREADY_INACTIVE', 'La cuenta ya estaba desactivada.'),
    );
    renderUsers();
    await screen.findByText('María Rodríguez');

    await userEvt.click(
      screen.getByRole('button', { name: /desactivar cuenta de juan pérez/i }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvt.type(within(dialog).getByLabelText('Motivo'), 'Spam');
    await userEvt.click(
      within(dialog).getByRole('button', { name: /desactivar cuenta/i }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'La cuenta ya estaba desactivada.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(1));
  });

  it('no ofrece acciones sobre la propia cuenta ni desactivar a otro admin', async () => {
    api.list.mockResolvedValue(page([ADMIN, OTHER_ADMIN]));
    renderUsers();
    await screen.findByText('Hamsell Jiménez');

    expect(
      screen.queryByRole('button', { name: /desactivar cuenta de/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /verificar cuenta de/i }),
    ).not.toBeInTheDocument();
  });
});

describe('HU50 — Verificar cuenta institucional', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue(page([MARIA, JUAN, ANA]));
    api.decideVerification.mockResolvedValue(undefined);
  });

  it('HU50 E1: verificar envía VERIFIED y avisa', async () => {
    const userEvt = userEvent.setup();
    renderUsers();
    await screen.findByText('Juan Pérez');

    await userEvt.click(
      screen.getByRole('button', { name: /verificar cuenta de juan pérez/i }),
    );

    await waitFor(() =>
      expect(api.decideVerification).toHaveBeenCalledWith('u2', 'VERIFIED'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      /verificada como institucional/i,
    );
  });

  it('HU50 E2: rechazar envía REJECTED y avisa', async () => {
    const userEvt = userEvent.setup();
    renderUsers();
    await screen.findByText('Juan Pérez');

    await userEvt.click(
      screen.getByRole('button', {
        name: /rechazar verificación de juan pérez/i,
      }),
    );

    await waitFor(() =>
      expect(api.decideVerification).toHaveBeenCalledWith('u2', 'REJECTED'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/rechazada/i);
  });

  it('solo las cuentas pendientes ofrecen verificar o rechazar', async () => {
    renderUsers();
    await screen.findByText('María Rodríguez');

    expect(
      screen.queryByRole('button', {
        name: /verificar cuenta de maría rodríguez/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /verificar cuenta de juan pérez/i }),
    ).toBeInTheDocument();
  });

  it('si la cuenta ya tenía decisión, lo explica con el mensaje traducido', async () => {
    const userEvt = userEvent.setup();
    api.decideVerification.mockRejectedValue(
      new ApiError(
        409,
        'VERIFICATION_ALREADY_DECIDED',
        'Esta cuenta ya tiene una decisión de verificación.',
      ),
    );
    renderUsers();
    await screen.findByText('Juan Pérez');

    await userEvt.click(
      screen.getByRole('button', { name: /verificar cuenta de juan pérez/i }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Esta cuenta ya tiene una decisión de verificación.',
    );
  });
});
