import { describe, expect, it } from 'vitest';
import {
  actionLabel,
  describeMetadata,
  isReversedRange,
  roleLabel,
  targetLabel,
} from './audit';
import { auditQuery, NO_AUDIT_FILTERS } from './audit-api';

describe('auditQuery', () => {
  it('sin filtros solo pide el tamaño de página', () => {
    expect(auditQuery(NO_AUDIT_FILTERS)).toBe('limit=20');
  });

  it('envía solo los filtros que tienen valor', () => {
    const query = new URLSearchParams(
      auditQuery({
        actor: '  ana ',
        action: 'post.create',
        result: 'rejected',
        from: '2026-10-01',
        to: '',
      }),
    );
    expect(Object.fromEntries(query)).toEqual({
      limit: '20',
      actor: 'ana',
      action: 'post.create',
      succeeded: 'false',
      from: '2026-10-01',
    });
  });

  it('traduce el resultado ejecutadas a succeeded=true y agrega el cursor', () => {
    const query = new URLSearchParams(
      auditQuery({ ...NO_AUDIT_FILTERS, result: 'succeeded' }, 'abc'),
    );
    expect(query.get('succeeded')).toBe('true');
    expect(query.get('cursor')).toBe('abc');
  });
});

describe('etiquetas', () => {
  it('traduce las acciones conocidas y deja pasar las nuevas', () => {
    expect(actionLabel('post.create')).toBe('Crear publicación');
    expect(actionLabel('algo.nuevo')).toBe('algo.nuevo');
  });

  it('el objetivo lleva el tipo y el comienzo del id', () => {
    expect(
      targetLabel({
        entityType: 'post',
        entityId: '0198f2a1-aaaa-7000-8000-000000000001',
      }),
    ).toBe('Publicación · 0198f2a1');
    expect(targetLabel({ entityType: 'route', entityId: null })).toBe('Ruta');
  });

  it('nombra los roles', () => {
    expect(roleLabel('ADMIN')).toBe('Administrador');
    expect(roleLabel('STUDENT')).toBe('Estudiante');
    expect(roleLabel(null)).toBe('');
  });
});

describe('describeMetadata', () => {
  it('sin datos extra no muestra nada', () => {
    expect(describeMetadata(null)).toBe('');
  });

  it('muestra los valores simples y omite objetos y listas', () => {
    expect(
      describeMetadata({ by: 'admin', count: 2, ok: true, deep: { a: 1 } }),
    ).toBe('by: admin · count: 2 · ok: true');
  });

  it('recorta un detalle muy largo', () => {
    const text = describeMetadata({ reason: 'x'.repeat(400) });
    expect(text).toHaveLength(160);
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('isReversedRange', () => {
  it('solo es incoherente cuando los dos extremos existen y están al revés', () => {
    expect(isReversedRange('2026-10-05', '2026-10-01')).toBe(true);
    expect(isReversedRange('2026-10-01', '2026-10-05')).toBe(false);
    expect(isReversedRange('2026-10-01', '2026-10-01')).toBe(false);
    expect(isReversedRange('', '2026-10-01')).toBe(false);
    expect(isReversedRange('2026-10-05', '')).toBe(false);
  });
});
