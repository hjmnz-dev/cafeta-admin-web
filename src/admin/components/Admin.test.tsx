import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsReviewScreen } from './ReportsReviewScreen';
import { AuditLogScreen } from './AuditLogScreen';
import { renderWithProviders } from '../../test/utils';
import { useAdminState } from '../store/AdminState';

/** Estado simulado de una cuenta: la 33 aún sanciona sobre este estado. */
function AccountStatus({ name }: { name: string }) {
  const { users } = useAdminState();
  return (
    <p data-testid="account-status">
      {users.find((u) => u.name === name)?.status}
    </p>
  );
}

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
        <AccountStatus name="Roberto Díaz" />
      </>,
    );

    await user.click(
      screen.getByRole('button', {
        name: /sancionar reporte contra roberto díaz/i,
      }),
    );

    expect(screen.getByTestId('account-status')).toHaveTextContent('inactive');
  });

  it('Escenario 2 — desestimar cierra el reporte sin tocar la cuenta', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ReportsReviewScreen />
        <AccountStatus name="Roberto Díaz" />
      </>,
    );

    await user.click(
      screen.getByRole('button', {
        name: /desestimar reporte contra roberto díaz/i,
      }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(/desestimado/i);
    // La cuenta sigue activa.
    expect(screen.getByTestId('account-status')).toHaveTextContent('active');
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
});
