import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogScreen } from './AuditLogScreen';
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
