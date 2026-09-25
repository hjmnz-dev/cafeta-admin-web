import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Estado de la consola de administración (FT10 · DEF-11).
 *
 * Igual que la app móvil, todavía no hay backend: los datos viven en el cliente
 * y se persisten en localStorage. La diferencia importante con la app de
 * estudiantes es la **bitácora**: aquí toda acción relevante deja rastro
 * (HU46), incluidos los intentos rechazados por falta de permisos, porque esa
 * traza es el producto que consume HU45.
 *
 * Cuando exista el backend, los setters pasan a ser llamadas a la API y la
 * bitácora se lee del servidor manteniendo la misma forma de datos.
 */

/** Rol de la sesión. Sin autenticación real, se elige al entrar. */
export type Role = 'admin' | 'student';

export interface Session {
  role: Role;
  name: string;
  email: string;
}

export type AccountStatus = 'active' | 'inactive';
export type VerificationStatus = 'verified' | 'pending' | 'rejected';

/** Cuenta registrada en la plataforma, vista desde administración (HU47). */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  career: string;
  /** Alta de la cuenta, en epoch ms. */
  joinedAt: number;
  status: AccountStatus;
  verification: VerificationStatus;
  posts: number;
  followers: number;
}

/** Publicación, en la medida en que administración necesita moderarla (HU52). */
export interface AdminPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
  active: boolean;
}

export type ReportStatus = 'pending' | 'sanctioned' | 'dismissed';

/**
 * Denuncia levantada por un estudiante (HU55/HU56 en la app móvil) y revisada
 * aquí (HU51/HU52).
 */
export interface AdminReport {
  id: string;
  targetType: 'user' | 'post';
  targetId: string;
  reason: string;
  reportedBy: string;
  createdAt: number;
  status: ReportStatus;
  /** Quién resolvió y cuándo, una vez revisada. */
  resolvedBy?: string;
  resolvedAt?: number;
}

/** Acciones que la bitácora sabe nombrar (HU46). */
export type AuditAction =
  | 'account.deactivate'
  | 'account.reactivate'
  | 'account.verify'
  | 'account.reject_verification'
  | 'post.deactivate'
  | 'report.sanction'
  | 'report.dismiss'
  | 'report.generate'
  | 'access.denied';

/** Entrada de la bitácora de auditoría (HU45/HU46). */
export interface AuditEntry {
  id: string;
  at: number;
  /** Quién ejecutó la acción (o intentó ejecutarla). */
  actor: string;
  actorRole: Role;
  action: AuditAction;
  /** Objetivo legible: cuenta, publicación o pantalla. */
  target: string;
  detail: string;
  /** false cuando la acción fue rechazada (HU46, escenario 2). */
  succeeded: boolean;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'account.deactivate': 'Desactivar cuenta',
  'account.reactivate': 'Reactivar cuenta',
  'account.verify': 'Verificar cuenta',
  'account.reject_verification': 'Rechazar verificación',
  'post.deactivate': 'Desactivar publicación',
  'report.sanction': 'Sancionar reporte',
  'report.dismiss': 'Desestimar reporte',
  'report.generate': 'Generar reporte administrativo',
  'access.denied': 'Acceso denegado',
};

interface AdminStateValue {
  session: Session;
  /** Cambiar de sesión. Sin login real, sirve para probar los permisos. */
  signIn: (role: Role) => void;
  isAdmin: boolean;

  users: AdminUser[];
  posts: AdminPost[];
  reports: AdminReport[];
  audit: AuditEntry[];

  /** HU48 — Desactivar cuenta. Devuelve false si no había permiso o ya estaba inactiva. */
  deactivateAccount: (id: string) => boolean;
  /** HU49 — Reactivar cuenta. Devuelve false si ya estaba activa o no hay permiso. */
  reactivateAccount: (id: string) => boolean;
  /** HU50 — Aprobar o rechazar la verificación institucional. */
  verifyAccount: (id: string) => boolean;
  rejectVerification: (id: string) => boolean;
  /** HU52 — Desactivar una publicación reportada. */
  deactivatePost: (id: string) => boolean;
  /** HU51/HU52 — Resolver una denuncia: sancionar o desestimar. */
  sanctionReport: (reportId: string) => boolean;
  dismissReport: (reportId: string) => boolean;
  /** HU46 — Dejar constancia de un intento sin permisos. */
  logAccessDenied: (target: string) => void;
  /** HU44 — Registrar en bitácora la generación de un reporte administrativo. */
  logReportGenerated: (detail: string) => void;
}

const CAREERS = ['Ing. Software', 'Ing. Industrial', 'Ing. Civil', 'Medicina', 'Adm. Empresas', 'Psicología'];

const DAY = 24 * 60 * 60 * 1000;

