/** Largo máximo de un informe, igual que en la API (spec 0008, decisión 35). */
export const MAX_RANGE_DAYS = 92;

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * Avisa antes de llamar a la API si el rango no sirve. La API vuelve a validar:
 * esto solo ahorra el viaje y da el mensaje al instante.
 */
export function rangeProblem(from: string, to: string): string | null {
  if (!from || !to) return 'Elige la fecha inicial y la final.';
  const days = (utcDay(to) - utcDay(from)) / DAY_MS + 1;
  if (days < 1) return 'La fecha inicial no puede ser posterior a la final.';
  if (days > MAX_RANGE_DAYS) {
    return `El rango no puede pasar de ${MAX_RANGE_DAYS} días.`;
  }
  return null;
}
