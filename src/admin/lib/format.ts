/** Formatos de fecha comunes a toda la consola. */

const DATE = new Intl.DateTimeFormat('es-DO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const DATE_TIME = new Intl.DateTimeFormat('es-DO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (ms: number) => DATE.format(new Date(ms));
export const formatDateTime = (ms: number) => DATE_TIME.format(new Date(ms));

/** Valor para un <input type="date"> (YYYY-MM-DD) en hora local. */
export function toDateInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Inicio del día de un valor YYYY-MM-DD, en hora local. */
export function startOfDay(value: string): number {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/** Fin del día de un valor YYYY-MM-DD, para que el rango incluya ese día completo. */
export function endOfDay(value: string): number {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}