/** Sesión por defecto: administrador, que es para quien existe esta consola. */
const DEFAULT_SESSION: Session = {
  role: 'admin',
  name: 'Hamsell Jiménez',
  email: 'hjimenez@intec.edu.do',
};

/**
 * Padrón de demostración. Se construye con fechas relativas al arranque para
 * que los indicadores del dashboard (altas por día, actividad reciente) tengan
 * sentido en cualquier momento en que se abra la consola.
 */
const sampleUsers = (): AdminUser[] => {
  const now = Date.now();
  const seed: [string, string, string, number, AccountStatus, VerificationStatus, number, number][] = [
    ['maria', 'María Rodríguez', 'mrodriguez@est.intec.edu.do', 0, 'active', 'verified', 27, 842],
    ['juan', 'Juan Pérez', 'jperez@est.intec.edu.do', 1, 'active', 'verified', 40, 512],
    ['laura', 'Laura Batista', 'lbatista@est.intec.edu.do', 2, 'active', 'pending', 63, 1204],
    ['pedro', 'Pedro Sánchez', 'psanchez@est.intec.edu.do', 3, 'active', 'pending', 15, 231],
    ['ana', 'Ana Martínez', 'amartinez@est.intec.edu.do', 4, 'inactive', 'verified', 8, 96],
    ['roberto', 'Roberto Díaz', 'rdiaz@est.intec.edu.do', 5, 'active', 'rejected', 3, 44],
    ['comite', 'Comité de Estudiantes', 'comite@intec.edu.do', 0, 'active', 'verified', 120, 3100],
    ['carlos', 'Carlos Gómez', 'cgomez@est.intec.edu.do', 2, 'active', 'verified', 12, 318],
  ];
  return seed.map(([id, name, email, careerIdx, status, verification, posts, followers], i) => ({
    id,
    name,
    email,
    career: CAREERS[careerIdx],
    joinedAt: now - (30 - i * 3) * DAY,
    status,
    verification,
    posts,
    followers,
  }));
};

const samplePosts = (): AdminPost[] => {
  const now = Date.now();
  return [
    { id: 'p2', authorId: 'juan', authorName: 'Juan Pérez', content: 'Resumen de Cálculo Diferencial para el parcial de mañana.', createdAt: now - 2 * DAY, active: true },
    { id: 'p3', authorId: 'maria', authorName: 'María Rodríguez', content: 'Libro de Anatomía Humana en PDF para quien lo necesite.', createdAt: now - 4 * DAY, active: true },
    { id: 'p7', authorId: 'roberto', authorName: 'Roberto Díaz', content: 'Vendo respuestas del examen final, escríbanme por privado.', createdAt: now - 1 * DAY, active: true },
    { id: 'p8', authorId: 'ana', authorName: 'Ana Martínez', content: 'Mensaje ofensivo contra un grupo de estudiantes.', createdAt: now - 3 * DAY, active: true },
  ];
};

const sampleReports = (): AdminReport[] => {
  const now = Date.now();
  return [
    { id: 'r1', targetType: 'post', targetId: 'p7', reason: 'Spam o publicidad', reportedBy: 'María Rodríguez', createdAt: now - 20 * 60 * 60 * 1000, status: 'pending' },
    { id: 'r2', targetType: 'post', targetId: 'p8', reason: 'Acoso o intimidación', reportedBy: 'Juan Pérez', createdAt: now - 2 * DAY, status: 'pending' },
    { id: 'r3', targetType: 'user', targetId: 'roberto', reason: 'Suplantación de identidad', reportedBy: 'Laura Batista', createdAt: now - 3 * DAY, status: 'pending' },
    { id: 'r4', targetType: 'user', targetId: 'ana', reason: 'Acoso o intimidación', reportedBy: 'Pedro Sánchez', createdAt: now - 6 * DAY, status: 'sanctioned', resolvedBy: 'Hamsell Jiménez', resolvedAt: now - 5 * DAY },
    { id: 'r5', targetType: 'post', targetId: 'p2', reason: 'Contenido inapropiado', reportedBy: 'Ana Martínez', createdAt: now - 8 * DAY, status: 'dismissed', resolvedBy: 'Hamsell Jiménez', resolvedAt: now - 7 * DAY },
  ];
};

/** Bitácora inicial: la resolución ya tomada sobre la cuenta de Ana (r4). */
const sampleAudit = (): AuditEntry[] => {
  const now = Date.now();
  return [
    {
      id: 'a1', at: now - 5 * DAY, actor: 'Hamsell Jiménez', actorRole: 'admin',
      action: 'report.sanction', target: 'Ana Martínez',
      detail: 'Reporte por acoso o intimidación resuelto con sanción.', succeeded: true,
    },
    {
      id: 'a2', at: now - 5 * DAY + 60_000, actor: 'Hamsell Jiménez', actorRole: 'admin',
      action: 'account.deactivate', target: 'Ana Martínez',
      detail: 'Cuenta desactivada tras la revisión del reporte.', succeeded: true,
    },
    {
      id: 'a3', at: now - 7 * DAY, actor: 'Hamsell Jiménez', actorRole: 'admin',
      action: 'report.dismiss', target: 'Publicación p2',
      detail: 'Reporte desestimado: el contenido no infringe las normas.', succeeded: true,
    },
  ];
};

