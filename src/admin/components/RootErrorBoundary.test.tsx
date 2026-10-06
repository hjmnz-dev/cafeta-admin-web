import { render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router';
import * as monitoring from '../lib/monitoring';
import { RootErrorBoundary, ThrowOnRender } from './RootErrorBoundary';

// Pantalla de error de la ruta raíz (spec 0007, AC-7, AC-9 y AC-11).
const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Outlet />,
        ErrorBoundary: RootErrorBoundary,
        children: [{ path: '__prueba-error', Component: ThrowOnRender }],
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
};

describe('RootErrorBoundary', () => {
  beforeEach(() => {
    // React avisa en consola cada error de dibujo; aquí es lo esperado.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('una ruta que no existe muestra "No encontramos esta página" sin reportar', () => {
    const report = vi.spyOn(monitoring, 'reportError');
    renderAt('/no-existe');
    expect(
      screen.getByRole('heading', { name: 'No encontramos esta página' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByText(/Código del error/)).not.toBeInTheDocument();
    expect(report).not.toHaveBeenCalled();
  });

  it('la ruta oculta muestra "Algo salió mal" y reporta el error', () => {
    const report = vi.spyOn(monitoring, 'reportError');
    renderAt('/__prueba-error');
    expect(
      screen.getByRole('heading', { name: 'Algo salió mal' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Recargar' }),
    ).toBeInTheDocument();
    expect(report).toHaveBeenCalledWith(
      new Error('Prueba de monitoreo forzada desde la ruta oculta'),
    );
    // Sin monitoreo no hay evento, así que no se muestra ningún código.
    expect(screen.queryByText(/Código del error/)).not.toBeInTheDocument();
  });

  it('con monitoreo muestra los primeros 8 caracteres del evento', async () => {
    vi.spyOn(monitoring, 'reportError').mockReturnValue(
      '0123456789abcdef0123456789abcdef',
    );
    renderAt('/__prueba-error');
    expect(
      await screen.findByText('Código del error: 01234567'),
    ).toBeInTheDocument();
  });
});
