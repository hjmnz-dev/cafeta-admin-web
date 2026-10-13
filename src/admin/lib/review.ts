import type { ResolveAction, ReviewReport } from './review-api';

/** Motivos de la API en palabras del usuario. */
export const REASON_LABEL: Record<ReviewReport['reason'], string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Acoso',
  INAPPROPRIATE: 'Contenido inapropiado',
  IMPERSONATION: 'Suplantación',
  OTHER: 'Otro',
};

export const STATUS_LABEL: Record<ReviewReport['status'], string> = {
  PENDING: 'Pendiente',
  SANCTIONED: 'Sancionado',
  DISMISSED: 'Desestimado',
};

const POST_STATE_LABEL: Record<
  NonNullable<ReviewReport['target']['postState']>,
  string
> = {
  ACTIVE: 'publicada',
  ARCHIVED: 'archivada por su autor',
  DEACTIVATED: 'desactivada',
  DELETED: 'borrada por su autor',
};

/** Nombre del objetivo para el encabezado y los avisos. */
export function targetTitle(report: ReviewReport): string {
  const { target } = report;
  if (report.targetType === 'USER') {
    return target.displayName ?? 'Cuenta que ya no existe';
  }
  return target.displayName
    ? `Publicación de ${target.displayName}`
    : 'Publicación borrada';
}

/** Texto a mostrar de la publicación: el actual y, si cambió, la copia del reporte. */
export function postTexts(target: ReviewReport['target']): {
  current: string | null;
  snapshot: string | null;
} {
  const snapshot = target.snapshot;
  const current = target.currentContent;
  return {
    current,
    snapshot: snapshot && snapshot !== current ? snapshot : null,
  };
}

export function stateNote(report: ReviewReport): string | null {
  const { target } = report;
  if (report.targetType === 'USER') {
    return target.active === false ? 'cuenta inactiva' : null;
  }
  return target.postState && target.postState !== 'ACTIVE'
    ? POST_STATE_LABEL[target.postState]
    : null;
}

/** Texto del botón de sancionar según el objetivo. */
export const sanctionLabel = (report: ReviewReport) =>
  report.targetType === 'USER'
    ? 'Desactivar usuario'
    : 'Desactivar publicación';

/**
 * Desde el reporte de una publicación también se puede desactivar la cuenta de
 * su autor (bug 1023); hace falta saber quién es, así que no en una borrada.
 */
export const canDeactivateAuthor = (report: ReviewReport) =>
  report.targetType === 'POST' && Boolean(report.target.displayName);

/** Título de cada acción: el del botón, el del diálogo y el de confirmar. */
export function actionTitle(
  report: ReviewReport,
  action: ResolveAction,
): string {
  if (action === 'DISMISS') return 'Desestimar reporte';
  if (action === 'DEACTIVATE_AUTHOR') return 'Desactivar cuenta';
  return sanctionLabel(report);
}

/** Cuántos reportes más se cierran junto con el sancionado, en singular o plural. */
export function closedAlongside(count: number): string {
  if (count === 0) return '';
  return count === 1
    ? ' También se cerró 1 reporte más sobre lo mismo.'
    : ` También se cerraron ${count} reportes más sobre lo mismo.`;
}

/** Advertencia del diálogo de sanción sobre los pendientes que se cerrarán. */
export function siblingsWarning(count: number): string {
  return count === 1
    ? 'Hay 1 reporte pendiente más sobre lo mismo: se cerrará también como sancionado.'
    : `Hay ${count} reportes pendientes más sobre lo mismo: se cerrarán también como sancionados.`;
}

/** Aviso de éxito tras resolver. */
export function resolvedNotice(
  report: ReviewReport,
  action: ResolveAction,
): string {
  const title = targetTitle(report);
  if (action === 'DISMISS') {
    return `Reporte contra ${title} desestimado: se cerró sin aplicar restricciones.`;
  }
  const what =
    action === 'DEACTIVATE_AUTHOR'
      ? `la cuenta de ${report.target.displayName ?? 'su autor'} quedó desactivada`
      : report.targetType === 'USER'
        ? `la cuenta de ${title} quedó desactivada`
        : 'la publicación quedó desactivada';
  const extra = closedAlongside(report.otherPending);
  return `Reporte resuelto con sanción: ${what}.${extra}`;
}
