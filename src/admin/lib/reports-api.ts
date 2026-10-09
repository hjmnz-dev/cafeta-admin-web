import type { components } from './api-types';
import { apiRequest } from './http';

export type ReportTable = components['schemas']['ReportTableDto'];
export type ReportKind = ReportTable['kind'];
export interface ReportRange {
  from: string;
  to: string;
}

/** Tipos de informe que ofrece la API, con el texto que ve el administrador. */
export const REPORT_KINDS: {
  value: ReportKind;
  label: string;
  description: string;
}[] = [
  {
    value: 'activity',
    label: 'Actividad',
    description:
      'Por día: usuarios nuevos, publicaciones, historias, comentarios y mensajes.',
  },
  {
    value: 'moderation',
    label: 'Moderación',
    description:
      'Por motivo: reportes creados, resueltos, sancionados, descartados y pendientes.',
  },
];

const query = ({ from, to }: ReportRange) =>
  new URLSearchParams({ from, to }).toString();

export const reportsApi = {
  /** Genera el informe para verlo en pantalla (queda en la bitácora). */
  generate: (kind: ReportKind, range: ReportRange) =>
    apiRequest<ReportTable>(`/admin/reports/${kind}?${query(range)}`),
  /** Descarga el mismo informe como CSV (UTF 8 con BOM). */
  downloadCsv: (kind: ReportKind, range: ReportRange) =>
    apiRequest<Blob>(`/admin/reports/${kind}/csv?${query(range)}`, {
      as: 'blob',
    }),
};

const FILE_SLUG: Record<ReportKind, string> = {
  activity: 'actividad',
  moderation: 'moderacion',
};

/** Mismo nombre que le pone la API al archivo: cafeta-actividad-2026-09-01-2026-09-30.csv */
export function csvFileName(kind: ReportKind, { from, to }: ReportRange) {
  return `cafeta-${FILE_SLUG[kind]}-${from}-${to}.csv`;
}
