import type { AdminPost, AdminReport, AdminUser, AuditEntry } from '../store/AdminState';
import { AUDIT_ACTION_LABELS } from '../store/AdminState';
import { formatDate, formatDateTime } from './format';

/**
 * Cálculo de indicadores y armado de reportes (HU43/HU44).
 *
 * Vive aparte de las pantallas por dos motivos: se puede probar sin montar la
 * interfaz, y el día que exista backend estas funciones son exactamente lo que
 * se sustituye por consultas al servidor.
 */

const DAY = 24 * 60 * 60 * 1000;

export interface UsageIndicators {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingVerification: number;
  pendingReports: number;
  activePosts: number;
  newUsers7d: number;
}

/** Indicadores generales del dashboard (HU43). */
export function usageIndicators(
  users: AdminUser[],
  posts: AdminPost[],
  reports: AdminReport[],
  now: number = Date.now(),
): UsageIndicators {
  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === 'active').length,
    inactiveUsers: users.filter((u) => u.status === 'inactive').length,
    pendingVerification: users.filter((u) => u.verification === 'pending').length,
    pendingReports: reports.filter((r) => r.status === 'pending').length,
    activePosts: posts.filter((p) => p.active).length,
    newUsers7d: users.filter((u) => now - u.joinedAt <= 7 * DAY).length,
  };
}

export interface DayCount {
  /** Inicio del día, en epoch ms. */
  day: number;
  count: number;
}

/**
 * Altas de cuentas por día para los últimos `days` días, incluido hoy. Devuelve
 * un punto por día aunque no haya altas: un hueco en la serie se leería como
 * "no hay dato" en vez de "no hubo altas".
 */
export function signupsByDay(users: AdminUser[], days = 14, now: number = Date.now()): DayCount[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, i) => {
    const day = start.getTime() - (days - 1 - i) * DAY;
    const count = users.filter((u) => u.joinedAt >= day && u.joinedAt < day + DAY).length;
    return { day, count };
  });
}

/** Distribución de cuentas por carrera, de mayor a menor. */
export function usersByCareer(users: AdminUser[]): { career: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const u of users) counts.set(u.career, (counts.get(u.career) ?? 0) + 1);
  return [...counts.entries()]
    .map(([career, count]) => ({ career, count }))
    .sort((a, b) => b.count - a.count || a.career.localeCompare(b.career));
}

export type ReportKind = 'signups' | 'reports' | 'moderation';

export const REPORT_KINDS: { value: ReportKind; label: string; description: string }[] = [
  { value: 'signups', label: 'Altas de cuentas', description: 'Cuentas registradas en el rango, con su estado y verificación.' },
  { value: 'reports', label: 'Denuncias recibidas', description: 'Reportes de usuarios y publicaciones, con su resolución.' },
  { value: 'moderation', label: 'Acciones administrativas', description: 'Lo ejecutado por administración según la bitácora.' },
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

const inRange = (at: number, from: number, to: number) => at >= from && at <= to;

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
      columns: ['Cuenta', 'Correo', 'Carrera', 'Alta', 'Estado', 'Verificación'],
      rows: source.users
        .filter((u) => inRange(u.joinedAt, from, to))
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((u) => [
          u.name,
          u.email,
          u.career,
          formatDate(u.joinedAt),
          u.status === 'active' ? 'Activa' : 'Inactiva',
          u.verification === 'verified' ? 'Verificada' : u.verification === 'pending' ? 'Pendiente' : 'Rechazada',
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
      columns: ['Objetivo', 'Tipo', 'Motivo', 'Reportado por', 'Fecha', 'Estado'],
      rows: source.reports
        .filter((r) => inRange(r.createdAt, from, to))
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((r) => [
          r.targetType === 'user'
            ? source.users.find((u) => u.id === r.targetId)?.name ?? r.targetId
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
  return [report.columns, ...report.rows].map((row) => row.map(escape).join(',')).join('\r\n');
}
