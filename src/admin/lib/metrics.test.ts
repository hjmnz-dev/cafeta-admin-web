import { describe, it, expect } from 'vitest';
import { buildReport, toCsv } from './metrics';
import type { AdminReport, AdminUser, AuditEntry } from '../store/AdminState';

const DAY = 24 * 60 * 60 * 1000;
/** Mediodía, para que sumar y restar días no cruce fronteras por el horario. */
const NOW = new Date(2026, 8, 2, 12, 0, 0).getTime();

const user = (patch: Partial<AdminUser>): AdminUser => ({
  id: 'u1',
  name: 'María Rodríguez',
  email: 'mrodriguez@est.intec.edu.do',
  career: 'Medicina',
  joinedAt: NOW - 2 * DAY,
  status: 'active',
  verification: 'verified',
  posts: 5,
  followers: 10,
  ...patch,
});

const report = (patch: Partial<AdminReport>): AdminReport => ({
  id: 'r1',
  targetType: 'post',
  targetId: 'p1',
  reason: 'Spam o publicidad',
  reportedBy: 'Juan Pérez',
  createdAt: NOW - DAY,
  status: 'pending',
  ...patch,
});

const entry = (patch: Partial<AuditEntry>): AuditEntry => ({
  id: 'a1',
  at: NOW - DAY,
  actor: 'Hamsell Jiménez',
  actorRole: 'admin',
  action: 'account.deactivate',
  target: 'Ana Martínez',
  detail: 'Cuenta desactivada.',
  succeeded: true,
  ...patch,
});

describe('HU44 — Informes administrativos', () => {
  const source = {
    users: [
      user({ id: 'a', joinedAt: NOW - 2 * DAY }),
      user({ id: 'b', name: 'Juan Pérez', joinedAt: NOW - 40 * DAY }),
    ],
    reports: [report({ id: 'r1', createdAt: NOW - DAY })],
    audit: [
      entry({ id: 'a1', at: NOW - DAY }),
      entry({ id: 'a2', at: NOW - 40 * DAY }),
    ],
  };
  const range = { from: NOW - 7 * DAY, to: NOW };

  it('Escenario 1 — el informe de altas trae solo las cuentas del rango', () => {
    const result = buildReport(source, { kind: 'signups', ...range });

    expect(result.title).toBe('Altas de cuentas');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][0]).toBe('María Rodríguez');
  });

  it('Escenario 1 — el informe de acciones administrativas sale de la bitácora', () => {
    const result = buildReport(source, { kind: 'moderation', ...range });

    expect(result.columns).toContain('Responsable');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toContain('Desactivar cuenta');
  });

  it('Escenario 2 — un rango sin actividad devuelve un informe vacío, no un error', () => {
    const result = buildReport(source, {
      kind: 'reports',
      from: NOW - 90 * DAY,
      to: NOW - 60 * DAY,
    });

    expect(result.rows).toEqual([]);
    expect(result.columns.length).toBeGreaterThan(0);
  });

  it('el CSV lleva encabezados y escapa las comillas del contenido', () => {
    const result = buildReport(
      {
        ...source,
        users: [user({ id: 'a', name: 'María "La Doc" Rodríguez' })],
      },
      { kind: 'signups', ...range },
    );

    const csv = toCsv(result);
    expect(csv.split('\r\n')[0]).toBe(
      '"Cuenta","Correo","Carrera","Alta","Estado","Verificación"',
    );
    expect(csv).toContain('"María ""La Doc"" Rodríguez"');
  });
});
