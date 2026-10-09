import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminReportsScreen } from './AdminReportsScreen';
import { renderWithProviders } from '../../test/utils';

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
});
