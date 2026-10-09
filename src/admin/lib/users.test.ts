import { describe, expect, it } from 'vitest';
import { hasActions, isValidReason, userActions } from './users';
import { NO_FILTERS, usersQuery, type AdminUserView } from './users-api';

const user = (patch: Partial<AdminUserView>): AdminUserView => ({
  id: 'u1',
  email: 'a@est.intec.edu.do',
  handle: 'a',
  displayName: 'A',
  career: null,
  role: 'STUDENT',
  active: true,
  deactivatedAt: null,
  verificationStatus: 'VERIFIED',
  createdAt: '2026-09-01T12:00:00.000Z',
  ...patch,
});

describe('userActions', () => {
  it('una cuenta activa y verificada solo se puede desactivar', () => {
    expect(userActions(user({}), 'admin')).toEqual({
      deactivate: true,
      reactivate: false,
      decide: false,
    });
  });

  it('una inactiva solo se puede reactivar', () => {
    expect(userActions(user({ active: false }), 'admin')).toMatchObject({
      deactivate: false,
      reactivate: true,
    });
  });

  it('verificar o rechazar solo mientras está pendiente', () => {
    expect(
      userActions(user({ verificationStatus: 'PENDING' }), 'admin').decide,
    ).toBe(true);
    expect(
      userActions(user({ verificationStatus: 'REJECTED' }), 'admin').decide,
    ).toBe(false);
  });

  it('sobre uno mismo no ofrece nada', () => {
    const actions = userActions(
      user({ id: 'admin', role: 'ADMIN', verificationStatus: 'PENDING' }),
      'admin',
    );
    expect(hasActions(actions)).toBe(false);
  });

  it('a otro admin no se le desactiva ni se le verifica', () => {
    const actions = userActions(
      user({ id: 'otro', role: 'ADMIN', verificationStatus: 'PENDING' }),
      'admin',
    );
    expect(actions).toEqual({
      deactivate: false,
      reactivate: false,
      decide: false,
    });
  });
});

describe('isValidReason', () => {
  it('acepta de 3 a 500 caracteres sin contar los espacios de los bordes', () => {
    expect(isValidReason('ab')).toBe(false);
    expect(isValidReason('  ab  ')).toBe(false);
    expect(isValidReason('abc')).toBe(true);
    expect(isValidReason('x'.repeat(500))).toBe(true);
    expect(isValidReason('x'.repeat(501))).toBe(false);
  });
});

describe('usersQuery', () => {
  it('sin filtros solo pide el tamaño de página', () => {
    expect(usersQuery(NO_FILTERS)).toBe('limit=20');
  });

  it('incluye solo los filtros puestos y recorta la búsqueda', () => {
    expect(
      usersQuery(
        { search: '  ana ', status: 'inactive', verification: 'PENDING' },
        'c1',
      ),
    ).toBe(
      'limit=20&search=ana&status=inactive&verification=PENDING&cursor=c1',
    );
  });
});