const STORAGE_KEY = 'cafeta.admin.v1';

interface PersistedState {
  session: Session;
  users: AdminUser[];
  posts: AdminPost[];
  reports: AdminReport[];
  audit: AuditEntry[];
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        session: { ...DEFAULT_SESSION, ...parsed.session },
        users: Array.isArray(parsed.users) ? parsed.users : sampleUsers(),
        posts: Array.isArray(parsed.posts) ? parsed.posts : samplePosts(),
        reports: Array.isArray(parsed.reports) ? parsed.reports : sampleReports(),
        audit: Array.isArray(parsed.audit) ? parsed.audit : sampleAudit(),
      };
    }
  } catch {
    /* storage no disponible o corrupto: usar datos de demostración */
  }
  return {
    session: DEFAULT_SESSION,
    users: sampleUsers(),
    posts: samplePosts(),
    reports: sampleReports(),
    audit: sampleAudit(),
  };
}

let auditSeq = 0;
const nextAuditId = () => `audit-${Date.now()}-${++auditSeq}`;

const AdminStateContext = createContext<AdminStateValue | null>(null);

export function AdminStateProvider({ children }: { children: React.ReactNode }) {
  const [{ session, users, posts, reports, audit }, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ session, users, posts, reports, audit }));
    } catch {
      /* almacenamiento no disponible: el estado sigue solo en memoria */
    }
  }, [session, users, posts, reports, audit]);

  const isAdmin = session.role === 'admin';

  const signIn = (role: Role) =>
    setState((s) => ({
      ...s,
      session:
        role === 'admin'
          ? DEFAULT_SESSION
          : { role: 'student', name: 'Carlos Gómez', email: 'cgomez@est.intec.edu.do' },
    }));

  /** Añade una entrada a la bitácora. Toda acción pasa por aquí (HU46). */
  const record = (
    s: PersistedState,
    action: AuditAction,
    target: string,
    detail: string,
    succeeded = true,
  ): PersistedState => ({
    ...s,
    audit: [
      {
        id: nextAuditId(),
        at: Date.now(),
        actor: s.session.name,
        actorRole: s.session.role,
        action,
        target,
        detail,
        succeeded,
      },
      ...s.audit,
    ],
  });

  /** Estado actual como una sola pieza, para decidir y registrar sobre él. */
  const snapshot = (): PersistedState => ({ session, users, posts, reports, audit });

  /**
   * Ejecuta una acción administrativa con una sola regla: sin permisos no se
   * toca el estado, pero el intento igual queda registrado (HU46, escenario 2).
   *
   * Decide sobre el estado ya renderizado y devuelve el resultado en el acto,
   * para que quien llama pueda avisar en pantalla si la acción no procedía.
   */
  const adminAction = (
    action: AuditAction,
    target: string,
    run: (s: PersistedState) => { state: PersistedState; detail: string } | { error: string },
  ): boolean => {
    const s = snapshot();
    if (s.session.role !== 'admin') {
      setState(record(s, 'access.denied', target, `Intento de "${AUDIT_ACTION_LABELS[action]}" sin permisos administrativos.`, false));
      return false;
    }
    const result = run(s);
    if ('error' in result) {
      setState(record(s, action, target, result.error, false));
      return false;
    }
    setState(record(result.state, action, target, result.detail));
    return true;
  };

  const findUser = (s: PersistedState, id: string) => s.users.find((u) => u.id === id);

  const setUser = (s: PersistedState, id: string, patch: Partial<AdminUser>): PersistedState => ({
    ...s,
    users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
  });

  const deactivateAccount = (id: string) =>
    adminAction('account.deactivate', id, (s) => {
      const user = findUser(s, id);
      if (!user) return { error: 'La cuenta no existe.' };
      if (user.status === 'inactive') return { error: `La cuenta de ${user.name} ya estaba inactiva.` };
      return {
        state: setUser(s, id, { status: 'inactive' }),
        detail: `Cuenta de ${user.name} desactivada: se restringe su acceso y se conserva su registro.`,
      };
    });

  const reactivateAccount = (id: string) =>
    adminAction('account.reactivate', id, (s) => {
      const user = findUser(s, id);
      if (!user) return { error: 'La cuenta no existe.' };
      // HU49, escenario 2: reactivar algo ya activo no es un cambio, es un aviso.
      if (user.status === 'active') return { error: `La cuenta de ${user.name} ya se encuentra activa.` };
      return {
        state: setUser(s, id, { status: 'active' }),
        detail: `Cuenta de ${user.name} reactivada: se restaura su acceso.`,
      };
    });

  const verifyAccount = (id: string) =>
    adminAction('account.verify', id, (s) => {
      const user = findUser(s, id);
      if (!user) return { error: 'La cuenta no existe.' };
      if (user.verification === 'verified') return { error: `La cuenta de ${user.name} ya estaba verificada.` };
      return {
        state: setUser(s, id, { verification: 'verified' }),
        detail: `Cuenta de ${user.name} verificada como miembro de la universidad.`,
      };
    });

  const rejectVerification = (id: string) =>
    adminAction('account.reject_verification', id, (s) => {
      const user = findUser(s, id);
      if (!user) return { error: 'La cuenta no existe.' };
      return {
        state: setUser(s, id, { verification: 'rejected' }),
        detail: `Verificación de ${user.name} rechazada: los datos no pudieron confirmarse.`,
      };
    });

  const deactivatePost = (id: string) =>
    adminAction('post.deactivate', id, (s) => {
      const post = s.posts.find((p) => p.id === id);
      if (!post) return { error: 'La publicación no existe.' };
      if (!post.active) return { error: 'La publicación ya estaba desactivada.' };
      return {
        state: { ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, active: false } : p)) },
        detail: `Publicación de ${post.authorName} desactivada por infringir las normas.`,
      };
    });

  /** Nombre legible del objetivo de una denuncia, para la bitácora. */
  const targetName = (s: PersistedState, report: AdminReport) =>
    report.targetType === 'user'
      ? findUser(s, report.targetId)?.name ?? report.targetId
      : `Publicación ${report.targetId}`;

  const resolveReport = (
    s: PersistedState,
    reportId: string,
    status: Extract<ReportStatus, 'sanctioned' | 'dismissed'>,
  ): PersistedState => ({
    ...s,
    reports: s.reports.map((r) =>
      r.id === reportId
        ? { ...r, status, resolvedBy: s.session.name, resolvedAt: Date.now() }
        : r,
    ),
  });

  /**
   * HU51/HU52 — Sancionar. La sanción aplica la restricción que corresponde al
   * objetivo (desactivar la cuenta o la publicación) y cierra el reporte en un
   * solo paso, que es como se toma la decisión en la práctica.
   */
  const sanctionReport = (reportId: string) =>
    adminAction('report.sanction', reportId, (s) => {
      const report = s.reports.find((r) => r.id === reportId);
      if (!report) return { error: 'El reporte no existe.' };
      if (report.status !== 'pending') return { error: 'El reporte ya estaba resuelto.' };

      const name = targetName(s, report);
      const resolved = resolveReport(s, reportId, 'sanctioned');

      if (report.targetType === 'user') {
        return {
          state: setUser(resolved, report.targetId, { status: 'inactive' }),
          detail: `Reporte contra ${name} (${report.reason}) resuelto con sanción: cuenta desactivada.`,
        };
      }
      return {
        state: {
          ...resolved,
          posts: resolved.posts.map((p) => (p.id === report.targetId ? { ...p, active: false } : p)),
        },
        detail: `Reporte contra ${name} (${report.reason}) resuelto con sanción: publicación desactivada.`,
      };
    });

  const dismissReport = (reportId: string) =>
    adminAction('report.dismiss', reportId, (s) => {
      const report = s.reports.find((r) => r.id === reportId);
      if (!report) return { error: 'El reporte no existe.' };
      if (report.status !== 'pending') return { error: 'El reporte ya estaba resuelto.' };
      return {
        state: resolveReport(s, reportId, 'dismissed'),
        detail: `Reporte contra ${targetName(s, report)} desestimado: se cierra sin aplicar restricciones.`,
      };
    });

  const logAccessDenied = (target: string) =>
    setState(record(snapshot(), 'access.denied', target, 'Intento de acceso a una sección administrativa sin permisos.', false));

  const logReportGenerated = (detail: string) =>
    setState(record(snapshot(), 'report.generate', 'Reportes administrativos', detail));

  return (
    <AdminStateContext.Provider
      value={{
        session, signIn, isAdmin,
        users, posts, reports, audit,
        deactivateAccount, reactivateAccount, verifyAccount, rejectVerification,
        deactivatePost, sanctionReport, dismissReport,
        logAccessDenied, logReportGenerated,
      }}
    >
      {children}
    </AdminStateContext.Provider>
  );
}

export function useAdminState(): AdminStateValue {
  const ctx = useContext(AdminStateContext);
  if (!ctx) throw new Error('useAdminState debe usarse dentro de <AdminStateProvider>');
  return ctx;
}
