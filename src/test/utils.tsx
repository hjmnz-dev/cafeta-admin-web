import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { AdminStateProvider } from '../admin/store/AdminState';

/** Muestra la ruta actual para poder afirmar navegaciones en las pruebas. */
export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/**
 * Renderiza una pantalla dentro de los providers reales (AdminStateProvider +
 * MemoryRouter), en una ruta comodín para que siga montada aunque navegue.
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <AdminStateProvider>
      <MemoryRouter initialEntries={[route]}>
        <LocationProbe />
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </AdminStateProvider>,
  );
}

/**
 * Renderiza varias pantallas bajo un mismo estado — útil para comprobar que una
 * acción administrativa aparece después en la bitácora.
 */
export function renderRoutes(
  routes: { path: string; element: ReactElement }[],
  { route }: { route: string },
) {
  return render(
    <AdminStateProvider>
      <MemoryRouter initialEntries={[route]}>
        <LocationProbe />
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </MemoryRouter>
    </AdminStateProvider>,
  );
}
