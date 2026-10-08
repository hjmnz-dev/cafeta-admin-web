import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersScreen } from './UsersScreen';
import { ReportsReviewScreen } from './ReportsReviewScreen';
import { AuditLogScreen } from './AuditLogScreen';
import { AdminReportsScreen } from './AdminReportsScreen';
import { renderWithProviders } from '../../test/utils';

describe('HU47 — Ver listado de usuarios', () => {
  it('Escenario 1 — lista las cuentas con su estado y datos básicos', () => {
    renderWithProviders(<UsersScreen />);

    expect(screen.getByText('María Rodríguez')).toBeInTheDocument();
    expect(screen.getByText('amartinez@est.intec.edu.do')).toBeInTheDocument();
    expect(screen.getAllByText('Activa').length).toBeGreaterThan(0);
    expect(screen.getByText('Inactiva')).toBeInTheDocument();
  });

  it('Escenario 2 — la búsqueda filtra por nombre o correo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersScreen />);

    await user.type(
      screen.getByRole('searchbox', { name: /buscar por nombre o correo/i }),
      'jperez',
    );

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.queryByText('María Rodríguez')).not.toBeInTheDocument();
  });

  it('avisa cuando ninguna cuenta coincide', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersScreen />);

    await user.type(
      screen.getByRole('searchbox', { name: /buscar por nombre o correo/i }),
      'zzzzz',
    );

    expect(screen.getByText(/ninguna cuenta coincide/i)).toBeInTheDocument();
  });
});

describe('HU48/HU49 — Desactivar y reactivar cuentas', () => {
  it('HU48, escenario 1 — desactivar cambia el estado y queda en la bitácora', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <UsersScreen />
        <AuditLogScreen />
      </>,
    );

    await user.click(
      screen.getByRole('button', { name: /desactivar cuenta de juan pérez/i }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /desactivar cuenta/i,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      /cuenta de juan pérez desactivada/i,
    );
    expect(
      screen.getByRole('button', { name: /reactivar cuenta de juan pérez/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/se restringe su acceso y se conserva su registro/i),
    ).toBeInTheDocument();
  });

  it('HU49, escenario 1 — reactivar restaura el acceso', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersScreen />);

    // Ana Martínez arranca inactiva en los datos de demostración.
    await user.click(
      screen.getByRole('button', { name: /reactivar cuenta de ana martínez/i }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /reactivar cuenta/i,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      /cuenta de ana martínez reactivada/i,
    );
    expect(
      screen.getByRole('button', {
        name: /desactivar cuenta de ana martínez/i,
      }),
    ).toBeInTheDocument();
  });

  it('HU49, escenario 2 — no ofrece reactivar una cuenta que ya está activa', () => {
    renderWithProviders(<UsersScreen />);

    expect(
      screen.queryByRole('button', {
        name: /reactivar cuenta de maría rodríguez/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /desactivar cuenta de maría rodríguez/i,
      }),
    ).toBeInTheDocument();
  });
});

