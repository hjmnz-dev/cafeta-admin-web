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
  ALREADY_INACTIVE: 'La cuenta ya estaba desactivada.',
  ALREADY_ACTIVE: 'La cuenta ya estaba activa.',
  VERIFICATION_ALREADY_DECIDED:
    'Esta cuenta ya tiene una decisión de verificación.',
  CANNOT_ACT_ON_SELF: 'No puedes actuar sobre tu propia cuenta.',
  CANNOT_SANCTION_ADMIN: 'No se puede desactivar a otro administrador.',
};

export const GENERIC_ERROR_MESSAGE = 'Algo salió mal. Intenta de nuevo.';

export function messageForCode(code: string): string {
  return MESSAGES[code] ?? GENERIC_ERROR_MESSAGE;
}
