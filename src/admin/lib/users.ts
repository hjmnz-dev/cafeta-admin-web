import type { AdminUserView } from './users-api';

/** Qué acciones ofrece la fila de una cuenta (las mismas reglas que aplica la API). */
export interface UserActions {
  deactivate: boolean;
  reactivate: boolean;
  /** Verificar o rechazar: solo mientras la verificación sigue pendiente. */
  decide: boolean;
}

/**
 * Nadie actúa sobre su propia cuenta ni desactiva a otro administrador, y la
 * verificación institucional es cosa de estudiantes. La API lo vuelve a
 * comprobar; aquí solo se evita ofrecer lo que sería rechazado.
 */
export function userActions(
  user: AdminUserView,
  selfId: string | null,
): UserActions {
  const isSelf = user.id === selfId;
  const isAdmin = user.role === 'ADMIN';
  return {
    deactivate: user.active && !isSelf && !isAdmin,
    reactivate: !user.active && !isSelf,
    decide: user.verificationStatus === 'PENDING' && !isSelf && !isAdmin,
  };
}

export const hasActions = (actions: UserActions) =>
  actions.deactivate || actions.reactivate || actions.decide;

export type UserActionKind = 'deactivate' | 'reactivate';

/** Largo del motivo que acepta la API. */
export const REASON_MIN = 3;
export const REASON_MAX = 500;

export const isValidReason = (reason: string) => {
  const length = reason.trim().length;
  return length >= REASON_MIN && length <= REASON_MAX;
};