describe('HU50 — Verificar cuenta institucional', () => {
  it('Escenario 1 — aprobar la verificación marca la cuenta como verificada', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersScreen />);

    await user.click(
      screen.getByRole('button', {
        name: /verificar cuenta de laura batista/i,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      /verificada como institucional/i,
    );
    expect(
      screen.queryByRole('button', {
        name: /verificar cuenta de laura batista/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('Escenario 2 — rechazar la deja como no verificada', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersScreen />);

    await user.click(
      screen.getByRole('button', {
        name: /rechazar verificación de pedro sánchez/i,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(/rechazada/i);
    expect(
      screen.queryByRole('button', {
        name: /rechazar verificación de pedro sánchez/i,
      }),
    ).not.toBeInTheDocument();
  });
});

describe('HU51/HU52 — Revisar reportes de la comunidad', () => {
  it('HU52, escenario 1 — sancionar desactiva la publicación y cierra el reporte', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ReportsReviewScreen />
        <AuditLogScreen />
      </>,
    );

    await user.click(
      screen.getByRole('button', {
        name: /sancionar reporte contra publicación p7/i,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      /publicación p7 quedó desactivada/i,
    );
    expect(
      screen.getByText(/resuelto con sanción: publicación desactivada/i),
    ).toBeInTheDocument();
  });

  it('HU51, escenario 1 — sancionar un reporte de usuario desactiva su cuenta', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ReportsReviewScreen />
        <UsersScreen />
      </>,
    );

    await user.click(
      screen.getByRole('button', {
        name: /sancionar reporte contra roberto díaz/i,
      }),
    );

    expect(
      screen.getByRole('button', { name: /reactivar cuenta de roberto díaz/i }),
    ).toBeInTheDocument();
  });

  it('Escenario 2 — desestimar cierra el reporte sin tocar la cuenta', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ReportsReviewScreen />
        <UsersScreen />
      </>,
    );

    await user.click(
      screen.getByRole('button', {
        name: /desestimar reporte contra roberto díaz/i,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(/desestimado/i);
    // La cuenta sigue activa: se ofrece desactivarla, no reactivarla.
    expect(
      screen.getByRole('button', {
        name: /desactivar cuenta de roberto díaz/i,
      }),
    ).toBeInTheDocument();
  });

  it('un reporte resuelto sale de la lista de pendientes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsReviewScreen />);

    expect(
      screen.getByRole('tab', { name: /pendientes \(3\)/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /desestimar reporte contra publicación p7/i,
      }),
    );

    expect(
      screen.getByRole('tab', { name: /pendientes \(2\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /resueltos \(3\)/i }),
    ).toBeInTheDocument();
  });
});

describe('HU45/HU46 — Bitácora de auditoría', () => {
  it('HU45, escenario 1 — muestra usuario, acción y fecha de cada registro', () => {
    renderWithProviders(<AuditLogScreen />);

    const tabla = within(screen.getByRole('table'));
    expect(tabla.getAllByText('Hamsell Jiménez').length).toBeGreaterThan(0);
    expect(tabla.getByText('Desactivar cuenta')).toBeInTheDocument();
    expect(tabla.getAllByText('Ana Martínez').length).toBeGreaterThan(0);
  });

  it('HU45, escenario 2 — se puede filtrar por acción', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditLogScreen />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: /filtrar por acción/i }),
      'Desestimar reporte',
    );

    expect(screen.getByText(/reporte desestimado/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/cuenta desactivada tras la revisión/i),
    ).not.toBeInTheDocument();
  });

  it('HU45, escenario 2 — se puede filtrar por responsable u objetivo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditLogScreen />);

    await user.type(
      screen.getByRole('searchbox', {
        name: /buscar por responsable u objetivo/i,
      }),
      'zzzzz',
    );

    expect(screen.getByText(/ningún registro coincide/i)).toBeInTheDocument();
  });

  it('HU46 — cada acción administrativa deja su registro automáticamente', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <UsersScreen />
        <AuditLogScreen />
      </>,
    );

    const antes = screen.getAllByRole('row').length;
    await user.click(
      screen.getByRole('button', {
        name: /verificar cuenta de laura batista/i,
      }),
    );

    expect(screen.getAllByRole('row').length).toBeGreaterThan(antes);
    expect(
      screen.getByText(
        /laura batista verificada como miembro de la universidad/i,
      ),
    ).toBeInTheDocument();
  });
});

describe('HU44 — Generar informes administrativos', () => {
  it('Escenario 1 — genera el informe y lo muestra en pantalla', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminReportsScreen />);

    await user.click(screen.getByRole('button', { name: /generar informe/i }));

    expect(
      screen.getByRole('heading', { name: /altas de cuentas/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('mrodriguez@est.intec.edu.do')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /descargar csv/i }),
    ).toBeEnabled();
  });

  it('Escenario 2 — un rango sin actividad lo dice, y no ofrece descarga', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminReportsScreen />);

    await user.clear(screen.getByLabelText(/^desde$/i));
    await user.type(screen.getByLabelText(/^desde$/i), '2020-01-01');
    await user.clear(screen.getByLabelText(/^hasta$/i));
    await user.type(screen.getByLabelText(/^hasta$/i), '2020-02-01');
    await user.click(screen.getByRole('button', { name: /generar informe/i }));

    expect(
      screen.getByText(/no hay datos disponibles para este rango/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /descargar csv/i }),
    ).toBeDisabled();
  });

  it('generar un informe queda registrado en la bitácora', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <AdminReportsScreen />
        <AuditLogScreen />
      </>,
    );

    await user.click(screen.getByRole('button', { name: /generar informe/i }));

    // La bitácora es la última tabla en pantalla; ahí debe estar la anotación.
    const tablas = screen.getAllByRole('table');
    expect(
      within(tablas[tablas.length - 1]).getByText(
        'Generar reporte administrativo',
      ),
    ).toBeInTheDocument();
  });
});
