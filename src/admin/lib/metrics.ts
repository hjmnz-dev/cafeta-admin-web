import type { AdminReport, AdminUser, AuditEntry } from '../store/AdminState';
import { AUDIT_ACTION_LABELS } from '../store/AdminState';
import { formatDate, formatDateTime } from './format';

/**
 * Armado de informes (HU44).
 *
 * Vive aparte de las pantallas por dos motivos: se puede probar sin montar la
 * interfaz, y el día que exista backend estas funciones son exactamente lo que
 * se sustituye por consultas al servidor.
 */

export type ReportKind = 'signups' | 'reports' | 'moderation';

export const REPORT_KINDS: {
  value: ReportKind;
  label: string;
  description: string;
}[] = [
  {
    value: 'signups',
    label: 'Altas de cuentas',
    description:
      'Cuentas registradas en el rango, con su estado y verificación.',
  },
  {
    value: 'reports',
    label: 'Denuncias recibidas',
    description: 'Reportes de usuarios y publicaciones, con su resolución.',
  },
  {
    value: 'moderation',
    label: 'Acciones administrativas',
    description: 'Lo ejecutado por administración según la bitácora.',
  },
];

export interface GeneratedReport {
  kind: ReportKind;
  title: string;
  from: number;
  to: number;
  columns: string[];
  rows: string[][];
}

interface ReportSource {
  users: AdminUser[];
  reports: AdminReport[];
  audit: AuditEntry[];
}

const inRange = (at: number, from: number, to: number) =>
  at >= from && at <= to;

/**
 * Arma un reporte administrativo (HU44). Un rango sin actividad no es un error:
 * devuelve el reporte con cero filas y la pantalla lo dice con todas sus letras.
 */
export function buildReport(
  source: ReportSource,
  { kind, from, to }: { kind: ReportKind; from: number; to: number },
): GeneratedReport {
  const title = REPORT_KINDS.find((k) => k.value === kind)!.label;
  const base = { kind, title, from, to };

  if (kind === 'signups') {
    return {
      ...base,
      columns: [
        'Cuenta',
        'Correo',
        'Carrera',
        'Alta',
        'Estado',
        'Verificación',
      ],
      rows: source.users
        .filter((u) => inRange(u.joinedAt, from, to))
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((u) => [
          u.name,
          u.email,
          u.career,
          formatDate(u.joinedAt),
          u.status === 'active' ? 'Activa' : 'Inactiva',
          u.verification === 'verified'
            ? 'Verificada'
            : u.verification === 'pending'
              ? 'Pendiente'
              : 'Rechazada',
        ]),
    };
  }

  if (kind === 'reports') {
    const statusLabel: Record<AdminReport['status'], string> = {
      pending: 'Pendiente',
      sanctioned: 'Sancionado',
      dismissed: 'Desestimado',
    };
    return {
      ...base,
      columns: [
        'Objetivo',
        'Tipo',
        'Motivo',
        'Reportado por',
        'Fecha',
        'Estado',
      ],
      rows: source.reports
        .filter((r) => inRange(r.createdAt, from, to))
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((r) => [
          r.targetType === 'user'
            ? (source.users.find((u) => u.id === r.targetId)?.name ??
              r.targetId)
            : `Publicación ${r.targetId}`,
          r.targetType === 'user' ? 'Usuario' : 'Publicación',
          r.reason,
          r.reportedBy,
          formatDate(r.createdAt),
          statusLabel[r.status],
        ]),
    };
  }

  return {
    ...base,
    columns: ['Fecha', 'Responsable', 'Acción', 'Objetivo', 'Resultado'],
    rows: source.audit
      .filter((e) => inRange(e.at, from, to))
      .sort((a, b) => a.at - b.at)
      .map((e) => [
        formatDateTime(e.at),
        e.actor,
        AUDIT_ACTION_LABELS[e.action],
        e.target,
        e.succeeded ? 'Ejecutada' : 'Rechazada',
      ]),
  };
}

/** Serializa el reporte a CSV para descargarlo (HU44). */
export function toCsv(report: GeneratedReport): string {
  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  return [report.columns, ...report.rows]
    .map((row) => row.map(escape).join(','))
    .join('\r\n');
}
