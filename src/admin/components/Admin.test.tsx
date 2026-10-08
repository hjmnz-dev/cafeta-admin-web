import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogScreen } from './AuditLogScreen';
import { AdminReportsScreen } from './AdminReportsScreen';
import { renderWithProviders } from '../../test/utils';

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
