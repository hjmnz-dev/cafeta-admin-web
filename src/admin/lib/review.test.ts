import { describe, expect, it } from 'vitest';
import {
  closedAlongside,
  postTexts,
  resolvedNotice,
  sanctionLabel,
  siblingsWarning,
  stateNote,
  targetTitle,
} from './review';
import { PENDING_QUEUE, reviewQuery, type ReviewReport } from './review-api';

const base = {
  id: 'r1',
  reason: 'SPAM',
  details: null,
  status: 'PENDING',
  reporter: { id: 'a', handle: 'ana', displayName: 'Ana' },
  otherPending: 0,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNote: null,
  createdAt: '2026-10-01T12:00:00.000Z',
} as const;

const EMPTY = {
  userId: null,
  postId: null,
  handle: null,
  displayName: null,
  active: null,
  snapshot: null,
  currentContent: null,
  postState: null,
};

const user = (patch: Partial<ReviewReport['target']> = {}): ReviewReport => ({
  ...base,
  targetType: 'USER',
  target: {
    ...EMPTY,
    userId: 'u',
    handle: 'rob',
    displayName: 'Roberto',
    active: true,
    ...patch,
  },
});

const post = (patch: Partial<ReviewReport['target']> = {}): ReviewReport => ({
  ...base,
  targetType: 'POST',
  target: {
    ...EMPTY,
    postId: 'p',
    handle: 'laura',
    displayName: 'Laura',
    active: true,
    postState: 'ACTIVE',
    ...patch,
  },
});

describe('targetTitle y sanctionLabel', () => {
  it('nombra la cuenta o la publicación de quien la escribió', () => {
    expect(targetTitle(user())).toBe('Roberto');
    expect(targetTitle(post())).toBe('Publicación de Laura');
  });

  it('una publicación borrada o una cuenta inexistente se nombra como tal', () => {
    expect(targetTitle(post({ displayName: null, handle: null }))).toBe(
      'Publicación borrada',
    );
    expect(targetTitle(user({ displayName: null }))).toBe(
      'Cuenta que ya no existe',
    );
  });

  it('el botón de sancionar depende del objetivo', () => {
    expect(sanctionLabel(user())).toBe('Desactivar usuario');
    expect(sanctionLabel(post())).toBe('Desactivar publicación');
  });
});

describe('stateNote y postTexts', () => {
  it('avisa cuenta inactiva o el estado de la publicación; nada si está normal', () => {
    expect(stateNote(user({ active: false }))).toBe('cuenta inactiva');
    expect(stateNote(user())).toBeNull();
    expect(stateNote(post({ postState: 'ARCHIVED' }))).toBe(
      'archivada por su autor',
    );
    expect(stateNote(post({ postState: 'DELETED' }))).toBe(
      'borrada por su autor',
    );
    expect(stateNote(post())).toBeNull();
  });

  it('la copia solo se muestra si el texto cambió', () => {
    expect(
      postTexts({ ...EMPTY, snapshot: 'igual', currentContent: 'igual' }),
    ).toEqual({ current: 'igual', snapshot: null });
    expect(
      postTexts({ ...EMPTY, snapshot: 'antes', currentContent: 'ahora' }),
    ).toEqual({ current: 'ahora', snapshot: 'antes' });
  });
});

describe('resolvedNotice', () => {
  it('desestimar y sancionar a una cuenta', () => {
    expect(resolvedNotice(user(), 'DISMISS')).toMatch(/desestimado/);
    expect(resolvedNotice(user(), 'DEACTIVATE_TARGET')).toMatch(
      /la cuenta de Roberto quedó desactivada\.$/,
    );
  });

  it('sancionar suma cuántos reportes más se cerraron', () => {
    expect(
      resolvedNotice({ ...post(), otherPending: 2 }, 'DEACTIVATE_TARGET'),
    ).toMatch(
      /publicación quedó desactivada\. También se cerraron 2 reportes más/,
    );
  });
});

describe('closedAlongside y siblingsWarning', () => {
  it('singular, plural y nada', () => {
    expect(closedAlongside(0)).toBe('');
    expect(closedAlongside(1)).toBe(
      ' También se cerró 1 reporte más sobre lo mismo.',
    );
    expect(closedAlongside(3)).toBe(
      ' También se cerraron 3 reportes más sobre lo mismo.',
    );
    expect(siblingsWarning(1)).toMatch(/Hay 1 reporte pendiente más/);
    expect(siblingsWarning(2)).toMatch(/Hay 2 reportes pendientes más/);
  });
});

describe('reviewQuery', () => {
  it('pide el estado y el tamaño de página', () => {
    expect(reviewQuery(PENDING_QUEUE)).toBe('status=PENDING&limit=20');
  });

  it('suma el tipo y el cursor solo si se dan', () => {
    expect(reviewQuery({ status: 'DISMISSED', targetType: 'POST' }, 'c1')).toBe(
      'status=DISMISSED&limit=20&targetType=POST&cursor=c1',
    );
  });
});
