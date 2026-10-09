import type { AuditEntry } from './audit-api';

/** Texto en español de cada acción del catálogo de la API; el resto sale tal cual. */
const ACTION_LABELS: Readonly<Record<string, string>> = {
  'account.register': 'Registrar cuenta',
  'account.deactivate': 'Desactivar cuenta',
  'account.reactivate': 'Reactivar cuenta',
  'account.verify': 'Verificar cuenta',
  'account.reject_verification': 'Rechazar verificación',
  'profile.update': 'Editar perfil',
  'privacy.update': 'Cambiar privacidad',
  'report.generate': 'Generar reporte administrativo',
  'post.create': 'Crear publicación',
  'post.update': 'Editar publicación',
  'post.archive': 'Archivar publicación',
  'post.restore': 'Restaurar publicación',
  'post.deactivate': 'Desactivar publicación',
  'post.reactivate': 'Reactivar publicación',
  'post.delete': 'Borrar publicación',
  'story.create': 'Crear historia',
  'story.update': 'Editar historia',
  'story.deactivate': 'Desactivar historia',
  'post_comment.create': 'Comentar publicación',
  'post_comment.update': 'Editar comentario de publicación',
  'post_comment.deactivate': 'Desactivar comentario de publicación',
  'story_comment.create': 'Comentar historia',
  'story_comment.update': 'Editar comentario de historia',
  'story_comment.deactivate': 'Desactivar comentario de historia',
  'message.update': 'Editar mensaje',
  'message.deactivate': 'Desactivar mensaje',
  'announcement.create': 'Publicar anuncio',
  'follow.create': 'Seguir',
  'follow.accept': 'Aceptar solicitud de seguimiento',
  'follow.reject': 'Rechazar solicitud de seguimiento',
  'follow.deactivate': 'Dejar de seguir',
  'block.create': 'Bloquear usuario',
  'block.deactivate': 'Desbloquear usuario',
  'report.create': 'Reportar contenido',
  'report.sanction': 'Sancionar por reporte',
  'report.dismiss': 'Desestimar reporte',
  'access.denied': 'Acceso denegado',
  'career.deactivate': 'Desactivar carrera',
  'career.reactivate': 'Reactivar carrera',
  'monitoring.test': 'Prueba de monitoreo',
};

const ENTITY_LABELS: Readonly<Record<string, string>> = {
  user: 'Usuario',
  profile: 'Perfil',
  career: 'Carrera',
  post: 'Publicación',
  post_comment: 'Comentario de publicación',
  story: 'Historia',
  story_comment: 'Comentario de historia',
  message: 'Mensaje',
  follow: 'Seguimiento',
  block: 'Bloqueo',
  report: 'Reporte',
  route: 'Ruta',
  monitoring: 'Monitoreo',
};

export const actionLabel = (action: string) => ACTION_LABELS[action] ?? action;

/** Objetivo de la acción: el tipo y el comienzo de su id. */
export function targetLabel(
  entry: Pick<AuditEntry, 'entityType' | 'entityId'>,
) {
  const type = ENTITY_LABELS[entry.entityType] ?? entry.entityType;
  return entry.entityId ? `${type} · ${entry.entityId.slice(0, 8)}` : type;
}

export const roleLabel = (role: string | null) =>
  role === 'ADMIN' ? 'Administrador' : role === 'STUDENT' ? 'Estudiante' : '';

const DETAIL_MAX = 160;

/**
 * Resumen en una línea de los datos extra de la acción. La forma de `metadata`
 * depende de la acción, así que solo se muestran sus valores simples.
 */
export function describeMetadata(metadata: AuditEntry['metadata']): string {
  if (!metadata) return '';
  const text = Object.entries(metadata)
    .filter(([, value]) =>
      ['string', 'number', 'boolean'].includes(typeof value),
    )
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
  return text.length > DETAIL_MAX ? `${text.slice(0, DETAIL_MAX - 1)}…` : text;
}

/** Rango incoherente: se avisa antes de pedirlo a la API. */
export const isReversedRange = (from: string, to: string) =>
  from !== '' && to !== '' && from > to;
