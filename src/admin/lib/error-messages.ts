/**
 * Mensajes para el usuario por código de error de la API.
 *
 * La consola nunca muestra el `message` crudo de la API: traduce el `code`
 * estable a un texto en español.
 */
const MESSAGES: Readonly<Record<string, string>> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  ACCOUNT_INACTIVE: 'Esta cuenta no está activa.',
  FORBIDDEN: 'No tienes acceso a la consola.',
  SESSION_REVOKED: 'Tu sesión terminó. Inicia sesión de nuevo.',
  UNAUTHORIZED: 'Tu sesión terminó. Inicia sesión de nuevo.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Espera un minuto.',
  VALIDATION_ERROR: 'Revisa los datos del formulario.',
  INVALID_DATE_RANGE:
    'Revisa las fechas: la inicial no puede ser posterior a la final.',
  RANGE_TOO_LARGE: 'El rango no puede pasar de 92 días.',
  NETWORK_ERROR: 'No hay conexión con la API. Intenta de nuevo.',
  USER_NOT_FOUND: 'Esa cuenta ya no existe.',
  INVALID_CURSOR: 'La lista cambió. Vuelve a cargarla.',
  REPORT_NOT_FOUND: 'Ese reporte ya no existe.',
  REPORT_ALREADY_RESOLVED: 'Otro administrador ya resolvió este reporte.',
  NOTE_REQUIRED: 'Escribe la nota de la sanción (al menos 3 caracteres).',
  ALREADY_INACTIVE: 'La cuenta ya estaba desactivada.',
  ALREADY_ACTIVE: 'La cuenta ya estaba activa.',
  VERIFICATION_ALREADY_DECIDED:
    'Esta cuenta ya tiene una decisión de verificación.',
  POST_CONTENT_REQUIRED: 'Escribe el texto del anuncio.',
  UNSUPPORTED_MEDIA_TYPE:
    'Ese formato no se puede subir. Usa imágenes JPG, PNG, WebP o GIF, video MP4 o WebM, o un PDF.',
  FILE_TOO_LARGE:
    'El archivo es muy grande. Imágenes hasta 5 MB, video hasta 25 MB y PDF hasta 10 MB.',
  MEDIA_NOT_FOUND: 'Uno de los archivos ya no está. Quítalo y súbelo de nuevo.',
  MEDIA_COMBINATION_INVALID: 'Adjunta hasta 4 imágenes, o 1 video, o 1 PDF.',
  CANNOT_ACT_ON_SELF: 'No puedes actuar sobre tu propia cuenta.',
  CANNOT_SANCTION_ADMIN: 'No se puede desactivar a otro administrador.',
  NOT_A_POST_REPORT:
    'Solo el reporte de una publicación permite desactivar la cuenta del autor.',
};

export const GENERIC_ERROR_MESSAGE = 'Algo salió mal. Intenta de nuevo.';

export function messageForCode(code: string): string {
  return MESSAGES[code] ?? GENERIC_ERROR_MESSAGE;
}
